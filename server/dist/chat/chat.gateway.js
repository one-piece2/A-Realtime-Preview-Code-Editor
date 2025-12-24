"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const action_1 = require("../action");
const yjs_document_service_1 = require("./yjs-document.service");
const room_service_1 = require("../room/room.service");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const auth_service_1 = require("../auth/auth.service");
let ChatGateway = class ChatGateway {
    yDocService;
    roomService;
    jwtService;
    configService;
    authService;
    userSocketMap = {};
    socketUserMap = {};
    server;
    constructor(yDocService, roomService, jwtService, configService, authService) {
        this.yDocService = yDocService;
        this.roomService = roomService;
        this.jwtService = jwtService;
        this.configService = configService;
        this.authService = authService;
    }
    async handleConnection(client) {
        try {
            const token = client.handshake.auth?.token ||
                client.handshake.headers?.authorization?.split(' ')[1];
            if (!token) {
                this.emitError(client, 'UNAUTHORIZED', '未提供认证令牌');
                client.disconnect();
                return;
            }
            let payload;
            try {
                payload = this.jwtService.verify(token, {
                    secret: this.configService.get('JWT_SECRET'),
                });
            }
            catch (error) {
                this.emitError(client, 'TOKEN_INVALID', '认证令牌无效或已过期');
                client.disconnect();
                return;
            }
            const user = await this.authService.validateUser(payload);
            if (!user) {
                this.emitError(client, 'USER_NOT_FOUND', '用户不存在');
                client.disconnect();
                return;
            }
            client.data.user = {
                id: user.id,
                email: user.email,
                username: user.username,
                githubAvatar: user.githubAvatar,
            };
            const oldSocketId = this.socketUserMap[user.id];
            if (oldSocketId && oldSocketId !== client.id) {
                const oldSocket = this.server.sockets.sockets.get(oldSocketId);
                if (oldSocket) {
                    this.emitError(oldSocket, 'DUPLICATE_LOGIN', '您已在其他地方登录');
                    oldSocket.disconnect(true);
                }
                delete this.userSocketMap[oldSocketId];
                delete this.socketUserMap[user.id];
            }
            this.userSocketMap[client.id] = user.id;
            this.socketUserMap[user.id] = client.id;
            console.log(`[ChatGateway] 用户 ${user.username} (${user.id}) 已连接`);
        }
        catch (error) {
            console.error('[ChatGateway] 连接处理错误:', error);
            this.emitError(client, 'CONNECTION_ERROR', '连接失败');
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        const userId = this.userSocketMap[client.id];
        const roomId = client.data.roomId;
        if (roomId) {
            client.to(roomId).emit(action_1.ACTIONS.MEMBER_LEFT, {
                userId,
                username: client.data.user?.username,
                socketId: client.id,
            });
            client.leave(roomId);
            this.yDocService.unregisterClient(roomId, client.id);
        }
        if (userId) {
            delete this.socketUserMap[userId];
        }
        delete this.userSocketMap[client.id];
        console.log(`[ChatGateway] 用户断开连接: ${client.id}`);
    }
    async handleJoin(client, payload) {
        const user = client.data.user;
        const { roomId, initialCode } = payload;
        if (!user) {
            this.emitError(client, 'UNAUTHORIZED', '请先登录');
            return;
        }
        try {
            const member = await this.roomService.getMemberByRoomId(roomId, user.id);
            if (!member) {
                this.emitError(client, 'NOT_MEMBER', '您不是该房间成员，请先加入房间');
                return;
            }
            if (client.data.roomId && client.data.roomId !== roomId) {
                const oldRoomId = client.data.roomId;
                client.to(oldRoomId).emit(action_1.ACTIONS.MEMBER_LEFT, {
                    userId: user.id,
                    username: user.username,
                    socketId: client.id,
                });
                client.leave(oldRoomId);
                this.yDocService.unregisterClient(oldRoomId, client.id);
            }
            client.data.roomId = roomId;
            client.data.role = member.role;
            this.yDocService.registerClient(roomId, client.id);
            if (initialCode) {
                this.yDocService.initDocIfEmpty(roomId, initialCode);
            }
            client.join(roomId);
            const clients = this.getOnlineClientsInRoom(roomId);
            client.emit(action_1.ACTIONS.JOINED, {
                clients,
                user: {
                    id: user.id,
                    username: user.username,
                    avatarUrl: user.githubAvatar,
                },
                role: member.role,
                socketId: client.id,
            });
            client.to(roomId).emit(action_1.ACTIONS.MEMBER_JOINED, {
                userId: user.id,
                username: user.username,
                avatarUrl: user.githubAvatar,
                socketId: client.id,
                role: member.role,
            });
            console.log(`[ChatGateway] 用户 ${user.username} 加入房间 ${roomId}, 角色: ${member.role}`);
        }
        catch (error) {
            console.error('[ChatGateway] 加入房间失败:', error);
            this.emitError(client, 'JOIN_FAILED', '加入房间失败');
        }
    }
    handleLeave(client, payload) {
        const { roomId } = payload;
        const user = client.data.user;
        if (!user) {
            this.emitError(client, 'UNAUTHORIZED', '请先登录');
            return;
        }
        if (!roomId) {
            this.emitError(client, 'INVALID_ROOM', '房间 ID 无效');
            return;
        }
        if (client.data.roomId !== roomId) {
            this.emitError(client, 'NOT_IN_ROOM', '您不在该房间中');
            return;
        }
        client.to(roomId).emit(action_1.ACTIONS.MEMBER_LEFT, {
            userId: user.id,
            username: user.username,
            socketId: client.id,
        });
        client.leave(roomId);
        this.yDocService.unregisterClient(roomId, client.id);
        client.data.roomId = undefined;
        client.data.role = undefined;
        console.log(`[ChatGateway] 用户 ${user?.username} 离开房间 ${roomId}`);
    }
    handleYSync(client, payload) {
        const { roomId, stateVector } = payload;
        if (!this.validateRoomAccess(client, roomId)) {
            return;
        }
        this.yDocService.registerClient(roomId, client.id);
        const vector = stateVector ? this.toUint8Array(stateVector) : undefined;
        const update = this.yDocService.getStateAsUpdate(roomId, vector);
        client.emit(action_1.ACTIONS.Y_SYNC, {
            roomId,
            update,
            stateVector: this.yDocService.getStateVector(roomId),
            role: client.data.role,
        });
    }
    handleYUpdate(client, payload) {
        const { roomId, update } = payload;
        if (!this.validateRoomAccess(client, roomId)) {
            return;
        }
        if (client.data.role === 'viewer') {
            this.emitError(client, 'NO_EDIT_PERMISSION', '只读用户无法编辑');
            return;
        }
        const normalizedUpdate = this.toUint8Array(update);
        this.yDocService.applyUpdate(roomId, normalizedUpdate);
        client.to(roomId).emit(action_1.ACTIONS.Y_UPDATE, {
            roomId,
            update: normalizedUpdate,
        });
    }
    handleYAwareness(client, payload) {
        const { roomId, update } = payload;
        if (!this.validateRoomAccess(client, roomId)) {
            return;
        }
        const normalizedUpdate = this.toUint8Array(update);
        client.to(roomId).emit(action_1.ACTIONS.Y_AWARENESS, {
            roomId,
            update: normalizedUpdate,
        });
    }
    notifyRoleChanged(roomId, userId, newRole) {
        const socketId = this.socketUserMap[userId];
        if (!socketId)
            return;
        const socket = this.server.sockets.sockets.get(socketId);
        if (!socket || socket.data.roomId !== roomId)
            return;
        socket.data.role = newRole;
        socket.emit(action_1.ACTIONS.ROLE_CHANGED, {
            roomId,
            userId,
            newRole,
        });
        this.server.to(roomId).emit(action_1.ACTIONS.ROOM_UPDATED, {
            type: 'member_role_changed',
            userId,
            newRole,
        });
    }
    forceLeaveRoom(roomId, userId) {
        const socketId = this.socketUserMap[userId];
        if (!socketId)
            return;
        const socket = this.server.sockets.sockets.get(socketId);
        if (!socket || socket.data.roomId !== roomId)
            return;
        socket.emit(action_1.ACTIONS.MEMBER_REMOVED, {
            roomId,
            message: '您已被移出房间',
        });
        socket.leave(roomId);
        this.yDocService.unregisterClient(roomId, socketId);
        socket.data.roomId = undefined;
        socket.data.role = undefined;
        this.server.to(roomId).emit(action_1.ACTIONS.ROOM_UPDATED, {
            type: 'member_removed',
            userId,
        });
    }
    forceCloseRoom(roomId) {
        const adapter = this.server.sockets.adapter;
        const room = adapter.rooms.get(roomId);
        if (!room)
            return;
        const socketIds = Array.from(room);
        this.server.to(roomId).emit(action_1.ACTIONS.ROOM_UPDATED, {
            type: 'room_deleted',
            roomId,
            message: '房间已被删除',
        });
        for (const socketId of socketIds) {
            const socket = this.server.sockets.sockets.get(socketId);
            if (socket) {
                socket.leave(roomId);
                this.yDocService.unregisterClient(roomId, socketId);
                socket.data.roomId = undefined;
                socket.data.role = undefined;
            }
        }
    }
    toUint8Array(data) {
        if (data instanceof Uint8Array) {
            return data;
        }
        if (Array.isArray(data)) {
            return Uint8Array.from(data);
        }
        if (data instanceof ArrayBuffer) {
            return new Uint8Array(data);
        }
        return new Uint8Array(data);
    }
    emitError(client, code, message) {
        client.emit(action_1.ACTIONS.ERROR, { code, message });
    }
    getOnlineClientsInRoom(roomId) {
        const adapter = this.server.sockets.adapter;
        const room = adapter.rooms.get(roomId);
        const socketIds = room ? Array.from(room) : [];
        return socketIds.map((socketId) => {
            const socket = this.server.sockets.sockets.get(socketId);
            return {
                socketId,
                userId: socket?.data.user?.id,
                username: socket?.data.user?.username,
                avatarUrl: socket?.data.user?.githubAvatar,
                role: socket?.data.role,
            };
        });
    }
    validateRoomAccess(client, roomId) {
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
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)(action_1.ACTIONS.JOIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleJoin", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(action_1.ACTIONS.LEAVE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleLeave", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(action_1.ACTIONS.Y_SYNC),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleYSync", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(action_1.ACTIONS.Y_UPDATE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleYUpdate", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(action_1.ACTIONS.Y_AWARENESS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleYAwareness", null);
exports.ChatGateway = ChatGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: process.env.FRONTEND_URL
                ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
                : 'http://localhost:5173',
            credentials: true,
            methods: ['GET', 'POST'],
        },
    }),
    __metadata("design:paramtypes", [yjs_document_service_1.YjsDocumentService,
        room_service_1.RoomService,
        jwt_1.JwtService,
        config_1.ConfigService,
        auth_service_1.AuthService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map