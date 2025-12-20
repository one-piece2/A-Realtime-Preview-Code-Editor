import * as Y from 'yjs';
import type { Socket } from 'socket.io-client';
import { ACTIONS } from '../../../action';
import {
  Awareness,
  encodeAwarenessUpdate,
  applyAwarenessUpdate,
  removeAwarenessStates,
} from 'y-protocols/awareness'; // 引入 Awareness 以及编码/应用工具，用于光标、选区等同步
import { IndexeddbPersistence } from 'y-indexeddb';
import { type RoomRole } from '@/modules/room/types';
interface SocketIOProviderOptions {
  doc: Y.Doc; // 需要同步的 Y.Doc 实例
  roomId: string; // 房间标识，用于区分不同协同会话
  socket: Socket; // 已建立连接的 socket.io 客户端
  enablePersistence?: boolean; // 是否启用本地持久化
  token: string;
  role: RoomRole;
  onRoleChanged?: (role: RoomRole) => void;
  onError?: (code: string, message: string) => void;
}


//使用现有 socket.io 连接将 Yjs 文档同步到服务器的Provider

export class SocketIOProvider {
  public readonly awareness: Awareness; // 暴露 awareness，方便 UI 绑定光标/选区等协同状态
  private readonly doc: Y.Doc; // 缓存文档实例，便于后续读写
  private readonly roomId: string; // 当前协同房间 ID
  private readonly socket: Socket; // socket.io 实例
  private destroyed = false; // 标记是否已销毁，避免重复操作
  //本地持久化实例
  private persistence: IndexeddbPersistence | null = null;
  private role: RoomRole;
  private readonly onRoleChanged?: (role: RoomRole) => void;
  private readonly onError?: (code: string, message: string) => void;
  // 连接状态
  private _synced = false;
  private _connected = false;
  // 离线时写的待发送的更新队列
  private pendingUpdates: Uint8Array[] = [];

  // 推送本地更新到服务器
  private readonly handleDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === this || this.destroyed) {
      return;
    }
    // 检查是否有编辑权限
    if (this.role === 'viewer') {
      console.warn('[SocketIOProvider] viewer 角色无法发送更新');
      return;
    }

    // 如果在线且已连接，直接发送
    if (this._connected && this.socket.connected) {
      this.socket.emit(ACTIONS.Y_UPDATE, {
        roomId: this.roomId,
        update,
      });
    } else {
      // 离线时，将更新加入待发送队列
      this.pendingUpdates.push(update);
      console.log(`[SocketIOProvider] 离线中，更新已缓存 (${this.pendingUpdates.length} 条待发送)`);
    }
  };
  //处理从服务器返回的缺失更新
  private readonly handleSyncMessage = (payload: {
    roomId: string;
    update?: ArrayBuffer | Uint8Array | number[];
    role?: RoomRole;
  }) => {
    if (payload.roomId !== this.roomId || !payload.update) {
      return;
    }
    const update = this.toUint8Array(payload.update);
    Y.applyUpdate(this.doc, update, this); // 应用服务器返回的更新，同时将 origin 标记为当前 provider
    this._synced = true; // 标记同步完成
    console.log('[SocketIOProvider] 初始同步完成');

    // 更新角色 (如果服务端返回了)
    if (payload.role && payload.role !== this.role) {
      this.role = payload.role;
      this.onRoleChanged?.(payload.role);
    }
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
    this.role = options.role
    this.onRoleChanged = options.onRoleChanged
    this.onError = options.onError
    this.awareness = new Awareness(this.doc);
    //初始化本地持久化
    if (options.enablePersistence !== false) {
      this.initPersistence();
    }
    // 监听网络状态 挂载一些方法
    this.initConnectionListeners();

    //update事件自带两个参数：update和origin
    this.doc.on('update', this.handleDocUpdate); // 监听本地文档变更并上报给服务器
    //初始化事件监听
    this.initEventListeners();

    // 如果已连接 请求同步
    if (this.socket.connected) {
      this._connected = true;
      this.requestInitialSync();
    }

  }

  // 初始化本地持久化方法
  private initPersistence() {
    this.persistence = new IndexeddbPersistence(
      //IndexDB数据库的名称
      `yjs-doc-${this.roomId}`,
      this.doc
    );

    this.persistence.on('synced', () => {
      console.log(`[SocketIOProvider] 本地数据已恢复: ${this.roomId}`);
      //此时文档已从本地持久化恢复
    });
  }

  // 初始化连接监听方法 连接做什么 断开连接做什么 浏览器从离线恢复为在线做handleOnline  当浏览器失去网络连接时做handleOffline
  private initConnectionListeners() {
    this.socket.on('connect', this.handleConnect);
    this.socket.on('disconnect', this.handleDisconnect);

    if (typeof window !== 'undefined') {

      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }
  //事件监听初始化
  private initEventListeners() {
    //yjs
    this.socket.on(ACTIONS.Y_SYNC, this.handleSyncMessage); // 处理服务器返回的缺失更新
    this.socket.on(ACTIONS.Y_UPDATE, this.handleUpdateMessage); // 处理其他客户端的实时增量
    this.socket.on(ACTIONS.Y_AWARENESS, this.handleAwarenessMessage); // 处理其他客户端的光标/选区等协同状态

    // 用户事件
    this.socket.on(ACTIONS.DISCONNECTED, this.handleUserDisconnected);   // 监听用户断开连接事件，清理幽灵光标
    this.socket.on(ACTIONS.MEMBER_LEFT, this.handleUserDisconnected);

    // 新增: 权限事件
    this.socket.on(ACTIONS.ROLE_CHANGED, this.handleRoleChanged);
    this.socket.on(ACTIONS.MEMBER_REMOVED, this.handleMemberRemoved);
    this.socket.on(ACTIONS.ERROR, this.handleError);


    // 当本地 awareness 状态变化时（光标移动、选区变化、用户状态变化），编码并广播给房间内其他客户端
    this.awareness.on('update',
      this.handleAwarenessUpdate
    );
  }
  //处理awareness更新的事件
  private readonly handleAwarenessUpdate = ({
    added,
    updated,
    removed,
  }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
    if (this.destroyed) return;
    if (origin !== this) {
      const changedClients = added.concat(updated).concat(removed);
      if (changedClients.length === 0) return;
      const update = encodeAwarenessUpdate(this.awareness, changedClients);
      if (this._connected && this.socket.connected) {
        this.socket.emit(ACTIONS.Y_AWARENESS, {
          roomId: this.roomId,
          update,
        });
      }
    }
  };


  //主动向服务器请求当前房间的最新文档状态
  private requestInitialSync() {
    const stateVector = Y.encodeStateVector(this.doc); // 将当前文档状态编码
    this.socket.emit(ACTIONS.Y_SYNC, {
      roomId: this.roomId,
      stateVector,
    });
  }


  // 发送离线累积的更新
  private flushPendingUpdates() {
    if (this.pendingUpdates.length === 0) return;

    console.log(`[SocketIOProvider] 发送 ${this.pendingUpdates.length} 条离线更新`);

    // 合并所有待发送的更新为一个
    const mergedUpdate = Y.mergeUpdates(this.pendingUpdates);

    this.socket.emit(ACTIONS.Y_UPDATE, {
      roomId: this.roomId,
      update: mergedUpdate,
    });

    this.pendingUpdates = [];
  }
  // Getter
  get synced() {
    return this._synced;
  }

  get connected() {
    return this._connected;
  }
  get currentRole() { return this.role; }
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
        this.socket.off(ACTIONS.MEMBER_LEFT, this.handleUserDisconnected);
    this.socket.off(ACTIONS.ROLE_CHANGED, this.handleRoleChanged);
    this.socket.off(ACTIONS.MEMBER_REMOVED, this.handleMemberRemoved);
    this.socket.off(ACTIONS.ERROR, this.handleError);
    this.awareness.destroy();
    this.socket.off('connect', this.handleConnect);
    this.socket.off('disconnect', this.handleDisconnect);

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }

    this.persistence?.destroy();
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

  //连接成功处理
  private handleConnect = () => {
    console.log('[SocketIOProvider] Socket 已连接');
    //设置连接状态
    this._connected = true;
    this.joinRoom();
    // 重连后发送离线期间累积的更新
    this.flushPendingUpdates();

    // 请求服务器最新状态
    this.requestInitialSync();
  };
  // 断开连接处理
  private handleDisconnect = () => {
    console.log('[SocketIOProvider] Socket 已断开');
    this._connected = false;
    this._synced = false;
  };
  // 网络恢复处理
  private handleOnline = () => {
    console.log('[SocketIOProvider] 网络已恢复');
    if (!this.socket.connected) {
      //重新连接
      this.socket.connect();
    }
  };
  // 网络断开处理
  private handleOffline = () => {
    console.log('[SocketIOProvider] 网络已断开，进入离线模式');
  };

  //权限相关处理 
  private readonly handleRoleChanged = (payload: { roomId: string; role: RoomRole }) => {
    if (payload.roomId !== this.roomId) return;

    console.log(`[SocketIOProvider] 角色变更: ${this.role} -> ${payload.role}`);
    this.role = payload.role;
    this.onRoleChanged?.(payload.role);
  };

  private readonly handleMemberRemoved = (payload: { roomId: string; message: string }) => {
    if (payload.roomId !== this.roomId) return;

    console.log('[SocketIOProvider] 已被移出房间');
    this.onError?.('MEMBER_REMOVED', payload.message);
    this.destroy();
  };

  private readonly handleError = (payload: { code: string; message: string }) => {
    console.error('[SocketIOProvider] 错误:', payload);
    this.onError?.(payload.code, payload.message);
  };

  private joinRoom() {
    this.socket.emit(ACTIONS.JOIN, {
      roomId: this.roomId,
      // 不再传 username，服务端从 JWT 获取
    });
  }
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

