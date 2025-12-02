"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var YjsDocumentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.YjsDocumentService = void 0;
const common_1 = require("@nestjs/common");
const Y = __importStar(require("yjs"));
let YjsDocumentService = YjsDocumentService_1 = class YjsDocumentService {
    logger = new common_1.Logger(YjsDocumentService_1.name);
    rooms = new Map();
    registerClient(roomId, clientId) {
        const room = this.ensureRoom(roomId);
        room.clients.add(clientId);
        return room.doc;
    }
    unregisterClient(roomId, clientId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return;
        }
        room.clients.delete(clientId);
        if (room.clients.size === 0) {
            room.doc.destroy();
            this.rooms.delete(roomId);
            this.logger.log(`Destroyed Y.Doc for room ${roomId}`);
        }
    }
    applyUpdate(roomId, update) {
        const room = this.ensureRoom(roomId);
        Y.applyUpdate(room.doc, update);
    }
    getStateVector(roomId) {
        const room = this.ensureRoom(roomId);
        return Y.encodeStateVector(room.doc);
    }
    getStateAsUpdate(roomId, stateVector) {
        const room = this.ensureRoom(roomId);
        const vector = stateVector ?? Y.encodeStateVector(room.doc);
        return Y.encodeStateAsUpdate(room.doc, vector);
    }
    initDocIfEmpty(roomId, initialCode) {
        if (!initialCode)
            return;
        const room = this.ensureRoom(roomId);
        const yText = room.doc.getText('monaco');
        if (yText.length === 0) {
            yText.insert(0, initialCode);
            this.logger.log(`Initialized Y.Doc for room ${roomId} with initial code`);
        }
    }
    ensureRoom(roomId) {
        let room = this.rooms.get(roomId);
        if (!room) {
            room = {
                doc: new Y.Doc(),
                clients: new Set(),
            };
            this.rooms.set(roomId, room);
            this.logger.log(`Created Y.Doc for room ${roomId}`);
        }
        return room;
    }
};
exports.YjsDocumentService = YjsDocumentService;
exports.YjsDocumentService = YjsDocumentService = YjsDocumentService_1 = __decorate([
    (0, common_1.Injectable)()
], YjsDocumentService);
//# sourceMappingURL=yjs-document.service.js.map