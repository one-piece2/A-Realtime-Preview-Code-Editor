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
interface JoinPayload {
  username: string;
  roomId: string;
}
@WebSocketGateway({
  cors: {
    origin: '*',
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
    });


  }
  @SubscribeMessage(ACTIONS.JOIN)
  handleJoin(client: Socket, payload: JoinPayload) {
    const { username, roomId } = payload;

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
}
