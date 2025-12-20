# Yjs 离线编辑 + 重连同步 技术文档

## 目录

1. [功能概述](#功能概述)
2. [核心原理](#核心原理)
3. [技术架构](#技术架构)
4. [实施步骤](#实施步骤)
5. [代码实现](#代码实现)
6. [测试验证](#测试验证)
7. [面试话术](#面试话术)

---

## 功能概述

### 目标

实现协同编辑器的离线编辑功能，让用户在网络断开时仍能继续编辑，重新连接后自动同步所有更改。

### 功能特性

| 特性 | 描述 |
|------|------|
| **离线编辑** | 网络断开后用户可继续编辑，操作不会丢失 |
| **本地持久化** | 文档自动保存到 IndexedDB，关闭浏览器后数据不丢失 |
| **自动重连** | 网络恢复后自动重新建立连接 |
| **增量同步** | 只同步离线期间的变更，而非整个文档 |
| **冲突自动解决** | 基于 CRDT 算法，多人离线编辑后自动合并 |
| **状态指示** | UI 显示当前连接状态（在线/离线/同步中） |

---

## 核心原理

### 1. CRDT (Conflict-free Replicated Data Type)

Yjs 基于 CRDT 算法，核心特性：

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CRDT 核心原理                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. 每个操作都有全局唯一 ID (clientID + clock)                           │
│  2. 操作可以以任意顺序到达，最终结果一致                                  │
│  3. 不需要中央服务器协调冲突                                             │
│                                                                         │
│  例如：用户 A 在位置 5 插入 "hello"，用户 B 在位置 5 插入 "world"        │
│       → 无论谁先到达，最终结果都是确定的（基于 clientID 排序）           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. 状态向量 (State Vector)

```typescript
// 状态向量记录每个客户端的操作计数
type StateVector = Map<clientID, clock>;

// 例如：
// { 
//   123456: 10,  // 客户端 123456 已执行 10 次操作
//   789012: 5    // 客户端 789012 已执行 5 次操作
// }
```

### 3. 离线同步流程

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          离线编辑时序图                                   │
└──────────────────────────────────────────────────────────────────────────┘

时间线 ──────────────────────────────────────────────────────────────────►

用户 A (在线)                    用户 B (离线)
    │                                │
    │  1. 正常编辑                    │  1. 断网
    │     Y.Doc 更新                  │     检测到 offline
    │     ↓                          │     ↓
    │  2. 发送 Y_UPDATE               │  2. 继续编辑
    │     到服务器                    │     Y.Doc 本地更新
    │                                │     ↓
    │                                │  3. 更新存入 IndexedDB
    │                                │     (持久化)
    │                                │
    │  ─────────── 用户 B 重新上线 ───────────
    │                                │
    │                                │  4. 从 IndexedDB 恢复 Y.Doc
    │                                │     ↓
    │                                │  5. 发送 Y_SYNC 请求
    │                                │     携带本地 stateVector
    │                                │     ↓
    │  6. 服务器计算差异              │
    │     返回 A 的更新               │
    │     ↓                          │
    │                                │  7. 应用服务器更新
    │                                │     Y.applyUpdate()
    │                                │     ↓
    │  8. 收到 B 的离线更新           │  8. 发送离线期间的更新
    │     Y.applyUpdate()            │     Y_UPDATE
    │                                │
    │  ═══════════ 双方文档一致 ═══════════
    │                                │
```

---

## 技术架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           客户端架构                                     │
│                                                                         │
│  ┌─────────────┐    ┌─────────────────┐    ┌─────────────────────────┐ │
│  │   Monaco    │◄──►│  MonacoBinding  │◄──►│        Y.Doc            │ │
│  │   Editor    │    │                 │    │                         │ │
│  └─────────────┘    └─────────────────┘    └───────────┬─────────────┘ │
│                                                        │               │
│                              ┌─────────────────────────┼───────────┐   │
│                              │                         │           │   │
│                              ▼                         ▼           │   │
│                     ┌─────────────────┐    ┌─────────────────────┐ │   │
│                     │ SocketIOProvider│    │  IndexeddbPersistence│ │   │
│                     │ (网络同步)       │    │  (本地持久化)        │ │   │
│                     └────────┬────────┘    └──────────┬──────────┘ │   │
│                              │                        │            │   │
│                              │                        ▼            │   │
│                              │              ┌─────────────────────┐│   │
│                              │              │     IndexedDB       ││   │
│                              │              │  (浏览器本地存储)    ││   │
│                              │              └─────────────────────┘│   │
│                              │                                     │   │
│                              │    ┌────────────────────────────┐   │   │
│                              │    │   ConnectionManager        │   │   │
│                              │    │   (连接状态管理)            │   │   │
│                              │    │   - 检测在线/离线           │   │   │
│                              │    │   - 自动重连               │   │   │
│                              │    │   - 同步队列管理           │   │   │
│                              │    └────────────────────────────┘   │   │
│                              │                                     │   │
└──────────────────────────────┼─────────────────────────────────────┘   │
                               │                                         │
                               ▼                                         │
┌─────────────────────────────────────────────────────────────────────────┐
│                           服务器架构                                     │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      ChatGateway                                   │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │ │
│  │  │ Y_SYNC       │  │ Y_UPDATE     │  │ 持久化存储 (可选)         │  │ │
│  │  │ 初始同步     │  │ 增量同步     │  │ PostgreSQL / Redis       │  │ │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                   YjsDocumentService                               │ │
│  │  rooms: Map<roomId, { doc: Y.Doc, clients: Set<string> }>          │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 数据流图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        离线 → 重连 数据流                                │
└─────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────────┐
                    │           用户编辑操作               │
                    └─────────────────┬───────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────────┐
                    │           Y.Doc 更新                │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────┴───────────────────┐
                    │                                     │
                    ▼                                     ▼
        ┌───────────────────────┐           ┌───────────────────────┐
        │   IndexeddbPersistence │           │   SocketIOProvider    │
        │   (自动持久化)         │           │   (网络同步)          │
        └───────────┬───────────┘           └───────────┬───────────┘
                    │                                   │
                    ▼                                   │
        ┌───────────────────────┐                       │
        │      IndexedDB        │                       │
        │   (浏览器本地存储)     │                       │
        └───────────────────────┘                       │
                                                        │
                              ┌──────────────────────────┤
                              │                          │
                              ▼                          ▼
                    ┌─────────────────┐      ┌─────────────────┐
                    │   在线？        │      │   离线？        │
                    │   ↓             │      │   ↓             │
                    │   发送 Y_UPDATE │      │   加入队列      │
                    │   到服务器      │      │   pendingUpdates│
                    └─────────────────┘      └────────┬────────┘
                                                      │
                                                      │ 重连后
                                                      ▼
                                          ┌─────────────────────┐
                                          │  flushPendingUpdates│
                                          │  合并并发送所有更新  │
                                          └─────────────────────┘
```

---

## 实施步骤

### 步骤 1：安装依赖

```bash
cd client
npm install y-indexeddb
```

### 步骤 2：修改 SocketIOProvider

修改文件：`client/src/yjs/socket-provider.ts`

**主要改动：**

1. 添加 `IndexeddbPersistence` 本地持久化
2. 添加连接状态管理
3. 添加离线更新队列
4. 添加重连同步逻辑

### 步骤 3：修改 Editor 组件

修改文件：`client/src/components/Editor.tsx`

**主要改动：**

1. 传递 `enablePersistence` 参数
2. 添加连接状态 UI 指示器

### 步骤 4：测试验证

1. 打开两个浏览器窗口进入同一房间
2. 断开其中一个的网络
3. 两边分别编辑
4. 恢复网络，验证同步

---

## 代码实现

### 1. 修改后的 SocketIOProvider

```typescript
// client/src/yjs/socket-provider.ts

import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import type { Socket } from 'socket.io-client';
import { ACTIONS } from '../action';
import {
  Awareness,
  encodeAwarenessUpdate,
  applyAwarenessUpdate,
  removeAwarenessStates,
} from 'y-protocols/awareness';

interface SocketIOProviderOptions {
  doc: Y.Doc;
  roomId: string;
  socket: Socket;
  enablePersistence?: boolean; // 是否启用本地持久化
}

export class SocketIOProvider {
  public readonly awareness: Awareness;
  private readonly doc: Y.Doc;
  private readonly roomId: string;
  private readonly socket: Socket;
  private destroyed = false;
  
  // 新增：本地持久化实例
  private persistence: IndexeddbPersistence | null = null;
  // 新增：连接状态
  private _synced = false;
  private _connected = false;
  
  // 新增：待发送的更新队列（离线时累积）
  private pendingUpdates: Uint8Array[] = [];

  // 推送本地更新到服务器（修改版）
  private readonly handleDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === this || this.destroyed) {
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

  // 处理从服务器返回的缺失更新
  private readonly handleSyncMessage = (payload: {
    roomId: string;
    update?: ArrayBuffer | Uint8Array | number[];
  }) => {
    if (payload.roomId !== this.roomId || !payload.update) {
      return;
    }
    const update = this.toUint8Array(payload.update);
    Y.applyUpdate(this.doc, update, this);
    this._synced = true;
    console.log('[SocketIOProvider] 初始同步完成');
  };

  private readonly handleUpdateMessage = (payload: {
    roomId: string;
    update: ArrayBuffer | Uint8Array | number[];
  }) => {
    if (payload.roomId !== this.roomId) {
      return;
    }
    const update = this.toUint8Array(payload.update);
    Y.applyUpdate(this.doc, update, this);
  };

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

  // 处理用户断开连接，清理幽灵光标
  private readonly handleUserDisconnected = (payload: { socketId: string; username: string }) => {
    if (this.destroyed) return;
    const states = this.awareness.getStates();
    const clientsToRemove: number[] = [];
    states.forEach((state, clientId) => {
      if (clientId === this.awareness.clientID) return;
      if (state.user?.name === payload.username) {
        clientsToRemove.push(clientId);
      }
    });
    if (clientsToRemove.length > 0) {
      removeAwarenessStates(this.awareness, clientsToRemove, this);
      console.log(`[SocketIOProvider] 清理幽灵光标: ${payload.username}`);
    }
  };

  // 新增：连接成功处理
  private handleConnect = () => {
    console.log('[SocketIOProvider] Socket 已连接');
    this._connected = true;
    
    // 重连后发送离线期间累积的更新
    this.flushPendingUpdates();
    
    // 请求服务器最新状态
    this.requestInitialSync();
  };

  // 新增：断开连接处理
  private handleDisconnect = () => {
    console.log('[SocketIOProvider] Socket 已断开');
    this._connected = false;
    this._synced = false;
  };

  // 新增：网络恢复处理
  private handleOnline = () => {
    console.log('[SocketIOProvider] 网络已恢复');
    if (!this.socket.connected) {
      this.socket.connect();
    }
  };

  // 新增：网络断开处理
  private handleOffline = () => {
    console.log('[SocketIOProvider] 网络已断开，进入离线模式');
  };

  constructor(options: SocketIOProviderOptions) {
    this.doc = options.doc;
    this.roomId = options.roomId;
    this.socket = options.socket;

    this.awareness = new Awareness(this.doc);
    
    // 1. 初始化本地持久化
    if (options.enablePersistence !== false) {
      this.initPersistence();
    }
    
    // 2. 监听网络状态
    this.initConnectionListeners();
    
    // 3. 监听文档更新
    this.doc.on('update', this.handleDocUpdate);
    
    // 4. 监听服务器消息
    this.socket.on(ACTIONS.Y_SYNC, this.handleSyncMessage);
    this.socket.on(ACTIONS.Y_UPDATE, this.handleUpdateMessage);
    this.socket.on(ACTIONS.Y_AWARENESS, this.handleAwarenessMessage);
    this.socket.on(ACTIONS.DISCONNECTED, this.handleUserDisconnected);
    
    // 5. 监听 awareness 变化
    this.awareness.on('update', ({
      added,
      updated,
      removed,
    }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
      if (this.destroyed) return;
      if (origin !== this) {
        const changedClients = added.concat(updated).concat(removed);
        if (changedClients.length === 0) return;
        const update = encodeAwarenessUpdate(this.awareness, changedClients);
        
        // 只有在线时才发送 awareness
        if (this._connected && this.socket.connected) {
          this.socket.emit(ACTIONS.Y_AWARENESS, {
            roomId: this.roomId,
            update,
          });
        }
      }
    });
    
    // 6. 如果已连接，立即请求同步
    if (this.socket.connected) {
      this._connected = true;
      this.requestInitialSync();
    }
  }

  // 初始化本地持久化
  private initPersistence() {
    this.persistence = new IndexeddbPersistence(
      `yjs-doc-${this.roomId}`,
      this.doc
    );
    
    this.persistence.on('synced', () => {
      console.log(`[SocketIOProvider] 本地数据已恢复: ${this.roomId}`);
    });
  }

  // 初始化连接监听
  private initConnectionListeners() {
    this.socket.on('connect', this.handleConnect);
    this.socket.on('disconnect', this.handleDisconnect);
    
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
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

  // 请求初始同步
  private requestInitialSync() {
    const stateVector = Y.encodeStateVector(this.doc);
    this.socket.emit(ACTIONS.Y_SYNC, {
      roomId: this.roomId,
      stateVector,
    });
  }

  // 销毁
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
    this.socket.off('connect', this.handleConnect);
    this.socket.off('disconnect', this.handleDisconnect);
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    
    this.persistence?.destroy();
    this.awareness.destroy();
  }

  // Getter
  get synced() {
    return this._synced;
  }

  get connected() {
    return this._connected;
  }

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
```

### 2. Editor 组件连接状态指示器

```tsx
// 在 Editor.tsx 中添加

// 1. 添加状态
const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'syncing'>('online');

// 2. 监听状态变化
useEffect(() => {
  const provider = providerRef.current;
  if (!provider) return;

  const updateStatus = () => {
    if (!provider.connected) {
      setConnectionStatus('offline');
    } else if (!provider.synced) {
      setConnectionStatus('syncing');
    } else {
      setConnectionStatus('online');
    }
  };

  const interval = setInterval(updateStatus, 1000);
  return () => clearInterval(interval);
}, []);

// 3. 在 JSX 中添加状态指示器
<div className="absolute top-2 right-2 flex items-center gap-2 z-50">
  <div className={cn(
    "w-2 h-2 rounded-full",
    connectionStatus === 'online' && "bg-green-500",
    connectionStatus === 'offline' && "bg-red-500",
    connectionStatus === 'syncing' && "bg-yellow-500 animate-pulse",
  )} />
  <span className="text-xs text-muted-foreground">
    {connectionStatus === 'online' && '已同步'}
    {connectionStatus === 'offline' && '离线编辑中'}
    {connectionStatus === 'syncing' && '同步中...'}
  </span>
</div>
```

---

## 测试验证

### 测试场景 1：基本离线编辑

1. 打开编辑器，正常编辑一些内容
2. 打开浏览器开发者工具 → Network → 勾选 "Offline"
3. 继续编辑内容
4. 取消 "Offline"
5. **预期结果**：离线期间的编辑自动同步到服务器

### 测试场景 2：多人离线冲突

1. 用户 A 和用户 B 同时进入房间
2. 用户 B 断开网络
3. 用户 A 在第 1 行输入 "AAA"
4. 用户 B 在第 1 行输入 "BBB"
5. 用户 B 恢复网络
6. **预期结果**：两人的编辑都保留，自动合并（如 "AAABBB" 或 "BBBAAA"）

### 测试场景 3：关闭浏览器后恢复

1. 在编辑器中输入内容
2. 断开网络
3. 继续编辑
4. 关闭浏览器标签页
5. 重新打开同一房间
6. **预期结果**：离线编辑的内容从 IndexedDB 恢复

### 测试场景 4：长时间离线

1. 断开网络
2. 编辑大量内容（100+ 次操作）
3. 恢复网络
4. **预期结果**：所有操作合并为一次更新发送，同步成功

---

## 面试话术

### 问题 1：如何实现离线编辑？

> "离线编辑功能基于 Yjs 的 CRDT 特性实现：
> 
> 1. **本地持久化**：使用 `y-indexeddb` 将 Y.Doc 自动同步到 IndexedDB，即使关闭浏览器数据也不会丢失
> 
> 2. **离线编辑**：断网时用户可以继续编辑，所有操作都会记录在本地 Y.Doc 中，同时缓存到待发送队列
> 
> 3. **重连同步**：网络恢复后，通过 `Y.mergeUpdates` 合并离线期间的所有更新，一次性发送给服务器
> 
> 4. **冲突解决**：由于 CRDT 的特性，即使多个用户在离线时编辑了同一位置，重连后也能自动合并，无需手动解决冲突"

### 问题 2：CRDT 如何解决冲突？

> "Yjs 使用的是基于位置的 CRDT，每个字符都有一个全局唯一的 ID，由 `clientID` 和 `clock` 组成。
> 
> 当两个用户在同一位置插入内容时，系统会根据 `clientID` 的大小来决定顺序，确保所有客户端最终得到相同的结果。
> 
> 这种方式的优点是：
> - 不需要中央服务器协调
> - 操作可以以任意顺序到达
> - 最终一致性有数学证明保证"

### 问题 3：为什么选择 IndexedDB？

> "选择 IndexedDB 是因为：
> 
> 1. **容量大**：可存储数百 MB 数据，远超 localStorage 的 5MB 限制
> 2. **异步 API**：不会阻塞主线程
> 3. **事务支持**：保证数据一致性
> 4. **y-indexeddb 集成**：Yjs 官方提供了现成的 IndexedDB 适配器，开箱即用"

---

## 相关文件

| 文件 | 描述 |
|------|------|
| `client/src/yjs/socket-provider.ts` | Yjs 网络同步 Provider |
| `client/src/components/Editor.tsx` | Monaco 编辑器组件 |
| `server/src/chat/chat.gateway.ts` | WebSocket 网关 |
| `server/src/chat/yjs-document.service.ts` | Yjs 文档服务 |

---

## 参考资料

- [Yjs 官方文档](https://docs.yjs.dev/)
- [y-indexeddb](https://github.com/yjs/y-indexeddb)
- [CRDT 论文](https://hal.inria.fr/inria-00555588/document)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
