import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ACTIONS } from 'src/action';
import { Adapter } from 'socket.io-adapter';
import { YjsDocumentService } from './yjs-document.service'; // 引入 Yjs 文档管理服务以管理房间内的协同文档
import { RoomRole } from 'src/room/entities/room-member.entity';
import { RoomService } from 'src/room/room.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from 'src/auth/auth.service';
import { JwtPayload } from 'src/auth/auth.service';


interface JoinPayload {
  // 改为只需要 roomId，用户信息从 JWT 获取
  // username: string;
  roomId: string;
  initialCode?: string;
}

interface YSyncPayload {
  roomId: string; // 房间标识，用于告知服务器目标 Y.Doc
  stateVector?: ArrayBuffer | Uint8Array | number[]; // 客户端当前持有的状态向量，便于服务器计算差异
}

interface YUpdatePayload {
  roomId: string;
  update: ArrayBuffer | Uint8Array | number[]; // 客户端产生的增量更新数据
}

interface YAwarenessPayload {
  roomId: string; // 房间标识
  update: ArrayBuffer | Uint8Array | number[]; // y-protocols/awareness 编码后的更新
}

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
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
      : 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST'],
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  // 用于存储用户ID和Socket实例的映射   socketId -> userId 映射
  private userSocketMap: Record<string, string> = {};
  // userId -> socketId 映射 (反向查找)
  private socketUserMap: Record<string, string> = {};


  //这是服务器端的socket实例
  @WebSocketServer()
  server: Server;

  constructor(private readonly yDocService: YjsDocumentService,
    private readonly roomService: RoomService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,

  ) { }
  //连接时自动触发 ---   处理 WebSocket 连接 - JWT 验证
  async handleConnection(client: AuthenticatedSocket) {
    try {
      // 从 handshake 中获取 token
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        this.emitError(client, 'UNAUTHORIZED', '未提供认证令牌');
        client.disconnect();
        return;
      }

      // 验证 JWT
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

      //  验证用户是否存在
      const user = await this.authService.validateUser(payload);
      if (!user) {
        this.emitError(client, 'USER_NOT_FOUND', '用户不存在');
        client.disconnect();
        return;
      }

      // 将用户信息附加到 socket  这里是将用户信息附加到socket
      client.data.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        githubAvatar: user.githubAvatar,
      };

      // 检查是否有旧连接需要踢掉 (同一用户只能有一个连接)
      const oldSocketId = this.socketUserMap[user.id];
      if (oldSocketId && oldSocketId !== client.id) {
        const oldSocket = this.server.sockets.sockets.get(oldSocketId);
        if (oldSocket) {
          this.emitError(oldSocket as AuthenticatedSocket, 'DUPLICATE_LOGIN', '您已在其他地方登录');
          //服务端主动强制关闭连接
          oldSocket.disconnect(true);
        }
        delete this.userSocketMap[oldSocketId];
        delete this.socketUserMap[user.id];
      }

      // 注册新连接
      this.userSocketMap[client.id] = user.id;
      this.socketUserMap[user.id] = client.id;

      console.log(`[ChatGateway] 用户 ${user.username} (${user.id}) 已连接`);
    } catch (error) {
      console.error('[ChatGateway] 连接处理错误:', error);
      this.emitError(client, 'CONNECTION_ERROR', '连接失败');
      client.disconnect();
    }
  }

  // getAllConnectedClients(roomId: string) {
  //   const adapter = this.server.sockets.adapter as Adapter;
  //   const room = adapter.rooms.get(roomId);
  //   //ids是房间中的所有socketid
  //   const ids = room ? Array.from(room) : [];
  //   return ids.map((socketId) => ({
  //     socketId,
  //     username: this.userSocketMap[socketId],
  //   }));
  // }
  //断开连接的回调
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
      //离开房间
      client.leave(roomId);
      //释放该 socket 对房间文档的引用
      this.yDocService.unregisterClient(roomId, client.id);
    }
    // 清理映射
    if (userId) {
      delete this.socketUserMap[userId];
    }
    delete this.userSocketMap[client.id];

    console.log(`[ChatGateway] 用户断开连接: ${client.id}`);
  
    
  }
  //---------------------------------房间-----------------------------------
  //加入房间 - 验证成员身份和权限
  @SubscribeMessage(ACTIONS.JOIN)
  async handleJoin(client: AuthenticatedSocket, payload: JoinPayload) {
    //token存在且合法 且有这个用户之后 这个数据才能拿到。
    const user=client.data.user

    const {  roomId, initialCode } = payload;
   if (!user) {
      this.emitError(client, 'UNAUTHORIZED', '请先登录');
      return;
    }
    try {
      // 检查用户是否是房间成员
      const member = await this.roomService.getMemberByRoomId(roomId, user.id);
      if (!member) {
        this.emitError(client, 'NOT_MEMBER', '您不是该房间成员，请先加入房间');
        return;
      }

      // 如果用户已在其他房间，先离开
      if (client.data.roomId && client.data.roomId !== roomId) {
        const oldRoomId = client.data.roomId;
        // 通知旧房间的其他成员
        client.to(oldRoomId).emit(ACTIONS.MEMBER_LEFT, {
          userId: user.id,
          username: user.username,
          socketId: client.id,
        });
        client.leave(oldRoomId);
        this.yDocService.unregisterClient(oldRoomId, client.id);
      }

      //  附加房间和角色信息到 socket
      client.data.roomId = roomId;
      client.data.role = member.role;

      // 注册到 Yjs 文档服务
      this.yDocService.registerClient(roomId, client.id);

      // 初始化文档 
      if (initialCode) {
        this.yDocService.initDocIfEmpty(roomId, initialCode);
      }

      // 加入 Socket.IO 房间
      client.join(roomId);

      //  获取房间内所有在线用户
      const clients = this.getOnlineClientsInRoom(roomId);

      //  通知自己加入成功
      client.emit(ACTIONS.JOINED, {
        clients,
        user: {
          id: user.id,
          username: user.username,
          avatarUrl: user.githubAvatar,
        },
        role: member.role,
        socketId: client.id,
      });

      // 通知房间内其他成员有新人加入
      client.to(roomId).emit(ACTIONS.MEMBER_JOINED, {
        userId: user.id,
        username: user.username,
        avatarUrl: user.githubAvatar,
        socketId: client.id,
        role: member.role,
      });

      console.log(`[ChatGateway] 用户 ${user.username} 加入房间 ${roomId}, 角色: ${member.role}`);
    } catch (error) {
      console.error('[ChatGateway] 加入房间失败:', error);
      this.emitError(client, 'JOIN_FAILED', '加入房间失败');
    }
    
  }


  @SubscribeMessage(ACTIONS.LEAVE)
  handleLeave(client: AuthenticatedSocket, payload: { roomId: string }): void {
    
    const { roomId } = payload;
      const user = client.data.user;

      // 验证用户是否已登录
      if (!user) {
        this.emitError(client, 'UNAUTHORIZED', '请先登录');
        return;
      }

      // 验证 roomId 是否有效
      if (!roomId) {
        this.emitError(client, 'INVALID_ROOM', '房间 ID 无效');
        return;
      }

      // 验证用户是否在该房间
    if (client.data.roomId !== roomId) {
        this.emitError(client, 'NOT_IN_ROOM', '您不在该房间中');
      return;
    }

   // 通知房间内其他成员
    client.to(roomId).emit(ACTIONS.MEMBER_LEFT, {
        userId: user.id,
        username: user.username,
      socketId: client.id,
    });

      // 离开 Socket.IO 房间
    client.leave(roomId);

      // 离开房间时释放该 socket 对房间文档的引用
      this.yDocService.unregisterClient(roomId, client.id);

// 清理 socket 数据
    client.data.roomId = undefined;
    client.data.role = undefined;
      console.log(`[ChatGateway] 用户 ${user?.username} 离开房间 ${roomId}`);
  }
  //此处注释掉代码变更的处理，改为使用Yjs的同步机制
  // @SubscribeMessage(ACTIONS.CODE_CHANGE)
  // handleCodeChange(client: Socket, payload: any): void {

  //   const { roomId, code } = payload;
  //   // 广播给同房间的其他用户（不包括发送者）
  //   //如果房间的人数大于1，才广播
  //   if (this.getAllConnectedClients(roomId).length > 1) {
  //     client.to(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  //   }
  // }

  //迁移到Yjs同步机制
  // @SubscribeMessage(ACTIONS.SYNC_CODE)
  // handleSyncCode(client: Socket, payload: any): void {
  //   const { code, socketId } = payload;
  //   const codeValue = code || '';
  //   console.log(`同步代码给 ${socketId}:`, codeValue);
  //   // 只发送给指定的socketId
  //   this.server.to(socketId).emit(ACTIONS.CODE_CHANGE, { code: codeValue });
  // }


//---------------yjs带权限--------------------
//yjs同步请求
  @SubscribeMessage(ACTIONS.Y_SYNC)
  handleYSync(client: AuthenticatedSocket, payload: YSyncPayload): void {
    const { roomId, stateVector } = payload;
    
    // 验证用户在房间内
    if (!this.validateRoomAccess(client, roomId)) {
      return;
    }

    this.yDocService.registerClient(roomId, client.id); // 确保服务器已记录该 socket 对文档的引用
    const vector = stateVector ? this.toUint8Array(stateVector) : undefined; // 将可选的状态向量统一转换成 Uint8Array
    const update = this.yDocService.getStateAsUpdate(roomId, vector); // 计算客户端相较于服务器缺失的增量更新
    client.emit(ACTIONS.Y_SYNC, {
      roomId,
      update,
      stateVector: this.yDocService.getStateVector(roomId), // 附带最新状态向量，便于客户端缓存
       // 返回用户角色，前端根据角色设置只读状态
      role: client.data.role,
    });
  }
//Yjs 文档更新 - 需要编辑权限
  @SubscribeMessage(ACTIONS.Y_UPDATE)
  handleYUpdate(client: AuthenticatedSocket, payload: YUpdatePayload): void {
    const { roomId, update } = payload;
        // 验证用户在房间内
    if (!this.validateRoomAccess(client, roomId)) {
      return;
    }
    // 验证编辑权限 (viewer 不能发送更新)
    if (client.data.role === 'viewer') {
      this.emitError(client, 'NO_EDIT_PERMISSION', '只读用户无法编辑');
      return;
    }
    const normalizedUpdate = this.toUint8Array(update); // 将增量转换为 Uint8Array 以供 Yjs 使用

    this.yDocService.applyUpdate(roomId, normalizedUpdate); // 先更新服务器端文档
    //广播给同房间的其他用户（不包括发送者）
    client.to(roomId).emit(ACTIONS.Y_UPDATE, {
      roomId, // 广播时携带房间 ID
      update: normalizedUpdate, // 将增量发送给其它客户端
    });
  }
//Yjs Awareness 更新 (光标/选区) - 所有成员都可以
  @SubscribeMessage(ACTIONS.Y_AWARENESS)
  handleYAwareness(client: AuthenticatedSocket, payload: YAwarenessPayload): void {
    const { roomId, update } = payload;
     if (!this.validateRoomAccess(client, roomId)) {
      return;
    }
    // awareness 只需要广播，不需要在服务器端保存
    const normalizedUpdate = this.toUint8Array(update);
    //广播给同房间的其他用户（不包括发送者）
    client.to(roomId).emit(ACTIONS.Y_AWARENESS, {
      roomId,
      update: normalizedUpdate,
    });
  }
  // ==================== 权限变更通知 (供 RoomService 调用) ====================

   //通知用户角色变更,由RoomController 在修改角色后调用
  notifyRoleChanged(roomId: string, userId: string, newRole: RoomRole) {
      const socketId = this.socketUserMap[userId];
      if (!socketId) return;
    //通过socketId获取socket
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

  
   //强制用户离开房间 (被移除时)
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

  // 房间被删除时，强制所有成员离开
  forceCloseRoom(roomId: string) {
    const adapter = this.server.sockets.adapter as Adapter;
    const room = adapter.rooms.get(roomId);
    if (!room) return;

    const socketIds = Array.from(room);
    
    // 通知所有成员房间已被删除
    this.server.to(roomId).emit(ACTIONS.ROOM_UPDATED, {
      type: 'room_deleted',
      roomId,
      message: '房间已被删除',
    });

    // 让所有 socket 离开房间并清理状态
    for (const socketId of socketIds) {
      const socket = this.server.sockets.sockets.get(socketId) as AuthenticatedSocket;
      if (socket) {
        socket.leave(roomId);
        this.yDocService.unregisterClient(roomId, socketId);
        socket.data.roomId = undefined;
        socket.data.role = undefined;
      }
    }
  }

  private toUint8Array(
    data: ArrayBuffer | Uint8Array | number[] | Buffer,
  ): Uint8Array {
    if (data instanceof Uint8Array) {
      return data; // 已经是目标类型，直接返回
    }
    if (Array.isArray(data)) {
      return Uint8Array.from(data); // 将 number[] 转换为 Uint8Array
    }
    if (data instanceof ArrayBuffer) {
      return new Uint8Array(data); // 将 ArrayBuffer 封装成视图
    }
    return new Uint8Array(data); // 兜底处理 Node.js Buffer 等类型
  }


  //发送错误消息
  private emitError(client: Socket, code: string, message: string) {
    client.emit(ACTIONS.ERROR, { code, message });
  }

  
  // 获取房间内的在线用户
  private getOnlineClientsInRoom(roomId: string) {
    //通过 adapter可以查询当前服务中所有房间和连接的映射关系
    const adapter = this.server.sockets.adapter as Adapter;
    //获取房间内的所有socketId  是一个Set数据结构
    const room = adapter.rooms.get(roomId);
    const socketIds = room ? Array.from(room) : [];

    return socketIds.map((socketId) => {
      //通过socketId获取socket
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
  
  // 验证用户是否在指定房间内
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
}
