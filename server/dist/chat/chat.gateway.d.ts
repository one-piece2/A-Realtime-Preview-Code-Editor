import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { YjsDocumentService } from './yjs-document.service';
interface JoinPayload {
    username: string;
    roomId: string;
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
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly yDocService;
    private userSocketMap;
    server: Server;
    constructor(yDocService: YjsDocumentService);
    handleConnection(client: Socket): void;
    getAllConnectedClients(roomId: string): {
        socketId: string;
        username: string;
    }[];
    handleDisconnect(client: Socket): void;
    handleJoin(client: Socket, payload: JoinPayload): void;
    handleLeave(client: Socket, payload: any): void;
    handleCodeChange(client: Socket, payload: any): void;
    handleSyncCode(client: Socket, payload: any): void;
    handleYSync(client: Socket, payload: YSyncPayload): void;
    handleYUpdate(client: Socket, payload: YUpdatePayload): void;
    handleYAwareness(client: Socket, payload: YAwarenessPayload): void;
    private toUint8Array;
}
export {};
