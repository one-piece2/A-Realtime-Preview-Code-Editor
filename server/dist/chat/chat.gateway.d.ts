import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { YjsDocumentService } from './yjs-document.service';
import { RoomRole } from 'src/room/entities/room-member.entity';
import { RoomService } from 'src/room/room.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from 'src/auth/auth.service';
interface JoinPayload {
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
interface AuthenticatedSocket extends Socket {
    data: {
        user: {
            id: string;
            email: string;
            username: string;
            githubAvatar?: string;
        };
        roomId?: string;
        role?: RoomRole;
    };
}
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly yDocService;
    private readonly roomService;
    private readonly jwtService;
    private readonly configService;
    private readonly authService;
    private userSocketMap;
    private socketUserMap;
    server: Server;
    constructor(yDocService: YjsDocumentService, roomService: RoomService, jwtService: JwtService, configService: ConfigService, authService: AuthService);
    handleConnection(client: AuthenticatedSocket): Promise<void>;
    handleDisconnect(client: AuthenticatedSocket): void;
    handleJoin(client: AuthenticatedSocket, payload: JoinPayload): Promise<void>;
    handleLeave(client: AuthenticatedSocket, payload: {
        roomId: string;
    }): void;
    handleYSync(client: AuthenticatedSocket, payload: YSyncPayload): void;
    handleYUpdate(client: AuthenticatedSocket, payload: YUpdatePayload): void;
    handleYAwareness(client: AuthenticatedSocket, payload: YAwarenessPayload): void;
    notifyRoleChanged(roomId: string, userId: string, newRole: RoomRole): void;
    forceLeaveRoom(roomId: string, userId: string): void;
    forceCloseRoom(roomId: string): void;
    private toUint8Array;
    private emitError;
    private getOnlineClientsInRoom;
    private validateRoomAccess;
}
export {};
