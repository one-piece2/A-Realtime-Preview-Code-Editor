import * as Y from 'yjs'; 
import type { Socket } from 'socket.io-client'; 
import { ACTIONS } from '../action'; 
import {
  Awareness,
  encodeAwarenessUpdate,
  applyAwarenessUpdate,
  removeAwarenessStates,
} from 'y-protocols/awareness'; // 引入 Awareness 以及编码/应用工具，用于光标、选区等同步

interface SocketIOProviderOptions {
  doc: Y.Doc; // 需要同步的 Y.Doc 实例
  roomId: string; // 房间标识，用于区分不同协同会话
  socket: Socket; // 已建立连接的 socket.io 客户端
}


 //使用现有 socket.io 连接将 Yjs 文档同步到服务器的Provider
 
export class SocketIOProvider {
  public readonly awareness: Awareness; // 暴露 awareness，方便 UI 绑定光标/选区等协同状态
  private readonly doc: Y.Doc; // 缓存文档实例，便于后续读写
  private readonly roomId: string; // 当前协同房间 ID
  private readonly socket: Socket; // socket.io 实例
  private destroyed = false; // 标记是否已销毁，避免重复操作

  // 推送本地更新到服务器
  private readonly handleDocUpdate = (update: Uint8Array, origin: unknown) => {
    //如果origin是当前provider或者已销毁，则不推送
    if (origin === this || this.destroyed) {
      return; 
    }
    
    this.socket.emit(ACTIONS.Y_UPDATE, {
      roomId: this.roomId,
      update,
    });
  };
//处理从服务器返回的缺失更新
  private readonly handleSyncMessage = (payload: {
    roomId: string;
    update?: ArrayBuffer | Uint8Array | number[];
  }) => {
    if (payload.roomId !== this.roomId || !payload.update) {
      return;
    }
    const update = this.toUint8Array(payload.update);
    Y.applyUpdate(this.doc, update, this); // 应用服务器返回的更新，同时将 origin 标记为当前 provider
  };

  private readonly handleUpdateMessage = (payload: {
    roomId: string;
    update: ArrayBuffer | Uint8Array | number[];
  }) => {
    if (payload.roomId !== this.roomId) {
      return;
    }
    const update = this.toUint8Array(payload.update);
    Y.applyUpdate(this.doc, update, this); // 将其他客户端的增量更新应用到本地文档
  };

  // 处理从服务器广播回来的 awareness 更新
  private readonly handleAwarenessMessage = (payload: {
    roomId: string;
    update: ArrayBuffer | Uint8Array | number[];
  }) => {
    if (payload.roomId !== this.roomId) {
      return;
    }
    const update = this.toUint8Array(payload.update);
    applyAwarenessUpdate(this.awareness, update, this);
  };

  constructor(options: SocketIOProviderOptions) {
    this.doc = options.doc;
    this.roomId = options.roomId;
    this.socket = options.socket;

    this.awareness = new Awareness(this.doc); 
    //update事件自带两个参数：update和origin
    this.doc.on('update', this.handleDocUpdate); // 监听本地文档变更并上报给服务器
    this.socket.on(ACTIONS.Y_SYNC, this.handleSyncMessage); // 处理服务器返回的缺失更新
    this.socket.on(ACTIONS.Y_UPDATE, this.handleUpdateMessage); // 处理其他客户端的实时增量
    this.socket.on(ACTIONS.Y_AWARENESS, this.handleAwarenessMessage); // 处理其他客户端的光标/选区等协同状态

    // 当本地 awareness 状态变化时（光标移动、选区变化、用户状态变化），编码并广播给房间内其他客户端
    this.awareness.on('update', ({
      added,
      updated,
      removed,
    }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
      if (this.destroyed) return;
    //作用：只有当origin不是当前provider时才广播，避免循环广播
      if(origin !== this) {
        const changedClients = added.concat(updated).concat(removed);
        if (changedClients.length === 0) return;
        const update = encodeAwarenessUpdate(this.awareness, changedClients);
        this.socket.emit(ACTIONS.Y_AWARENESS, {
          roomId: this.roomId,
          update,
        });
      }
    });

    // 监听用户断开连接事件，清理幽灵光标
    this.socket.on(ACTIONS.DISCONNECTED, this.handleUserDisconnected);

    this.requestInitialSync(); // 构造完成后立即请求一次状态同步
  }
  
  
   //主动向服务器请求当前房间的最新文档状态
  private requestInitialSync() {
    const stateVector = Y.encodeStateVector(this.doc); // 将当前文档状态编码
    this.socket.emit(ACTIONS.Y_SYNC, {
      roomId: this.roomId,
      stateVector,
    });
  }

  
   // 释放事件监听，防止内存泄漏
   
  destroy() {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.doc.off('update', this.handleDocUpdate);
    this.socket.off(ACTIONS.Y_SYNC, this.handleSyncMessage);
    this.socket.off(ACTIONS.Y_UPDATE, this.handleUpdateMessage);
    this.socket.off(ACTIONS.Y_AWARENESS, this.handleAwarenessMessage);
    this.socket.off(ACTIONS.DISCONNECTED, this.handleUserDisconnected);
    this.awareness.destroy();
  }

  
 // 处理用户断开连接，清理幽灵光标
  private readonly handleUserDisconnected = (payload: { socketId: string; username: string }) => {
    if (this.destroyed) return;
    
    // 遍历所有 awareness 状态，找到并移除断开连接用户的状态
    const states = this.awareness.getStates();
    const clientsToRemove: number[] = [];
    
    states.forEach((state, clientId) => {
      // 跳过本地用户
      if (clientId === this.awareness.clientID) return;
      
      // 检查用户名是否匹配
      if (state.user?.name === payload.username) {
        clientsToRemove.push(clientId);
      }
    });
    
    // 移除断开连接用户的 awareness 状态
    if (clientsToRemove.length > 0) {
      removeAwarenessStates(this.awareness, clientsToRemove, this);
      console.log(`[SocketIOProvider] 清理幽灵光标: ${payload.username}, clientIds:`, clientsToRemove);
    }
  };

  //将不同类型的二进制数据统一转换成 Uint8Array
  private toUint8Array(
    data: ArrayBuffer | Uint8Array | number[] | Buffer,
  ): Uint8Array {
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
}

