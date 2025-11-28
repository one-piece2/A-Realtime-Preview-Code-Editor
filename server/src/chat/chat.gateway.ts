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
    
    console.log(`客户端断开连接: ${client.id}, 用户: ${username}`);
  }
  @SubscribeMessage(ACTIONS.JOIN)
  handleMessage(client: Socket, payload: JoinPayload): void {
    this.userSocketMap[client.id] = payload.username;
    client.join(payload.roomId);
    const connectedClients = this.getAllConnectedClients(payload.roomId);
    // 通知所有已连接客户端当前连接的客户端列表
    connectedClients.forEach(({ socketId, username }) => {
      this.server.to(socketId).emit(ACTIONS.JOINED, {
        clients: connectedClients,
        username: payload.username,
        socketId: client.id,
      });
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
    // 广播代码更改给房间内的其他客户端
    client.to(roomId).emit(ACTIONS.CODE_CHANGE, {
   
      code,
    });
  }
}
