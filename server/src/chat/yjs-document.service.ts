import { Injectable, Logger } from '@nestjs/common'; 
import * as Y from 'yjs'; 

interface RoomDoc {
  doc: Y.Doc; 
  clients: Set<string>; // 记录在该房间内 socket 客户端 ID 集合
}

@Injectable()
export class YjsDocumentService {
  private readonly logger = new Logger(YjsDocumentService.name); 
  // roomId--->RoomDoc
  private readonly rooms = new Map<string, RoomDoc>(); 
//作用：注册客户端到房间
  registerClient(roomId: string, clientId: string): Y.Doc {
    const room = this.ensureRoom(roomId); 
    room.clients.add(clientId); 
    return room.doc; 
  }

  unregisterClient(roomId: string, clientId: string) {
    const room = this.rooms.get(roomId); 
    if (!room) {
      return; 
    }
    room.clients.delete(clientId); 
    if (room.clients.size === 0) {
      room.doc.destroy(); 
      this.rooms.delete(roomId); 
      this.logger.log(`Destroyed Y.Doc for room ${roomId}`); // 打印日志方便排查
    }
  }
//应用增量更新到房间文档
  applyUpdate(roomId: string, update: Uint8Array) {
    const room = this.ensureRoom(roomId); 
    Y.applyUpdate(room.doc, update); 
  }
//获取房间文档状态向量，用于客户端同步
  getStateVector(roomId: string): Uint8Array {
    const room = this.ensureRoom(roomId); 
    return Y.encodeStateVector(room.doc); 
  }
//获取房间文档缺失的更新内容，用于客户端同步
  getStateAsUpdate(roomId: string, stateVector?: Uint8Array): Uint8Array {
    const room = this.ensureRoom(roomId); 
    const vector = stateVector ?? Y.encodeStateVector(room.doc); // 若调用方未提供状态向量则使用最新状态
    return Y.encodeStateAsUpdate(room.doc, vector); // 计算出客户端缺失的更新内容
  }

  /**
   * 如果房间文档目前还是空的，就用一段初始代码来进行一次性初始化
   * - 只在 yText 长度为 0 时插入，避免后续用户重复覆盖已有内容
   * @param roomId 房间 ID
   * @param initialCode 初始代码字符串
   */
  initDocIfEmpty(roomId: string, initialCode: string) {
    if (!initialCode) return; // 没有初始内容则直接跳过
    const room = this.ensureRoom(roomId); // 拿到房间文档
    const yText = room.doc.getText('monaco'); // 与前端 MonacoBinding 使用的名称保持一致
    if (yText.length === 0) {
      yText.insert(0, initialCode); // 文档当前为空时写入模板代码
      this.logger.log(`Initialized Y.Doc for room ${roomId} with initial code`);
    }
  }
/**
 * 确保房间文档存在
 * @param roomId 房间ID
 * @returns RoomDoc
 */
  private ensureRoom(roomId: string): RoomDoc {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        doc: new Y.Doc(), 
        clients: new Set(), 
      };
      this.rooms.set(roomId, room); // 将新房间注册到 Map
      this.logger.log(`Created Y.Doc for room ${roomId}`);
    }
    return room; 
  }
}

