import { Injectable, Logger } from '@nestjs/common'; // 引入 NestJS 注入装饰器与日志工具用于声明服务与打印信息
import * as Y from 'yjs'; // 引入 Yjs 核心，用于创建与操作协同文档

interface RoomDoc {
  doc: Y.Doc; // 当前房间对应的 Y.Doc 文档实例
  clients: Set<string>; // 记录在该房间内活跃的 socket 客户端 ID 集合
}

@Injectable()
export class YjsDocumentService {
  private readonly logger = new Logger(YjsDocumentService.name); // 初始化日志实例，便于跟踪房间文档生命周期
  // roomId--->RoomDoc
  private readonly rooms = new Map<string, RoomDoc>(); // 使用 Map 存储 roomId 到 RoomDoc 的映射
//作用：注册客户端到房间
  registerClient(roomId: string, clientId: string): Y.Doc {
    const room = this.ensureRoom(roomId); // 若房间不存在则创建，确保拿到 RoomDoc
    room.clients.add(clientId); // 将当前客户端 ID 记录到房间成员列表
    return room.doc; // 返回房间对应的 Y.Doc 供调用方使用
  }

  unregisterClient(roomId: string, clientId: string) {
    const room = this.rooms.get(roomId); // 取出对应的 RoomDoc
    if (!room) {
      return; // 房间不存在时直接跳过
    }
    room.clients.delete(clientId); // 从房间成员集合中移除该客户端
    if (room.clients.size === 0) {
      room.doc.destroy(); // 当房间内无任何客户端时销毁 Y.Doc 释放内存
      this.rooms.delete(roomId); // 从 Map 中移除房间记录
      this.logger.log(`Destroyed Y.Doc for room ${roomId}`); // 打印日志方便排查
    }
  }
//作用：应用增量更新到房间文档
  applyUpdate(roomId: string, update: Uint8Array) {
    const room = this.ensureRoom(roomId); // 确保房间与文档存在
    Y.applyUpdate(room.doc, update); // 将增量更新应用到房间文档
  }
//作用：获取房间文档状态向量，用于客户端同步
  getStateVector(roomId: string): Uint8Array {
    const room = this.ensureRoom(roomId); // 确保房间文档存在
    return Y.encodeStateVector(room.doc); // 返回当前文档状态向量以告知客户端已有内容
  }
//作用：获取房间文档缺失的更新内容，用于客户端同步
  getStateAsUpdate(roomId: string, stateVector?: Uint8Array): Uint8Array {
    const room = this.ensureRoom(roomId); // 确保房间文档存在
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
    let room = this.rooms.get(roomId); // 查找现有的 RoomDoc
    if (!room) {
      room = {
        doc: new Y.Doc(), // 创建全新的 Y.Doc 文档实例
        clients: new Set(), // 初始化房间成员集合
      };
      this.rooms.set(roomId, room); // 将新房间注册到 Map
      this.logger.log(`Created Y.Doc for room ${roomId}`); // 打印日志记录
    }
    return room; // 返回保证存在的 RoomDoc
  }
}

