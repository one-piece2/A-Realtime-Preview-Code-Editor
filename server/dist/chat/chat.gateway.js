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
let ChatGateway = class ChatGateway {
    yDocService;
    userSocketMap = {};
    server;
    constructor(yDocService) {
        this.yDocService = yDocService;
    }
    handleConnection(client) {
        if (Object.values(this.userSocketMap).includes(client.id)) {
            console.log('重复连接，忽略:', client.id);
            return;
        }
        console.log('客户端连接成功:', client.id);
    }
    getAllConnectedClients(roomId) {
        const adapter = this.server.sockets.adapter;
        const room = adapter.rooms.get(roomId);
        const ids = room ? Array.from(room) : [];
        return ids.map((socketId) => ({
            socketId,
            username: this.userSocketMap[socketId],
        }));
    }
    handleDisconnect(client) {
        const rooms = [...client.rooms];
        const username = this.userSocketMap[client.id];
        rooms.forEach((roomId) => {
            this.server.in(roomId).emit(action_1.ACTIONS.DISCONNECTED, {
                socketId: client.id,
                username,
            });
        });
        delete this.userSocketMap[client.id];
        rooms.forEach((roomId) => {
            client.leave(roomId);
            this.yDocService.unregisterClient(roomId, client.id);
        });
    }
    handleJoin(client, payload) {
        const { username, roomId, initialCode } = payload;
        for (const [oldSocketId, oldUsername] of Object.entries(this.userSocketMap)) {
            if (oldUsername === username && oldSocketId !== client.id) {
                console.log("踢掉旧连接:", oldSocketId);
                this.server.sockets.sockets.get(oldSocketId)?.disconnect(true);
                delete this.userSocketMap[oldSocketId];
            }
        }
        this.userSocketMap[client.id] = username;
        this.yDocService.registerClient(roomId, client.id);
        if (initialCode) {
            this.yDocService.initDocIfEmpty(roomId, initialCode);
        }
        client.join(roomId);
        const clients = this.getAllConnectedClients(roomId);
        this.server.to(roomId).emit(action_1.ACTIONS.JOINED, {
            clients,
            username,
            socketId: client.id,
        });
    }
    handleLeave(client, payload) {
        const { roomId } = payload;
        const username = this.userSocketMap[client.id];
        console.log(`用户 ${username} 请求离开房间 ${roomId}`);
        delete this.userSocketMap[client.id];
        client.leave(roomId);
        this.yDocService.unregisterClient(roomId, client.id);
        const allConernedClients = this.getAllConnectedClients(roomId);
        this.server.to(roomId).emit(action_1.ACTIONS.DISCONNECTED, {
            socketId: client.id,
            username,
            allConernedClients
        });
        console.log(`已通知房间 ${roomId} 中的其他客户端，${username} 已离开`);
    }
    handleCodeChange(client, payload) {
        const { roomId, code } = payload;
        if (this.getAllConnectedClients(roomId).length > 1) {
            client.to(roomId).emit(action_1.ACTIONS.CODE_CHANGE, { code });
        }
    }
    handleSyncCode(client, payload) {
        const { code, socketId } = payload;
        const codeValue = code || '';
        console.log(`同步代码给 ${socketId}:`, codeValue);
        this.server.to(socketId).emit(action_1.ACTIONS.CODE_CHANGE, { code: codeValue });
    }
    handleYSync(client, payload) {
        const { roomId, stateVector } = payload;
        this.yDocService.registerClient(roomId, client.id);
        const vector = stateVector ? this.toUint8Array(stateVector) : undefined;
        const update = this.yDocService.getStateAsUpdate(roomId, vector);
        client.emit(action_1.ACTIONS.Y_SYNC, {
            roomId,
            update,
            stateVector: this.yDocService.getStateVector(roomId),
        });
    }
    handleYUpdate(client, payload) {
        const { roomId, update } = payload;
        const normalizedUpdate = this.toUint8Array(update);
        this.yDocService.applyUpdate(roomId, normalizedUpdate);
        client.to(roomId).emit(action_1.ACTIONS.Y_UPDATE, {
            roomId,
            update: normalizedUpdate,
        });
    }
    handleYAwareness(client, payload) {
        const { roomId, update } = payload;
        const normalizedUpdate = this.toUint8Array(update);
        client.to(roomId).emit(action_1.ACTIONS.Y_AWARENESS, {
            roomId,
            update: normalizedUpdate,
        });
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
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)(action_1.ACTIONS.JOIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleJoin", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(action_1.ACTIONS.LEAVE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleLeave", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(action_1.ACTIONS.CODE_CHANGE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleCodeChange", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(action_1.ACTIONS.SYNC_CODE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleSyncCode", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(action_1.ACTIONS.Y_SYNC),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleYSync", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(action_1.ACTIONS.Y_UPDATE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleYUpdate", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(action_1.ACTIONS.Y_AWARENESS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleYAwareness", null);
exports.ChatGateway = ChatGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            credentials: true,
            methods: ['GET', 'POST'],
        },
    }),
    __metadata("design:paramtypes", [yjs_document_service_1.YjsDocumentService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map