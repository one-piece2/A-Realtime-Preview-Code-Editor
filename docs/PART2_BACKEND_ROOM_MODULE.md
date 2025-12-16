# 协同编辑权限体系技术方案 - Part 2: 后端 Room 模块

## 目录
- [1. 模块结构](#1-模块结构)
- [2. DTO 定义](#2-dto-定义)
- [3. Room Service](#3-room-service)
- [4. Room Controller](#4-room-controller)
- [5. Room Module](#5-room-module)
- [6. API 文档](#6-api-文档)

---

## 1. 模块结构

```
server/src/room/
├── entities/
│   ├── room.entity.ts
│   └── room-member.entity.ts
├── dto/
│   ├── create-room.dto.ts
│   ├── update-room.dto.ts
│   ├── join-room.dto.ts
│   └── update-member.dto.ts
├── room.controller.ts
├── room.service.ts
└── room.module.ts
```

---

## 2. DTO 定义

### 2.1 create-room.dto.ts

```typescript
// server/src/room/dto/create-room.dto.ts
import { IsString, IsBoolean, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsString()
  @IsOptional()
  defaultRole?: 'editor' | 'viewer';
}
```

### 2.2 update-room.dto.ts

```typescript
// server/src/room/dto/update-room.dto.ts
import { IsString, IsBoolean, IsOptional, MaxLength } from 'class-validator';

export class UpdateRoomDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsString()
  @IsOptional()
  defaultRole?: 'editor' | 'viewer';
}
```

### 2.3 join-room.dto.ts

```typescript
// server/src/room/dto/join-room.dto.ts
import { IsString, IsOptional } from 'class-validator';

export class JoinRoomDto {
  @IsString()
  @IsOptional()
  inviteCode?: string; // 可选的邀请码
}
```

### 2.4 update-member.dto.ts

```typescript
// server/src/room/dto/update-member.dto.ts
import { IsEnum } from 'class-validator';

export class UpdateMemberDto {
  @IsEnum(['editor', 'viewer'])
  role: 'editor' | 'viewer'; // owner 不能通过此接口设置
}
```

---

## 3. Room Service

**文件路径**: `server/src/room/room.service.ts`

```typescript
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './entities/room.entity';
import { RoomMember, RoomRole } from './entities/room-member.entity';
import { User } from '../user/entities/user.entitiey';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { nanoid } from 'nanoid'; // 需要安装: npm install nanoid

@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(RoomMember)
    private readonly memberRepository: Repository<RoomMember>,
  ) {}

  // ==================== 房间操作 ====================

  /**
   * 创建房间
   */
  async createRoom(userId: string, dto: CreateRoomDto): Promise<Room> {
    // 生成唯一的房间 ID (如: abc-123-xyz)
    const roomId = this.generateRoomId();

    // 创建房间
    const room = this.roomRepository.create({
      roomId,
      name: dto.name,
      description: dto.description,
      ownerId: userId,
      isPublic: dto.isPublic ?? false,
      defaultRole: dto.defaultRole ?? 'viewer',
    });

    const savedRoom = await this.roomRepository.save(room);

    // 创建者自动成为 owner 成员
    await this.memberRepository.save({
      roomId: savedRoom.id,
      userId,
      role: 'owner' as RoomRole,
    });

    return savedRoom;
  }

  /**
   * 获取房间信息 (通过 roomId)
   */
  async getRoomByRoomId(roomId: string): Promise<Room> {
    const room = await this.roomRepository.findOne({
      where: { roomId, status: 'active' },
      relations: ['owner'],
    });

    if (!room) {
      throw new NotFoundException('房间不存在');
    }

    return room;
  }

  /**
   * 获取房间详情 (包含成员列表)
   */
  async getRoomWithMembers(roomId: string, userId: string): Promise<{
    room: Room;
    members: RoomMember[];
    myRole: RoomRole | null;
  }> {
    const room = await this.getRoomByRoomId(roomId);

    // 检查用户是否是成员
    const myMember = await this.getMember(room.id, userId);
    
    if (!myMember && !room.isPublic) {
      throw new ForbiddenException('您不是该房间成员');
    }

    // 获取所有成员
    const members = await this.memberRepository.find({
      where: { roomId: room.id },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });

    return {
      room,
      members,
      myRole: myMember?.role ?? null,
    };
  }

  /**
   * 更新房间信息 (仅 owner)
   */
  async updateRoom(roomId: string, userId: string, dto: UpdateRoomDto): Promise<Room> {
    const room = await this.getRoomByRoomId(roomId);

    // 检查是否是 owner
    await this.requireRole(room.id, userId, ['owner']);

    // 更新字段
    if (dto.name !== undefined) room.name = dto.name;
    if (dto.description !== undefined) room.description = dto.description;
    if (dto.isPublic !== undefined) room.isPublic = dto.isPublic;
    if (dto.defaultRole !== undefined) room.defaultRole = dto.defaultRole;

    return this.roomRepository.save(room);
  }

  /**
   * 删除房间 (仅 owner)
   */
  async deleteRoom(roomId: string, userId: string): Promise<void> {
    const room = await this.getRoomByRoomId(roomId);

    // 检查是否是 owner
    await this.requireRole(room.id, userId, ['owner']);

    // 软删除: 设置状态为 deleted
    room.status = 'deleted';
    await this.roomRepository.save(room);
  }

  /**
   * 获取用户的所有房间
   */
  async getUserRooms(userId: string): Promise<{
    owned: Room[];
    joined: Room[];
  }> {
    // 用户创建的房间
    const owned = await this.roomRepository.find({
      where: { ownerId: userId, status: 'active' },
      order: { createdAt: 'DESC' },
    });

    // 用户加入的房间 (不包括自己创建的)
    const memberships = await this.memberRepository.find({
      where: { userId },
      relations: ['room'],
    });

    const joined = memberships
      .filter((m) => m.room.ownerId !== userId && m.room.status === 'active')
      .map((m) => m.room);

    return { owned, joined };
  }

  // ==================== 成员操作 ====================

  /**
   * 加入房间
   */
  async joinRoom(roomId: string, userId: string): Promise<RoomMember> {
    const room = await this.getRoomByRoomId(roomId);

    // 检查是否已是成员
    const existingMember = await this.getMember(room.id, userId);
    if (existingMember) {
      throw new ConflictException('您已是该房间成员');
    }

    // 检查房间是否公开 (私有房间需要邀请)
    if (!room.isPublic) {
      throw new ForbiddenException('该房间为私有房间，需要邀请才能加入');
    }

    // 检查成员数限制
    if (room.maxMembers > 0) {
      const count = await this.memberRepository.count({ where: { roomId: room.id } });
      if (count >= room.maxMembers) {
        throw new ForbiddenException('房间成员已满');
      }
    }

    // 创建成员记录
    const member = this.memberRepository.create({
      roomId: room.id,
      userId,
      role: room.defaultRole as RoomRole,
    });

    return this.memberRepository.save(member);
  }

  /**
   * 邀请用户加入房间 (owner/editor 可邀请)
   */
  async inviteMember(
    roomId: string, 
    inviterId: string, 
    inviteeId: string,
    role: 'editor' | 'viewer' = 'viewer'
  ): Promise<RoomMember> {
    const room = await this.getRoomByRoomId(roomId);

    // 检查邀请者权限
    await this.requireRole(room.id, inviterId, ['owner', 'editor']);

    // 检查被邀请者是否已是成员
    const existingMember = await this.getMember(room.id, inviteeId);
    if (existingMember) {
      throw new ConflictException('该用户已是房间成员');
    }

    // 创建成员记录
    const member = this.memberRepository.create({
      roomId: room.id,
      userId: inviteeId,
      role: role as RoomRole,
      invitedBy: inviterId,
    });

    return this.memberRepository.save(member);
  }

  /**
   * 离开房间
   */
  async leaveRoom(roomId: string, userId: string): Promise<void> {
    const room = await this.getRoomByRoomId(roomId);
    const member = await this.getMember(room.id, userId);

    if (!member) {
      throw new NotFoundException('您不是该房间成员');
    }

    // owner 不能直接离开，必须先转让房间
    if (member.role === 'owner') {
      throw new ForbiddenException('房主不能离开房间，请先转让房间或删除房间');
    }

    await this.memberRepository.remove(member);
  }

  /**
   * 更新成员角色 (仅 owner)
   */
  async updateMemberRole(
    roomId: string,
    operatorId: string,
    targetUserId: string,
    dto: UpdateMemberDto,
  ): Promise<RoomMember> {
    const room = await this.getRoomByRoomId(roomId);

    // 检查操作者是否是 owner
    await this.requireRole(room.id, operatorId, ['owner']);

    // 不能修改自己
    if (operatorId === targetUserId) {
      throw new BadRequestException('不能修改自己的角色');
    }

    // 获取目标成员
    const member = await this.getMember(room.id, targetUserId);
    if (!member) {
      throw new NotFoundException('目标用户不是房间成员');
    }

    // 不能修改 owner (如果目标也是 owner)
    if (member.role === 'owner') {
      throw new ForbiddenException('不能修改房主的角色');
    }

    member.role = dto.role as RoomRole;
    return this.memberRepository.save(member);
  }

  /**
   * 移除成员 (仅 owner)
   */
  async removeMember(roomId: string, operatorId: string, targetUserId: string): Promise<void> {
    const room = await this.getRoomByRoomId(roomId);

    // 检查操作者是否是 owner
    await this.requireRole(room.id, operatorId, ['owner']);

    // 不能移除自己
    if (operatorId === targetUserId) {
      throw new BadRequestException('不能移除自己');
    }

    const member = await this.getMember(room.id, targetUserId);
    if (!member) {
      throw new NotFoundException('目标用户不是房间成员');
    }

    await this.memberRepository.remove(member);
  }

  /**
   * 转让房间所有权
   */
  async transferOwnership(
    roomId: string,
    currentOwnerId: string,
    newOwnerId: string,
  ): Promise<void> {
    const room = await this.getRoomByRoomId(roomId);

    // 检查当前用户是否是 owner
    await this.requireRole(room.id, currentOwnerId, ['owner']);

    // 获取新 owner 的成员记录
    const newOwnerMember = await this.getMember(room.id, newOwnerId);
    if (!newOwnerMember) {
      throw new NotFoundException('目标用户不是房间成员');
    }

    // 获取当前 owner 的成员记录
    const currentOwnerMember = await this.getMember(room.id, currentOwnerId);

    // 更新角色
    newOwnerMember.role = 'owner';
    currentOwnerMember.role = 'editor'; // 原 owner 变为 editor

    // 更新房间的 ownerId
    room.ownerId = newOwnerId;

    await Promise.all([
      this.memberRepository.save(newOwnerMember),
      this.memberRepository.save(currentOwnerMember),
      this.roomRepository.save(room),
    ]);
  }

  // ==================== 辅助方法 ====================

  /**
   * 获取成员信息
   */
  async getMember(roomDbId: string, userId: string): Promise<RoomMember | null> {
    return this.memberRepository.findOne({
      where: { roomId: roomDbId, userId },
    });
  }

  /**
   * 通过 roomId (用户可见的) 获取成员
   */
  async getMemberByRoomId(roomId: string, userId: string): Promise<RoomMember | null> {
    const room = await this.roomRepository.findOne({
      where: { roomId, status: 'active' },
    });
    if (!room) return null;
    return this.getMember(room.id, userId);
  }

  /**
   * 检查用户角色 (抛出异常)
   */
  async requireRole(roomDbId: string, userId: string, allowedRoles: RoomRole[]): Promise<RoomMember> {
    const member = await this.getMember(roomDbId, userId);

    if (!member) {
      throw new ForbiddenException('您不是该房间成员');
    }

    if (!allowedRoles.includes(member.role)) {
      throw new ForbiddenException('权限不足');
    }

    return member;
  }

  /**
   * 检查用户是否可以编辑
   */
  async canEdit(roomId: string, userId: string): Promise<boolean> {
    const member = await this.getMemberByRoomId(roomId, userId);
    if (!member) return false;
    return member.role === 'owner' || member.role === 'editor';
  }

  /**
   * 生成房间 ID
   */
  private generateRoomId(): string {
    // 格式: xxx-xxx-xxx (9个字符)
    const id = nanoid(9);
    return `${id.slice(0, 3)}-${id.slice(3, 6)}-${id.slice(6, 9)}`.toLowerCase();
  }
}
```

---

## 4. Room Controller

**文件路径**: `server/src/room/room.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entitiey';

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  // ==================== 房间操作 ====================

  /**
   * 创建房间
   * POST /rooms
   */
  @Post()
  async createRoom(@CurrentUser() user: User, @Body() dto: CreateRoomDto) {
    const room = await this.roomService.createRoom(user.id, dto);
    return {
      success: true,
      data: room,
      message: '房间创建成功',
    };
  }

  /**
   * 获取用户的所有房间
   * GET /rooms
   */
  @Get()
  async getUserRooms(@CurrentUser() user: User) {
    const rooms = await this.roomService.getUserRooms(user.id);
    return {
      success: true,
      data: rooms,
    };
  }

  /**
   * 获取房间详情
   * GET /rooms/:roomId
   */
  @Get(':roomId')
  async getRoom(@CurrentUser() user: User, @Param('roomId') roomId: string) {
    const result = await this.roomService.getRoomWithMembers(roomId, user.id);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 更新房间信息
   * PATCH /rooms/:roomId
   */
  @Patch(':roomId')
  async updateRoom(
    @CurrentUser() user: User,
    @Param('roomId') roomId: string,
    @Body() dto: UpdateRoomDto,
  ) {
    const room = await this.roomService.updateRoom(roomId, user.id, dto);
    return {
      success: true,
      data: room,
      message: '房间更新成功',
    };
  }

  /**
   * 删除房间
   * DELETE /rooms/:roomId
   */
  @Delete(':roomId')
  @HttpCode(HttpStatus.OK)
  async deleteRoom(@CurrentUser() user: User, @Param('roomId') roomId: string) {
    await this.roomService.deleteRoom(roomId, user.id);
    return {
      success: true,
      message: '房间已删除',
    };
  }

  // ==================== 成员操作 ====================

  /**
   * 加入房间
   * POST /rooms/:roomId/join
   */
  @Post(':roomId/join')
  async joinRoom(@CurrentUser() user: User, @Param('roomId') roomId: string) {
    const member = await this.roomService.joinRoom(roomId, user.id);
    return {
      success: true,
      data: member,
      message: '成功加入房间',
    };
  }

  /**
   * 离开房间
   * POST /rooms/:roomId/leave
   */
  @Post(':roomId/leave')
  @HttpCode(HttpStatus.OK)
  async leaveRoom(@CurrentUser() user: User, @Param('roomId') roomId: string) {
    await this.roomService.leaveRoom(roomId, user.id);
    return {
      success: true,
      message: '已离开房间',
    };
  }

  /**
   * 获取房间成员列表
   * GET /rooms/:roomId/members
   */
  @Get(':roomId/members')
  async getMembers(@CurrentUser() user: User, @Param('roomId') roomId: string) {
    const result = await this.roomService.getRoomWithMembers(roomId, user.id);
    return {
      success: true,
      data: result.members,
    };
  }

  /**
   * 更新成员角色
   * PATCH /rooms/:roomId/members/:userId
   */
  @Patch(':roomId/members/:userId')
  async updateMemberRole(
    @CurrentUser() user: User,
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    const member = await this.roomService.updateMemberRole(roomId, user.id, userId, dto);
    return {
      success: true,
      data: member,
      message: '成员角色已更新',
    };
  }

  /**
   * 移除成员
   * DELETE /rooms/:roomId/members/:userId
   */
  @Delete(':roomId/members/:userId')
  @HttpCode(HttpStatus.OK)
  async removeMember(
    @CurrentUser() user: User,
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
  ) {
    await this.roomService.removeMember(roomId, user.id, userId);
    return {
      success: true,
      message: '成员已移除',
    };
  }

  /**
   * 转让房间所有权
   * POST /rooms/:roomId/transfer/:userId
   */
  @Post(':roomId/transfer/:userId')
  @HttpCode(HttpStatus.OK)
  async transferOwnership(
    @CurrentUser() user: User,
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
  ) {
    await this.roomService.transferOwnership(roomId, user.id, userId);
    return {
      success: true,
      message: '房间所有权已转让',
    };
  }
}
```

---

## 5. Room Module

**文件路径**: `server/src/room/room.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from './entities/room.entity';
import { RoomMember } from './entities/room-member.entity';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';

@Module({
  imports: [TypeOrmModule.forFeature([Room, RoomMember])],
  controllers: [RoomController],
  providers: [RoomService],
  exports: [RoomService], // 导出供 ChatGateway 使用
})
export class RoomModule {}
```

**更新 app.module.ts**:

```typescript
// server/src/app.module.ts
import { RoomModule } from './room/room.module';
// ... 其他 imports

@Module({
  imports: [
    // ... 其他模块
    RoomModule, // 添加 RoomModule
  ],
  // ...
})
export class AppModule {}
```

---

## 6. API 文档

### 6.1 房间 API

| 端点 | 方法 | 说明 | 权限 |
|------|------|------|------|
| `/rooms` | POST | 创建房间 | 登录用户 |
| `/rooms` | GET | 获取我的房间列表 | 登录用户 |
| `/rooms/:roomId` | GET | 获取房间详情 | 成员 |
| `/rooms/:roomId` | PATCH | 更新房间信息 | owner |
| `/rooms/:roomId` | DELETE | 删除房间 | owner |

### 6.2 成员 API

| 端点 | 方法 | 说明 | 权限 |
|------|------|------|------|
| `/rooms/:roomId/join` | POST | 加入公开房间 | 登录用户 |
| `/rooms/:roomId/leave` | POST | 离开房间 | 成员(非owner) |
| `/rooms/:roomId/members` | GET | 获取成员列表 | 成员 |
| `/rooms/:roomId/members/:userId` | PATCH | 修改成员角色 | owner |
| `/rooms/:roomId/members/:userId` | DELETE | 移除成员 | owner |
| `/rooms/:roomId/transfer/:userId` | POST | 转让所有权 | owner |

### 6.3 请求/响应示例

**创建房间**:
```json
// POST /rooms
// Request
{
  "name": "My Project",
  "description": "协同编辑项目",
  "isPublic": false,
  "defaultRole": "editor"
}

// Response
{
  "success": true,
  "data": {
    "id": "uuid...",
    "roomId": "abc-123-xyz",
    "name": "My Project",
    "ownerId": "user-uuid...",
    "isPublic": false,
    "createdAt": "2024-12-16T12:00:00Z"
  },
  "message": "房间创建成功"
}
```

**获取房间详情**:
```json
// GET /rooms/abc-123-xyz
// Response
{
  "success": true,
  "data": {
    "room": { ... },
    "members": [
      {
        "id": "member-uuid",
        "userId": "user-uuid",
        "role": "owner",
        "user": {
          "id": "user-uuid",
          "username": "张三",
          "githubAvatar": "https://..."
        }
      }
    ],
    "myRole": "owner"
  }
}
```

---

## 下一步

请继续阅读 **Part 3: WebSocket 鉴权改造** (`PART3_WEBSOCKET_AUTH.md`)
