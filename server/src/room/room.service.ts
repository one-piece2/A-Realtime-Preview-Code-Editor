import { Injectable,NotFoundException,ForbiddenException,ConflictException ,BadRequestException} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './entities/room.entitiey';
import { RoomMember } from './entities/room-member.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomRole } from './entities/room-member.entity';
import { UpdateRoomDto,} from './dto/update-room.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
//生成短小的id
import { nanoid } from 'nanoid';
@Injectable()
export class RoomService {
    constructor(
        @InjectRepository(Room)
        private readonly roomRepository: Repository<Room>,
        @InjectRepository(RoomMember)
        private readonly memberRepository: Repository<RoomMember>,
    ) {}

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

    // 创建者自动成为 owner 成员。   在room-member表中生成一条记录
    await this.memberRepository.save({
      roomId: savedRoom.id,
      userId,
      role: 'owner' as RoomRole,
    });

    return savedRoom;
  }
//-----------------------------------房间----------------------------------------
// 获取房间信息 (通过 roomId)
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

  
   //获取房间详情 (包含成员列表)
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

    // 获取所有成员--即获取所有对应roomID的userId
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


  
//   更新房间信息 (仅 owner可以用)
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

// 删除房间 (仅 owner)
  async deleteRoom(roomId: string, userId: string): Promise<void> {
    const room = await this.getRoomByRoomId(roomId);

    // 检查是否是 owner
    await this.requireRole(room.id, userId, ['owner']);

    // 软删除: 设置状态为 deleted
    room.status = 'deleted';
    await this.roomRepository.save(room);
  }

 
 //获取用户的所有房间
  async getUserRooms(userId: string): Promise<{
    owned: Room[];
    joined: Room[];
  }> {
    // 用户创建的房间 通过外键ownerId查询
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

  //----------------------------------------成员-----------------------------------

   
 //加入房间
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

 //邀请用户加入房间 (owner/editor 可邀请)
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

 //离开房间
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

  
 //更新成员角色 (仅 owner)
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

  
   //移除成员 (仅 owner)
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

//转让房间所有权
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
    if (!currentOwnerMember) {
      throw new NotFoundException('当前用户不是房间成员');
    }

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
//----------------辅助方法-----------------------

//检查用户是否可以编辑
  async canEdit(roomId: string, userId: string): Promise<boolean> {
    //检查用户是否是成员
    const member = await this.getMemberByRoomId(roomId, userId);
    if (!member) return false;
    return member.role === 'owner' || member.role === 'editor';
  }

//生成房间 ID
  private generateRoomId(): string {
    // 格式: xxx-xxx-xxx (9个字符)
    const id = nanoid(9);
    return `${id.slice(0, 3)}-${id.slice(3, 6)}-${id.slice(6, 9)}`.toLowerCase();
  }
    
  // 获取成员信息(该user在某个房间里面 作为member的信息) === （该成员在某个房间里面的成员记录）
  async getMember(roomDbId: string, userId: string): Promise<RoomMember | null> {
    return this.memberRepository.findOne({
      where: { roomId: roomDbId, userId },
    });
  }
  
  // 检查用户角色 (抛出异常) 用户角色必须在allowedRoles里面才行 这里我们直接传['owner']
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

  
   //通过 roomId (用户可见的)即通过UI上面的roomID查询  获取成员
  async getMemberByRoomId(roomId: string, userId: string): Promise<RoomMember | null> {

    const room = await this.roomRepository.findOne({
      where: { roomId, status: 'active' },
    });
    if (!room) return null;
    //这个是通过房间的id查找的 用户看不见这个 专门服务于后端逻辑的
    return this.getMember(room.id, userId);
  }
}

