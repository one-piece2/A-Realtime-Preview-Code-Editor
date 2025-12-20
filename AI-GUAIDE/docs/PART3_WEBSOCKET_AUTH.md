# 协同编辑权限体系技术方案 - Part 3: WebSocket 鉴权改造

## 目录
- [1. 改造概述](#1-改造概述)
- [2. 新增 Actions](#2-新增-actions)
- [3. ChatGateway 改造](#3-chatgateway-改造)
- [4. 权限验证流程](#4-权限验证流程)
- [5. 错误处理](#5-错误处理)

---

## 1. 改造概述

### 1.1 当前问题

```typescript
// 当前 chat.gateway.ts 的问题:
handleConnection(client: Socket) {
  // ❌ 没有 JWT 验证，任何人都能连接
}

@SubscribeMessage(ACTIONS.JOIN)
handleJoin(client: Socket, payload: JoinPayload) {
  // ❌ 只传 username，无身份验证
  // ❌ 没有检查用户是否是房间成员
}

@SubscribeMessage(ACTIONS.Y_UPDATE)
handleYUpdate(client: Socket, payload: YUpdatePayload) {
  // ❌ 没有检查用户是否有编辑权限
}
```

### 1.2 改造目标

| 阶段 | 验证内容 | 说明 |
|------|----------|------|
| 连接时 | JWT 验证 | 确保用户已登录 |
| 加入房间时 | 成员验证 | 确保用户是房间成员 |
| 发送更新时 | 权限验证 | 确保用户有编辑权限 |
| 角色变更时 | 实时通知 | 通知受影响用户 |

---

## 2. 新增 Actions

**文件路径**: `server/src/action.ts` (同步更新 `client/src/action.ts`)

```typescript
export const ACTIONS = {
  // 现有 actions
  JOIN: 'join',
  JOINED: 'joined',
  DISCONNECTED: 'disconnected',
  CODE_CHANGE: 'code-change',
  SYNC_CODE: 'sync-code',
  LEAVE: 'leave',
  Y_SYNC: 'y-sync',
  Y_UPDATE: 'y-update',
  Y_AWARENESS: 'y-awareness',

  // 新增: 权限相关 actions
  ERROR: 'error',                    // 错误消息
  ROLE_CHANGED: 'role-changed',      // 角色变更通知
  MEMBER_JOINED: 'member-joined',    // 新成员加入通知
  MEMBER_LEFT: 'member-left',        // 成员离开通知
  MEMBER_REMOVED: 'member-removed',  // 成员被移除通知
  ROOM_UPDATED: 'room-updated',      // 房间信息更新通知
};
```

---

## 3. ChatGateway 改造

### 3.1 完整改造后的 ChatGateway

**文件路径**: `server/src/chat/chat.gateway.ts`

```typescript
import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ACTIONS } from 'src/action';
import { Adapter } from 'socket.io-adapter';
import { YjsDocumentService } from './yjs-document.service';
import { RoomService } from '../room/room.service';
import { AuthService, JwtPayload } from '../auth/auth.service';
import { RoomRole } from '../room/entities/room-member.entity';

// ==================== 接口定义 ====================

interface AuthenticatedSocket extends Socket {
  data: {
    user: {
      id: string;
      email: string;
      username: string;
      githubAvatar?: string;
    };
    roomId?: string;      // 当前加入的房间 ID
    role?: RoomRole;      // 当前用户在房间的角色
  };
}

interface JoinPayload {
  roomId: string;         // 改为只需要 roomId，用户信息从 JWT 获取
  initialCode?: string;
}

interface YSyncPayload {
  roomId: string;
  stateVector?: ArrayBuffer | Uint8Array | number[];
}

interface YUpdatePayload {
  roomId: string;
  update: ArrayBuffer | Uint8Array | number[];
}

interface YAwarenessPayload {
  roomId: string;
  update: ArrayBuffer | Uint8Array | number[];
}

// ==================== Gateway 实现 ====================

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').map((url) => url.trim())
      : 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST'],
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  // socketId -> userId 映射
  private userSocketMap: Record<string, string> = {};
  // userId -> socketId 映射 (反向查找)
  private socketUserMap: Record<string, string> = {};

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly yDocService: YjsDocumentService,
    private readonly roomService: RoomService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  // ==================== 连接生命周期 ====================

  /**
   * 处理 WebSocket 连接 - JWT 验证
   */
  async handleConnection(client: AuthenticatedSocket) {
    try {
      // 1. 从 handshake 中获取 token
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        this.emitError(client, 'UNAUTHORIZED', '未提供认证令牌');
        client.disconnect();
        return;
      }

      // 2. 验证 JWT
      let payload: JwtPayload;
      try {
        payload = this.jwtService.verify(token, {
          secret: this.configService.get<string>('JWT_SECRET'),
        });
      } catch (error) {
        this.emitError(client, 'TOKEN_INVALID', '认证令牌无效或已过期');
        client.disconnect();
        return;
      }

      // 3. 验证用户是否存在
      const user = await this.authService.validateUser(payload);
      if (!user) {
        this.emitError(client, 'USER_NOT_FOUND', '用户不存在');
        client.disconnect();
        return;
      }

      // 4. 将用户信息附加到 socket
      client.data.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        githubAvatar: user.githubAvatar,
      };

      // 5. 检查是否有旧连接需要踢掉 (同一用户只能有一个连接)
      const oldSocketId = this.socketUserMap[user.id];
      if (oldSocketId && oldSocketId !== client.id) {
        const oldSocket = this.server.sockets.sockets.get(oldSocketId);
        if (oldSocket) {
          this.emitError(oldSocket as AuthenticatedSocket, 'DUPLICATE_LOGIN', '您已在其他地方登录');
          oldSocket.disconnect(true);
        }
        delete this.userSocketMap[oldSocketId];
      }

      // 6. 注册新连接
      this.userSocketMap[client.id] = user.id;
      this.socketUserMap[user.id] = client.id;

      console.log(`[ChatGateway] 用户 ${user.username} (${user.id}) 已连接`);
    } catch (error) {
      console.error('[ChatGateway] 连接处理错误:', error);
      this.emitError(client, 'CONNECTION_ERROR', '连接失败');
      client.disconnect();
    }
  }

  /**
   * 处理断开连接
   */
  handleDisconnect(client: AuthenticatedSocket) {
    const userId = this.userSocketMap[client.id];
    const roomId = client.data.roomId;

    if (roomId) {
      // 通知房间内其他成员
      client.to(roomId).emit(ACTIONS.MEMBER_LEFT, {
        userId,
        username: client.data.user?.username,
        socketId: client.id,
      });

      // 离开房间
      client.leave(roomId);
      this.yDocService.unregisterClient(roomId, client.id);
    }

    // 清理映射
    if (userId) {
      delete this.socketUserMap[userId];
    }
    delete this.userSocketMap[client.id];

    console.log(`[ChatGateway] 用户断开连接: ${client.id}`);
  }

  // ==================== 房间操作 ====================

  /**
   * 加入房间 - 验证成员身份和权限
   */
  @SubscribeMessage(ACTIONS.JOIN)
  async handleJoin(client: AuthenticatedSocket, payload: JoinPayload) {
    const user = client.data.user;
    const { roomId, initialCode } = payload;

    if (!user) {
      this.emitError(client, 'UNAUTHORIZED', '请先登录');
      return;
    }

    try {
      // 1. 检查用户是否是房间成员
      const member = await this.roomService.getMemberByRoomId(roomId, user.id);
      if (!member) {
        this.emitError(client, 'NOT_MEMBER', '您不是该房间成员，请先加入房间');
        return;
      }

      // 2. 如果用户已在其他房间，先离开
      if (client.data.roomId && client.data.roomId !== roomId) {
        client.leave(client.data.roomId);
        this.yDocService.unregisterClient(client.data.roomId, client.id);
      }

      // 3. 附加房间和角色信息到 socket
      client.data.roomId = roomId;
      client.data.role = member.role;

      // 4. 注册到 Yjs 文档服务
      this.yDocService.registerClient(roomId, client.id);

      // 5. 初始化文档 (如果需要)
      if (initialCode) {
        this.yDocService.initDocIfEmpty(roomId, initialCode);
      }

      // 6. 加入 Socket.IO 房间
      client.join(roomId);

      // 7. 获取房间内所有在线用户
      const clients = this.getOnlineClientsInRoom(roomId);

      // 8. 通知所有人 (包括自己)
      this.server.to(roomId).emit(ACTIONS.JOINED, {
        clients,
        user: {
          id: user.id,
          username: user.username,
          avatarUrl: user.githubAvatar,
        },
        role: member.role,
        socketId: client.id,
      });

      console.log(`[ChatGateway] 用户 ${user.username} 加入房间 ${roomId}, 角色: ${member.role}`);
    } catch (error) {
      console.error('[ChatGateway] 加入房间失败:', error);
      this.emitError(client, 'JOIN_FAILED', '加入房间失败');
    }
  }

  /**
   * 离开房间
   */
  @SubscribeMessage(ACTIONS.LEAVE)
  handleLeave(client: AuthenticatedSocket, payload: { roomId: string }) {
    const { roomId } = payload;
    const user = client.data.user;

    if (client.data.roomId !== roomId) {
      return;
    }

    // 通知房间内其他成员
    client.to(roomId).emit(ACTIONS.MEMBER_LEFT, {
      userId: user?.id,
      username: user?.username,
      socketId: client.id,
    });

    // 离开房间
    client.leave(roomId);
    this.yDocService.unregisterClient(roomId, client.id);

    // 清理 socket 数据
    client.data.roomId = undefined;
    client.data.role = undefined;

    console.log(`[ChatGateway] 用户 ${user?.username} 离开房间 ${roomId}`);
  }

  // ==================== Yjs 同步 (带权限检查) ====================

  /**
   * Yjs 同步请求
   */
  @SubscribeMessage(ACTIONS.Y_SYNC)
  handleYSync(client: AuthenticatedSocket, payload: YSyncPayload) {
    const { roomId, stateVector } = payload;

    // 验证用户在房间内
    if (!this.validateRoomAccess(client, roomId)) {
      return;
    }

    this.yDocService.registerClient(roomId, client.id);
    const vector = stateVector ? this.toUint8Array(stateVector) : undefined;
    const update = this.yDocService.getStateAsUpdate(roomId, vector);

    client.emit(ACTIONS.Y_SYNC, {
      roomId,
      update,
      stateVector: this.yDocService.getStateVector(roomId),
      // 返回用户角色，前端根据角色设置只读状态
      role: client.data.role,
    });
  }

  /**
   * Yjs 文档更新 - 需要编辑权限
   */
  @SubscribeMessage(ACTIONS.Y_UPDATE)
  handleYUpdate(client: AuthenticatedSocket, payload: YUpdatePayload) {
    const { roomId, update } = payload;

    // 1. 验证用户在房间内
    if (!this.validateRoomAccess(client, roomId)) {
      return;
    }

    // 2. 验证编辑权限 (viewer 不能发送更新)
    if (client.data.role === 'viewer') {
      this.emitError(client, 'NO_EDIT_PERMISSION', '只读用户无法编辑');
      return;
    }

    // 3. 应用更新并广播
    const normalizedUpdate = this.toUint8Array(update);
    this.yDocService.applyUpdate(roomId, normalizedUpdate);

    client.to(roomId).emit(ACTIONS.Y_UPDATE, {
      roomId,
      update: normalizedUpdate,
    });
  }

  /**
   * Yjs Awareness 更新 (光标/选区) - 所有成员都可以
   */
  @SubscribeMessage(ACTIONS.Y_AWARENESS)
  handleYAwareness(client: AuthenticatedSocket, payload: YAwarenessPayload) {
    const { roomId, update } = payload;

    if (!this.validateRoomAccess(client, roomId)) {
      return;
    }

    const normalizedUpdate = this.toUint8Array(update);
    client.to(roomId).emit(ACTIONS.Y_AWARENESS, {
      roomId,
      update: normalizedUpdate,
    });
  }

  // ==================== 权限变更通知 (供 RoomService 调用) ====================

  /**
   * 通知用户角色变更
   * 由 RoomController 在修改角色后调用
   */
  notifyRoleChanged(roomId: string, userId: string, newRole: RoomRole) {
    const socketId = this.socketUserMap[userId];
    if (!socketId) return;

    const socket = this.server.sockets.sockets.get(socketId) as AuthenticatedSocket;
    if (!socket || socket.data.roomId !== roomId) return;

    // 更新 socket 上的角色
    socket.data.role = newRole;

    // 通知该用户
    socket.emit(ACTIONS.ROLE_CHANGED, {
      roomId,
      role: newRole,
    });

    // 通知房间内所有人 (更新成员列表)
    this.server.to(roomId).emit(ACTIONS.ROOM_UPDATED, {
      type: 'member_role_changed',
      userId,
      newRole,
    });
  }

  /**
   * 强制用户离开房间 (被移除时)
   */
  forceLeaveRoom(roomId: string, userId: string) {
    const socketId = this.socketUserMap[userId];
    if (!socketId) return;

    const socket = this.server.sockets.sockets.get(socketId) as AuthenticatedSocket;
    if (!socket || socket.data.roomId !== roomId) return;

    // 通知用户被移除
    socket.emit(ACTIONS.MEMBER_REMOVED, {
      roomId,
      message: '您已被移出房间',
    });

    // 离开房间
    socket.leave(roomId);
    this.yDocService.unregisterClient(roomId, socketId);
    socket.data.roomId = undefined;
    socket.data.role = undefined;

    // 通知房间内其他人
    this.server.to(roomId).emit(ACTIONS.ROOM_UPDATED, {
      type: 'member_removed',
      userId,
    });
  }

  // ==================== 辅助方法 ====================

  /**
   * 验证用户是否在指定房间内
   */
  private validateRoomAccess(client: AuthenticatedSocket, roomId: string): boolean {
    if (!client.data.user) {
      this.emitError(client, 'UNAUTHORIZED', '请先登录');
      return false;
    }

    if (client.data.roomId !== roomId) {
      this.emitError(client, 'NOT_IN_ROOM', '您不在该房间内');
      return false;
    }

    return true;
  }

  /**
   * 发送错误消息
   */
  private emitError(client: Socket, code: string, message: string) {
    client.emit(ACTIONS.ERROR, { code, message });
  }

  /**
   * 获取房间内的在线用户
   */
  private getOnlineClientsInRoom(roomId: string) {
    const adapter = this.server.sockets.adapter as Adapter;
    const room = adapter.rooms.get(roomId);
    const socketIds = room ? Array.from(room) : [];

    return socketIds.map((socketId) => {
      const socket = this.server.sockets.sockets.get(socketId) as AuthenticatedSocket;
      return {
        socketId,
        userId: socket?.data.user?.id,
        username: socket?.data.user?.username,
        avatarUrl: socket?.data.user?.githubAvatar,
        role: socket?.data.role,
      };
    });
  }

  /**
   * 二进制数据转换
   */
  private toUint8Array(data: ArrayBuffer | Uint8Array | number[] | Buffer): Uint8Array {
    if (data instanceof Uint8Array) return data;
    if (Array.isArray(data)) return Uint8Array.from(data);
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    return new Uint8Array(data);
  }
}
```

### 3.2 更新 ChatModule

**文件路径**: `server/src/chat/chat.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatGateway } from './chat.gateway';
import { YjsDocumentService } from './yjs-document.service';
import { RoomModule } from '../room/room.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    RoomModule,
    AuthModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1h'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [ChatGateway, YjsDocumentService],
  exports: [ChatGateway], // 导出供 RoomController 使用
})
export class ChatModule {}
```

---

## 4. 权限验证流程

### 4.1 完整流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                        连接阶段                                  │
├─────────────────────────────────────────────────────────────────┤
│  Client                    Server                               │
│    │                          │                                 │
│    │─── connect(token) ──────▶│                                 │
│    │                          │── verify JWT                    │
│    │                          │── validate user                 │
│    │                          │── attach user to socket         │
│    │◀── connection success ───│                                 │
└────┼──────────────────────────┼─────────────────────────────────┘
     │                          │
┌────┼──────────────────────────┼─────────────────────────────────┐
│    │                          │   加入房间阶段                   │
├────┼──────────────────────────┼─────────────────────────────────┤
│    │─── JOIN(roomId) ────────▶│                                 │
│    │                          │── check membership              │
│    │                          │── get role                      │
│    │                          │── attach role to socket         │
│    │◀── JOINED(role) ────────│                                 │
└────┼──────────────────────────┼─────────────────────────────────┘
     │                          │
┌────┼──────────────────────────┼─────────────────────────────────┐
│    │                          │   协同编辑阶段                   │
├────┼──────────────────────────┼─────────────────────────────────┤
│    │─── Y_UPDATE ────────────▶│                                 │
│    │                          │── check role !== 'viewer'       │
│    │                          │   ├── viewer: emit ERROR        │
│    │                          │   └── editor/owner: broadcast   │
│    │◀── Y_UPDATE (broadcast) ─│                                 │
└────┼──────────────────────────┼─────────────────────────────────┘
     │                          │
┌────┼──────────────────────────┼─────────────────────────────────┐
│    │                          │   角色变更 (实时)                │
├────┼──────────────────────────┼─────────────────────────────────┤
│    │                          │◀── owner changes role via API   │
│    │◀── ROLE_CHANGED(role) ──│                                 │
│    │                          │   (前端更新编辑器状态)           │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 权限矩阵

| 操作 | owner | editor | viewer | 非成员 |
|------|-------|--------|--------|--------|
| 建立连接 | ✅ | ✅ | ✅ | ✅ (需登录) |
| 加入房间 | ✅ | ✅ | ✅ | ❌ |
| 接收 Y_UPDATE | ✅ | ✅ | ✅ | ❌ |
| 发送 Y_UPDATE | ✅ | ✅ | ❌ | ❌ |
| 发送 Y_AWARENESS | ✅ | ✅ | ✅ | ❌ |

---

## 5. 错误处理

### 5.1 错误码定义

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| `UNAUTHORIZED` | 未登录 | 跳转登录页 |
| `TOKEN_INVALID` | Token 无效或过期 | 刷新 Token 或重新登录 |
| `USER_NOT_FOUND` | 用户不存在 | 重新登录 |
| `DUPLICATE_LOGIN` | 重复登录 | 提示用户 |
| `NOT_MEMBER` | 不是房间成员 | 跳转房间列表或申请加入 |
| `NOT_IN_ROOM` | 未加入房间 | 先调用 JOIN |
| `NO_EDIT_PERMISSION` | 无编辑权限 | 提示只读 |
| `JOIN_FAILED` | 加入失败 | 重试或联系管理员 |

### 5.2 前端错误处理示例

```typescript
// 在 socket-provider.ts 中处理错误
socket.on(ACTIONS.ERROR, (error: { code: string; message: string }) => {
  console.error('[Socket Error]', error);
  
  switch (error.code) {
    case 'UNAUTHORIZED':
    case 'TOKEN_INVALID':
      // 跳转登录
      window.location.href = '/login';
      break;
    case 'NOT_MEMBER':
      // 显示提示
      toast.error('您不是该房间成员');
      break;
    case 'NO_EDIT_PERMISSION':
      // 设置只读模式
      toast.warning('您没有编辑权限');
      break;
    default:
      toast.error(error.message);
  }
});
```

---

## 下一步

请继续阅读 **Part 4: 前端状态管理改造** (`PART4_FRONTEND_STATE.md`)
