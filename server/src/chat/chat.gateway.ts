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

interface JoinPayload {
  username: string;
  roomId: string;
  // 可选：首个创建房间的用户可以把默认代码模板一起带过来
  initialCode?: string;
}

interface YSyncPayload {
  roomId: string; // 房间标识，用于告知服务器目标 Y.Doc
  stateVector?: ArrayBuffer | Uint8Array | number[]; // 客户端当前持有的状态向量，便于服务器计算差异
}

interface YUpdatePayload {
  roomId: string; // 房间标识
  update: ArrayBuffer | Uint8Array | number[]; // 客户端产生的增量更新数据
}

interface YAwarenessPayload {
  roomId: string; // 房间标识
  update: ArrayBuffer | Uint8Array | number[]; // y-protocols/awareness 编码后的更新
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
  // 用于存储用户ID和Socket实例的映射
  private userSocketMap: Record<string, string> = {};
  // 用于存储已连接过的socket ID，防止重复处理
  // private connectedClients: Set<string> = new Set();
  //这是服务器端的socket实例
  @WebSocketServer()
  server: Server;

  constructor(private readonly yDocService: YjsDocumentService) {} // 通过依赖注入获取 Yjs 服务，用于管理房间内的协同文档

  handleConnection(client: Socket) {
    // 防止同一个客户端连接事件被处理多次
    // if (this.connectedClients.has(client.id)) {
    //   console.log('Socket already connected:', client.id);
    //   return;
    // }
    // this.connectedClients.add(client.id);
    if (Object.values(this.userSocketMap).includes(client.id)) {
      console.log('重复连接，忽略:', client.id);
      return;
    }
    console.log('客户端连接成功:', client.id);
    // console.log('当前连接客户端数:', this.connectedClients.size);

  }
  getAllConnectedClients(roomId: string) {
    const adapter = this.server.sockets.adapter as Adapter;
    const room = adapter.rooms.get(roomId);
    //ids是房间中的所有socketid
    const ids = room ? Array.from(room) : [];
    return ids.map((socketId) => ({
      socketId,
      username: this.userSocketMap[socketId],
    }));
  }
  handleDisconnect(client: Socket) {
    // 获取客户端所在的所有房间
    const rooms = [...client.rooms];

    // 先保存用户信息
    const username = this.userSocketMap[client.id];

    // 给房间中的所有客户端发送消息（不包括当前断开的客户端）
    rooms.forEach((roomId) => {
      this.server.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: client.id,
        username,
      });
    });

    // 删除用户映射
    delete this.userSocketMap[client.id];

    // 客户端离开房间
    rooms.forEach((roomId) => {
      client.leave(roomId);
      this.yDocService.unregisterClient(roomId, client.id); // 对所有房间执行注销，避免文档实例长期驻留
    });


  }
  @SubscribeMessage(ACTIONS.JOIN)
  handleJoin(client: Socket, payload: JoinPayload) {
    const { username, roomId, initialCode } = payload;

    // 找到同一个 username 的旧 socket 并踢掉
    for (const [oldSocketId, oldUsername] of Object.entries(this.userSocketMap)) {
      if (oldUsername === username && oldSocketId !== client.id) {
        console.log("踢掉旧连接:", oldSocketId);
        this.server.sockets.sockets.get(oldSocketId)?.disconnect(true);
        delete this.userSocketMap[oldSocketId];
      }
    }

    // 注册新连接
    this.userSocketMap[client.id] = username;
    this.yDocService.registerClient(roomId, client.id); // 将 socket 与房间文档关联，后续便于同步与回收

    // 如果传入了初始代码，并且当前房间文档仍为空，则用这段代码初始化
    if (initialCode) {
      this.yDocService.initDocIfEmpty(roomId, initialCode);
    }

    client.join(roomId);

    const clients = this.getAllConnectedClients(roomId);

    // 广播给房间内所有人
    this.server.to(roomId).emit(ACTIONS.JOINED, {
      clients,
      username,
      socketId: client.id,
    });
  }


  @SubscribeMessage(ACTIONS.LEAVE)
  handleLeave(client: Socket, payload: any): void {
    const { roomId } = payload;
    const username = this.userSocketMap[client.id];

    console.log(`用户 ${username} 请求离开房间 ${roomId}`);
    delete this.userSocketMap[client.id];

    client.leave(roomId);
    this.yDocService.unregisterClient(roomId, client.id); // 离开房间时释放该 socket 对房间文档的引用
   
    const allConernedClients = this.getAllConnectedClients(roomId);
    // 先通知房间中的其他客户端，然后再让客户端离开
    this.server.to(roomId).emit(ACTIONS.DISCONNECTED, {
      socketId: client.id,
      username,
      allConernedClients
    });

    console.log(`已通知房间 ${roomId} 中的其他客户端，${username} 已离开`);

    // 清理用户映射



  }
  @SubscribeMessage(ACTIONS.CODE_CHANGE)
  handleCodeChange(client: Socket, payload: any): void {
   
    const { roomId, code } = payload;
    // 广播给同房间的其他用户（不包括发送者）
    //如果房间的人数大于1，才广播
    if (this.getAllConnectedClients(roomId).length > 1) {
      client.to(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    }
  }

  @SubscribeMessage(ACTIONS.SYNC_CODE)
  handleSyncCode(client: Socket, payload: any): void {
    const { code, socketId } = payload;
    const codeValue = code || '';
    console.log(`同步代码给 ${socketId}:`, codeValue);
    // 只发送给指定的socketId
    this.server.to(socketId).emit(ACTIONS.CODE_CHANGE, { code: codeValue });
  }

  @SubscribeMessage(ACTIONS.Y_SYNC)
  handleYSync(client: Socket, payload: YSyncPayload): void {
    const { roomId, stateVector } = payload; // 从消息中解构房间 ID 与客户端现有的状态向量
    this.yDocService.registerClient(roomId, client.id); // 确保服务器已记录该 socket 对文档的引用
    const vector = stateVector ? this.toUint8Array(stateVector) : undefined; // 将可选的状态向量统一转换成 Uint8Array
    const update = this.yDocService.getStateAsUpdate(roomId, vector); // 计算客户端相较于服务器缺失的增量更新
    client.emit(ACTIONS.Y_SYNC, {
      roomId, // 回传房间 ID 以便客户端路由该事件
      update, // 返回所需的更新数据
      stateVector: this.yDocService.getStateVector(roomId), // 附带最新状态向量，便于客户端缓存
    });
  }

  @SubscribeMessage(ACTIONS.Y_UPDATE)
  handleYUpdate(client: Socket, payload: YUpdatePayload): void {
    const { roomId, update } = payload; // 获取房间 ID 与客户端产生的增量
    const normalizedUpdate = this.toUint8Array(update); // 将增量转换为 Uint8Array 以供 Yjs 使用
    this.yDocService.applyUpdate(roomId, normalizedUpdate); // 先更新服务器端文档以保持权威状态
    //广播给同房间的其他用户（不包括发送者）
    client.to(roomId).emit(ACTIONS.Y_UPDATE, {
      roomId, // 广播时携带房间 ID
      update: normalizedUpdate, // 将增量发送给其它客户端
    });
  }

  @SubscribeMessage(ACTIONS.Y_AWARENESS)
  handleYAwareness(client: Socket, payload: YAwarenessPayload): void {
    const { roomId, update } = payload;
    // awareness 只需要广播，不需要在服务器端保存
    const normalizedUpdate = this.toUint8Array(update);
    //广播给同房间的其他用户（不包括发送者）
    client.to(roomId).emit(ACTIONS.Y_AWARENESS, {
      roomId,
      update: normalizedUpdate,
    });
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
}
