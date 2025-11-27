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
  //这是服务器端的socket实例
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log('客户端连接成功:', client.id);
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
    //获取客户端所在的所有房间
    const rooms = [...client.rooms];
    rooms.forEach((roomId) => {
      // 给房间中的所有客户端发送消息（不包括当前断开的客户端）
      this.server.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: client.id,
        username: this.userSocketMap[client.id],
      });
    });
    //删除用户映射
    delete this.userSocketMap[client.id];
    // 客户端离开房间
    rooms.forEach((roomId) => {
      client.leave(roomId);
    });
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
        username,
        socketId: client.id,
      });
    });
  }
}
