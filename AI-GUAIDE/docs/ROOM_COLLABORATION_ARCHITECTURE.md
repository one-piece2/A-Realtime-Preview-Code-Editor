# 房间与协作模块架构文档

## 目录

- [1. 模块概述](#1-模块概述)
- [2. 目录结构](#2-目录结构)
- [3. Room 模块详解](#3-room-模块详解)
- [4. Collaboration 模块详解](#4-collaboration-模块详解)
- [5. Socket 连接管理](#5-socket-连接管理)
- [6. 权限控制体系](#6-权限控制体系)
- [7. 数据流图](#7-数据流图)
- [8. 模块协作关系](#8-模块协作关系)
- [9. 关键流程详解](#9-关键流程详解)
- [10. 注意事项与最佳实践](#10-注意事项与最佳实践)

---

## 1. 模块概述

### 1.1 设计理念

本项目采用 **分层架构** 设计，遵循以下原则：

```
UI 组件 → Hooks → Store → Service/API
```

| 层级 | 职责 | 示例 |
|------|------|------|
| **UI 组件** | 渲染界面，响应用户操作 | `RoomPage.tsx` |
| **Hooks** | 组合 Store 和 Service，提供业务逻辑 | `useCurrentRoom()` |
| **Store** | 状态管理，数据持久化 | `useRoomStore` |
| **Service** | 纯函数、工具函数 | `canEdit()`, `getRoleDisplayName()` |
| **API** | HTTP 请求封装 | `roomApi.createRoom()` |

### 1.2 核心模块

| 模块 | 路径 | 职责 |
|------|------|------|
| **Room** | `client/src/modules/room/` | 房间管理、成员管理、权限 UI |
| **Collaboration** | `client/src/modules/collaboration/` | 实时协作、Yjs 同步、光标渲染 |
| **Socket** | `client/src/api/socket.ts` | WebSocket 连接管理（单例） |

---

## 2. 目录结构

```
client/src/
├── api/
│   ├── socket.ts              # Socket.IO 单例管理
│   └── room/
│       └── api.ts             # Room REST API 封装
│
├── modules/
│   ├── room/                  # 房间模块
│   │   ├── types.ts           # 类型定义
│   │   ├── store.ts           # Zustand Store
│   │   ├── hooks.ts           # React Hooks
│   │   └── service.ts         # 纯函数/工具
│   │
│   ├── collaboration/         # 协作模块
│   │   ├── types.ts           # 类型定义
│   │   ├── store.ts           # Zustand Store
│   │   ├── hooks.ts           # React Hooks
│   │   ├── services.ts        # 纯函数/工具
│   │   └── yjs/
│   │       └── socket-provider.ts  # Yjs Socket 同步 Provider
│   │
│   └── auth/                  # 认证模块
│       └── store.ts           # 用户认证状态
│
├── core/
│   └── store/
│       └── registry.ts        # 全局 Store 注册中心
│
└── action.ts                  # WebSocket 事件常量
```

---

## 3. Room 模块详解

### 3.1 类型定义 (`types.ts`)

```typescript
// 角色类型
export type RoomRole = 'owner' | 'editor' | 'viewer';

// 房间信息
export interface Room {
  roomId: string;
  name: string;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
}

// 房间成员
export interface RoomMember {
  odId: string
  odName: string
  odEmail: string
  role: RoomRole;
  joinedAt: string;
}

// 房间状态
export interface RoomState {
  currentRoom: Room | null;      // 当前房间
  myRole: RoomRole | null;       // 我的角色
  members: RoomMember[];         // 成员列表
  ownedRooms: Room[];            // 我创建的房间
  joinedRooms: Room[];           // 我加入的房间
  isLoading: boolean;
  error: string | null;
}
```

### 3.2 Store (`store.ts`)

```typescript
export const useRoomStore = create<RoomStore>()(
  devtools(
    (set, get) => ({
      // 初始状态
      currentRoom: null,
      myRole: null,
      members: [],
      ownedRooms: [],
      joinedRooms: [],
      isLoading: false,
      error: null,

      // 房间操作
      createRoom: async (params) => { ... },
      fetchRoom: async (roomId) => { ... },
      updateRoom: async (roomId, params) => { ... },
      deleteRoom: async (roomId) => { ... },
      joinRoom: async (roomId) => { ... },
      leaveRoom: async (roomId) => { ... },

      // 成员操作
      updateMemberRole: async (roomId, userId, role) => { ... },
      removeMember: async (roomId, userId) => { ... },

      // 状态操作
      setCurrentRoom: (room, role) => { ... },
      setMembers: (members) => { ... },
      updateMyRole: (role) => { ... },
      reset: () => { ... },
    }),
    { name: 'room-store' }
  )
);

// 选择器
export const roomSelectors = {
  currentRoom: (state) => state.currentRoom,
  myRole: (state) => state.myRole,
  members: (state) => state.members,
  canEdit: (state) => state.myRole === 'owner' || state.myRole === 'editor',
  isOwner: (state) => state.myRole === 'owner',
};
```

### 3.3 Hooks (`hooks.ts`)

| Hook | 用途 | 返回值 |
|------|------|--------|
| `useCurrentRoom()` | 获取当前房间信息 | `{ currentRoom, myRole, members, canEdit, isOwner }` |
| `useRoomActions()` | 房间操作方法 | `{ createRoom, fetchRoom, updateRoom, deleteRoom, joinRoom, leaveRoom }` |
| `useMemberActions()` | 成员管理方法 | `{ updateMemberRole, removeMember, canManageMembers }` |
| `useMyRooms()` | 我的房间列表（自动加载） | `{ ownedRooms, joinedRooms, isLoading, error, refresh }` |
| `useEnterRoom(roomId)` | 进入房间（自动加载详情） | `{ isLoading, error }` |

### 3.4 Service (`service.ts`)

```typescript
// 权限判断（纯函数）
export function canEdit(role: RoomRole | null): boolean;
export function isOwner(role: RoomRole | null): boolean;

// UI 辅助
export function getRoleDisplayName(role: RoomRole): string;  // '房主' | '编辑者' | '观察者'
export function getRoleColor(role: RoomRole): string;        // 颜色代码
export function sortMembersByRole(members: RoomMember[]): RoomMember[];

// 工具函数
export function generateShareLink(roomId: string): string;
export function copyToClipboard(text: string): Promise<boolean>;
export function formatJoinedTime(dateString: string): string;

// WebSocket 事件 Payload 类型
export interface RoleChangedPayload { roomId: string; userId: string; newRole: RoomRole; }
export interface MemberJoinedPayload { userId: string; username: string; socketId: string; }
export interface MemberLeftPayload { userId: string; username: string; socketId: string; }
export interface MemberRemovedPayload { roomId: string; userId: string; message: string; }
```

---

## 4. Collaboration 模块详解

### 4.1 类型定义 (`types.ts`)

```typescript
// 协作用户
export interface CollaborationUser {
  name: string;
  avatarUrl: string;
  color: string;
  awarenessId?: number;
  role?: RoomRole;
}

// 远端光标
export interface RemoteCursor {
  name: string;
  avatarUrl: string;
  color: string;
  top: number;
  left: number;
  lineHeight: number;
  clientId: string;
  selection: SelectionRange[] | null;
}

// 连接状态
export type ConnectionStatus = 'online' | 'offline' | 'syncing';

// 协作状态
export interface CollaborationState {
  roomId: string | null;
  username: string | null;
  avatarUrl: string | null;
  connectionStatus: ConnectionStatus;
  ydoc: Y.Doc | null;
  provider: SocketIOProvider | null;
  binding: MonacoBinding | null;
  remoteCursors: Record<string, RemoteCursor>;
  collaborators: Map<number, CollaborationUser>;
  role: RoomRole | null;      // 当前用户角色
  canEdit: boolean;           // 是否可编辑
}
```

### 4.2 Store (`store.ts`)

```typescript
export const useCollaborationStore = create<CollaborationStore>()(
  devtools(
    (set, get) => ({
      // 初始状态
      ...initialState,

      // 初始化协作
      initCollaboration: ({ socket, roomId, username, avatarUrl, role, token }) => {
        // 销毁旧实例
        if (existingProvider) existingProvider.destroy();
        if (existingDoc) existingDoc.destroy();

        // 创建新实例
        const ydoc = new Y.Doc();
        const provider = new SocketIOProvider({
          doc: ydoc,
          roomId,
          socket,
          role,
          token,
          onRoleChanged: (newRole) => {
            // 同步更新两个 store
            set({ role: newRole, canEdit: newRole !== 'viewer' });
            useRoomStore.getState().updateMyRole(newRole);
          },
          onError: (code, message) => {
            if (code === 'MEMBER_REMOVED') {
              useRoomStore.getState().setCurrentRoom(null, null);
            }
          },
        });

        set({ roomId, username, avatarUrl, ydoc, provider, role, canEdit: role !== 'viewer' });
      },

      // 销毁协作
      destroyCollaboration: () => {
        binding?.destroy();
        provider?.destroy();  // 会发送 LEAVE 事件
        ydoc?.destroy();
        set({ ...initialState });
      },

      // 其他操作
      setConnectionStatus: (status) => { ... },
      setRemoteCursors: (cursors) => { ... },
      setCollaborators: (collaborators) => { ... },
      setRole: (role) => { ... },
    }),
    { name: 'collaboration-store' }
  )
);
```

### 4.3 Hooks (`hooks.ts`)

| Hook | 用途 | 说明 |
|------|------|------|
| `useCollaboration()` | 获取协作状态和操作 | 返回 `{ roomId, username, connectionStatus, initCollaboration, destroyCollaboration }` |
| `useAuthenticatedSocket()` | 获取带认证的 Socket 实例 | 使用单例模式 |
| `useInitCollaboration(roomId, options)` | 初始化协作会话 | 等待 `myRole` 获取完成后初始化 |
| `useConnectionStatus()` | 监听连接状态 | 返回 `'online' | 'offline' | 'syncing'` |
| `useCanEdit()` | 检查编辑权限 | 双重检查：`collabCanEdit && roomCanEdit` |
| `useMonacoBinding(editor, ready)` | 绑定 Monaco 编辑器 | 返回 `bindingRef` |
| `useLocalUserState(editor, ready)` | 初始化本地用户状态 | 光标、选区同步 |
| `useRemoteCursors(editor, ready, option)` | 渲染远端光标 | 返回 `remoteCursors` |
| `useCollaborators(onUsersChange?)` | 获取协作者列表 | 返回 `Map<number, CollaborationUser>` |
| `useYjsContentSync(onChange?, setCode?)` | 监听 Yjs 内容变化 | 用于外部状态同步 |

### 4.4 SocketIOProvider (`yjs/socket-provider.ts`)

```typescript
export class SocketIOProvider {
  public readonly awareness: Awareness;
  private readonly doc: Y.Doc;
  private readonly roomId: string;
  private readonly socket: Socket;
  private role: RoomRole;
  private _synced = false;
  private _connected = false;
  private pendingUpdates: Uint8Array[] = [];  // 离线队列

  constructor(options: SocketIOProviderOptions) {
    // 初始化
    this.initPersistence();        // IndexedDB 本地持久化
    this.initConnectionListeners(); // 连接事件监听
    this.initEventListeners();      // Yjs 事件监听
  }

  // 事件处理
  private handleDocUpdate = (update, origin) => {
    // 权限检查：viewer 不能发送更新
    if (this.role === 'viewer') return;
    // 在线发送，离线缓存
    if (this._connected) {
      this.socket.emit(ACTIONS.Y_UPDATE, { roomId, update });
    } else {
      this.pendingUpdates.push(update);
    }
  };

  private handleRoleChanged = (payload) => {
    this.role = payload.role;
    this.onRoleChanged?.(payload.role);
  };

  private handleMemberRemoved = (payload) => {
    this.onError?.('MEMBER_REMOVED', payload.message);
    this.destroy();
  };

  // 连接处理
  private handleConnect = () => {
    this._connected = true;
    this.joinRoom();              // 加入房间
    this.flushPendingUpdates();   // 发送离线更新
    this.requestInitialSync();    // 请求同步
  };

  // 销毁
  destroy() {
    // 通知服务端离开房间
    if (this.socket.connected) {
      this.socket.emit(ACTIONS.LEAVE, { roomId: this.roomId });
    }
    // 清理事件监听
    this.socket.off(...);
    this.awareness.destroy();
    this.persistence?.destroy();
  }
}
```

---

## 5. Socket 连接管理

### 5.1 单例模式 (`api/socket.ts`)

```typescript
import { io, Socket } from "socket.io-client";
import { getToken } from "@/utils/mannegerToken";

// Socket 单例实例
let socketInstance: Socket | null = null;

// 获取后端 URL
const getBackendUrl = () => import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// 获取带认证的 Socket 实例（单例模式）
export const getAuthenticatedSocket = (): Socket | null => {
  const token = getToken();
  if (!token) return null;

  // 如果已有实例且连接正常，直接返回
  if (socketInstance && !socketInstance.disconnected) {
    return socketInstance;
  }

  // 创建新实例
  socketInstance = io(getBackendUrl(), {
    auth: { token },                    // JWT 认证
    withCredentials: true,
    transports: ['websocket', 'polling'],
    autoConnect: false,                 // 手动控制连接
    reconnectionAttempts: 5,
    reconnectionDelay: 100,
    reconnectionDelayMax: 500,
    timeout: 5000,
  });

  return socketInstance;
};

// 断开并清理 Socket 实例
export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

// 获取当前 Socket 实例（不创建新的）
export const getCurrentSocket = (): Socket | null => socketInstance;
```

### 5.2 为什么使用单例？

| 问题 | 单例解决方案 |
|------|-------------|
| 多个组件创建多个连接 | 全局唯一实例 |
| 连接状态不一致 | 统一管理连接生命周期 |
| 内存泄漏 | 集中销毁 |
| Token 更新 | 重建实例时自动使用新 Token |

---

## 6. 权限控制体系

### 6.1 角色定义

| 角色 | 权限 | 说明 |
|------|------|------|
| `owner` | 全部权限 | 房间创建者，可管理成员、修改房间、编辑代码 |
| `editor` | 编辑权限 | 可编辑代码，不能管理成员 |
| `viewer` | 只读权限 | 只能查看，不能编辑 |

### 6.2 权限检查点

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           三层权限检查                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. UI 层                                                                    │
│     ├─ useCanEdit() → 控制编辑器 readOnly 属性                              │
│     ├─ useMemberActions().canManageMembers → 控制成员管理按钮显示           │
│     └─ roomSelectors.isOwner → 控制房间设置入口                             │
│                                                                              │
│  2. Provider 层 (前端)                                                       │
│     └─ SocketIOProvider.handleDocUpdate()                                   │
│        if (this.role === 'viewer') return; // 阻止发送更新                  │
│                                                                              │
│  3. 后端层                                                                   │
│     └─ ChatGateway / RoomController                                         │
│        验证 JWT + 检查房间成员权限                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 角色同步机制

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           角色变更流程                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. 房主通过 REST API 修改成员角色                                           │
│     POST /rooms/:roomId/members/:userId { role: 'viewer' }                  │
│                                                                              │
│  2. 后端 RoomController 更新数据库                                           │
│                                                                              │
│  3. 后端 ChatGateway 广播 ROLE_CHANGED 事件                                  │
│     server.to(roomId).emit('role-changed', { roomId, userId, role })        │
│                                                                              │
│  4. 前端 SocketIOProvider 接收事件                                           │
│     handleRoleChanged() → this.role = newRole                               │
│                                                                              │
│  5. 触发 onRoleChanged 回调                                                  │
│     ├─ Collaboration Store: set({ role, canEdit })                          │
│     └─ Room Store: updateMyRole(newRole)                                    │
│                                                                              │
│  6. UI 自动响应状态变化                                                       │
│     ├─ 编辑器变为只读 / 可编辑                                               │
│     └─ 权限按钮显示 / 隐藏                                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.4 双 Store 角色同步

```typescript
// Room Store
myRole: RoomRole | null  // 用于房间管理 UI

// Collaboration Store
role: RoomRole | null    // 用于 Yjs 编辑权限控制
canEdit: boolean         // 派生状态

// 同步逻辑（在 collaboration/store.ts 中）
onRoleChanged: (newRole: RoomRole) => {
  // 更新 Collaboration Store
  set({ role: newRole, canEdit: newRole !== 'viewer' });
  // 同步更新 Room Store
  useRoomStore.getState().updateMyRole(newRole);
}
```

---

## 7. 数据流图

### 7.1 进入房间流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              用户进入房间页面                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Step 1: useEnterRoom(roomId)                                                │
│  ├─ 调用 fetchRoom(roomId)                                                   │
│  └─ REST API: GET /rooms/:roomId                                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Step 2: Room Store 更新                                                     │
│  ├─ currentRoom = { roomId, name, ownerId, ... }                            │
│  ├─ myRole = 'owner' | 'editor' | 'viewer'                                  │
│  └─ members = [{ userId, username, role, ... }, ...]                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ myRole 获取完成
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Step 3: useInitCollaboration(roomId, { username, avatarUrl })              │
│  ├─ 检查: socket && roomId && myRole 都存在                                  │
│  ├─ socket.connect()                                                         │
│  └─ initCollaboration({ socket, roomId, role: myRole, token, ... })         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Step 4: Collaboration Store 初始化                                          │
│  ├─ 创建 Y.Doc                                                               │
│  ├─ 创建 SocketIOProvider                                                    │
│  └─ 设置 role, canEdit                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Step 5: SocketIOProvider 初始化                                             │
│  ├─ 初始化 IndexedDB 持久化                                                  │
│  ├─ 监听 Socket 事件 (Y_SYNC, Y_UPDATE, Y_AWARENESS, ROLE_CHANGED, ...)     │
│  ├─ 监听 Y.Doc 更新事件                                                      │
│  └─ 如果已连接: joinRoom() + requestInitialSync()                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Step 6: 服务端处理                                                          │
│  ├─ 验证 JWT Token                                                           │
│  ├─ 验证房间成员权限                                                          │
│  ├─ socket.join(roomId)                                                      │
│  ├─ 广播 MEMBER_JOINED 给房间其他成员                                        │
│  └─ 返回 Y_SYNC 初始文档状态                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Step 7: 协作就绪                                                            │
│  ├─ connectionStatus = 'online'                                              │
│  ├─ Monaco 编辑器绑定 Yjs                                                    │
│  ├─ 远端光标渲染                                                             │
│  └─ 实时同步开始                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 离开房间流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              用户离开房间                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Step 1: useInitCollaboration cleanup (useEffect return)                    │
│  ├─ destroyCollaboration()                                                   │
│  └─ disconnectSocket()                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Step 2: Collaboration Store destroyCollaboration()                         │
│  ├─ binding.destroy()                                                        │
│  ├─ provider.destroy()                                                       │
│  ├─ ydoc.destroy()                                                           │
│  └─ 重置为 initialState                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Step 3: SocketIOProvider destroy()                                          │
│  ├─ socket.emit(ACTIONS.LEAVE, { roomId })  ← 通知服务端                     │
│  ├─ 移除所有事件监听                                                          │
│  ├─ awareness.destroy()                                                      │
│  └─ persistence.destroy()                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Step 4: 服务端处理                                                          │
│  ├─ socket.leave(roomId)                                                     │
│  ├─ 广播 MEMBER_LEFT 给房间其他成员                                          │
│  └─ 清理 YDoc 引用                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Step 5: Room Store 清理                                                     │
│  ├─ setCurrentRoom(null, null)                                               │
│  └─ members = []                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. 模块协作关系

### 8.1 模块依赖图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                  UI 层                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │   房间管理 UI    │  │   编辑器 UI     │  │   成员列表 UI   │              │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘              │
│           │                    │                    │                        │
└───────────┼────────────────────┼────────────────────┼────────────────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               Hooks 层                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │ room/hooks.ts   │  │ collaboration/  │  │ collaboration/  │              │
│  │                 │  │ hooks.ts        │  │ hooks.ts        │              │
│  │ useCurrentRoom  │  │ useCanEdit      │  │ useCollaborators│              │
│  │ useRoomActions  │  │ useMonacoBinding│  │ useRemoteCursors│              │
│  │ useEnterRoom    │  │ useInitCollab   │  │                 │              │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘              │
│           │                    │                    │                        │
└───────────┼────────────────────┼────────────────────┼────────────────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               Store 层                                       │
│  ┌─────────────────────────┐      ┌─────────────────────────┐               │
│  │       Room Store        │◄────►│   Collaboration Store   │               │
│  ├─────────────────────────┤      ├─────────────────────────┤               │
│  │ currentRoom             │      │ roomId                  │               │
│  │ myRole ◄────────────────┼──────┼─ role (同步)            │               │
│  │ members                 │      │ canEdit                 │               │
│  │ ownedRooms              │      │ ydoc                    │               │
│  │ joinedRooms             │      │ provider                │               │
│  │ canEdit (派生)          │      │ remoteCursors           │               │
│  │ isOwner (派生)          │      │ collaborators           │               │
│  └─────────────────────────┘      └───────────┬─────────────┘               │
│                                               │                              │
└───────────────────────────────────────────────┼──────────────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SocketIOProvider                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ 职责:                                                                    ││
│  │ ├─ Yjs 文档同步 (Y_SYNC, Y_UPDATE)                                      ││
│  │ ├─ Awareness 同步 (光标、选区)                                           ││
│  │ ├─ 权限控制 (viewer 阻止编辑)                                            ││
│  │ ├─ 角色变更监听 → onRoleChanged 回调                                     ││
│  │ ├─ 被移出房间处理 → onError 回调                                         ││
│  │ └─ 离线队列 + 重连恢复                                                   ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Socket.IO (单例)                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ api/socket.ts                                                            ││
│  │ ├─ getAuthenticatedSocket() → 单例 + JWT auth                           ││
│  │ ├─ disconnectSocket() → 断开清理                                         ││
│  │ └─ autoConnect: false → 手动控制连接                                     ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              后端服务                                        │
│  ├─ REST API: /rooms/* (房间 CRUD、成员管理)                                 │
│  └─ WebSocket Gateway: JOIN, LEAVE, Y_*, ROLE_CHANGED, MEMBER_REMOVED       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Store 间通信

```typescript
// Collaboration Store 中调用 Room Store
import { useRoomStore } from '../room/store';

// 在 onRoleChanged 回调中同步
onRoleChanged: (newRole: RoomRole) => {
  set({ role: newRole, canEdit: newRole !== 'viewer' });
  useRoomStore.getState().updateMyRole(newRole);  // 跨 Store 调用
}

// 在 onError 回调中清理
onError: (code: string, message: string) => {
  if (code === 'MEMBER_REMOVED') {
    useRoomStore.getState().setCurrentRoom(null, null);  // 跨 Store 调用
  }
}
```

---

## 9. 关键流程详解

### 9.1 实时协作同步

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           用户 A 编辑代码                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. Monaco 编辑器内容变化                                                    │
│     └─ MonacoBinding 自动同步到 Y.Text                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. Y.Doc 触发 'update' 事件                                                 │
│     └─ SocketIOProvider.handleDocUpdate(update, origin)                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  3. 权限检查                                                                 │
│     ├─ if (role === 'viewer') return;  // 阻止                              │
│     └─ if (!connected) pendingUpdates.push(update);  // 离线缓存            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  4. 发送到服务端                                                             │
│     socket.emit(ACTIONS.Y_UPDATE, { roomId, update })                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  5. 服务端广播                                                               │
│     socket.to(roomId).emit(ACTIONS.Y_UPDATE, { roomId, update })            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  6. 用户 B 接收                                                              │
│     ├─ SocketIOProvider.handleUpdateMessage(payload)                        │
│     ├─ Y.applyUpdate(doc, update, this)                                     │
│     └─ MonacoBinding 自动更新编辑器内容                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 离线恢复流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           网络断开                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. handleDisconnect()                                                       │
│     ├─ _connected = false                                                    │
│     └─ _synced = false                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. 用户继续编辑（离线）                                                      │
│     ├─ Y.Doc 本地更新正常                                                    │
│     ├─ IndexedDB 持久化保存                                                  │
│     └─ pendingUpdates.push(update)  // 缓存待发送                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  3. 网络恢复                                                                 │
│     └─ handleOnline() → socket.connect()                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  4. handleConnect()                                                          │
│     ├─ _connected = true                                                     │
│     ├─ joinRoom()                                                            │
│     ├─ flushPendingUpdates()  // 发送离线期间的更新                          │
│     └─ requestInitialSync()   // 获取服务端最新状态                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  5. Yjs CRDT 自动合并                                                        │
│     └─ 本地更新 + 服务端更新 → 无冲突合并                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 9.3 被移出房间流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        房主移除成员                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. REST API: DELETE /rooms/:roomId/members/:userId                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. 服务端广播                                                               │
│     socket.to(targetSocketId).emit(ACTIONS.MEMBER_REMOVED, {                │
│       roomId, userId, message: '您已被移出房间'                              │
│     })                                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  3. 被移除用户接收                                                           │
│     └─ SocketIOProvider.handleMemberRemoved(payload)                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  4. 触发 onError 回调                                                        │
│     ├─ Collaboration Store: 记录错误                                         │
│     └─ Room Store: setCurrentRoom(null, null)  // 清理状态                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  5. SocketIOProvider.destroy()                                               │
│     └─ 清理资源，断开连接                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  6. UI 响应                                                                  │
│     └─ 跳转到房间列表或显示提示                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. 注意事项与最佳实践

### 10.1 组件使用规范

```typescript
// ✅ 正确：通过 Hooks 访问状态
import { useCurrentRoom, useRoomActions } from '@/modules/room/hooks';

function RoomPage() {
  const { currentRoom, myRole, canEdit } = useCurrentRoom();
  const { fetchRoom } = useRoomActions();
  // ...
}

// ❌ 错误：直接导入 Store
import { useRoomStore } from '@/modules/room/store';

function RoomPage() {
  const currentRoom = useRoomStore((s) => s.currentRoom);  // 不推荐
}
```

### 10.2 初始化顺序

```typescript
// 必须按顺序初始化
function RoomPage({ roomId }) {
  // 1. 先获取房间信息（包含 myRole）
  const { isLoading } = useEnterRoom(roomId);
  
  // 2. 再初始化协作（依赖 myRole）
  useInitCollaboration(roomId, { username, avatarUrl });
  
  // 3. 最后绑定编辑器
  useMonacoBinding(editor, editorReady);
}
```

### 10.3 清理资源

```typescript
// useEffect 中正确清理
useEffect(() => {
  if (!roomId) return;
  
  // 初始化
  initCollaboration({ ... });
  
  // 清理函数
  return () => {
    destroyCollaboration();  // 会发送 LEAVE 事件
    disconnectSocket();
  };
}, [roomId]);
```

### 10.4 权限检查

```typescript
// UI 层使用 useCanEdit
function Editor() {
  const canEdit = useCanEdit();
  
  return (
    <MonacoEditor
      options={{ readOnly: !canEdit }}
    />
  );
}

// 操作前检查权限
function MemberList() {
  const { canManageMembers, removeMember } = useMemberActions();
  
  const handleRemove = (userId) => {
    if (!canManageMembers) return;
    removeMember(roomId, userId);
  };
}
```

### 10.5 错误处理

```typescript
// Store 中统一处理错误
try {
  const room = await roomApi.createRoom(params);
  set({ isLoading: false });
  return room;
} catch (error: any) {
  const message = error.response?.data?.message || '创建房间失败';
  set({ error: message, isLoading: false });
  throw error;  // 继续抛出，让调用方处理
}

// 组件中处理
const { error } = useMyRooms();

useEffect(() => {
  if (error) {
    toast.error(error);
  }
}, [error]);
```

---

## 附录：WebSocket 事件列表

| 事件 | 方向 | Payload | 说明 |
|------|------|---------|------|
| `join` | C→S | `{ roomId }` | 加入房间 |
| `joined` | S→C | `{ roomId, members }` | 加入成功 |
| `leave` | C→S | `{ roomId }` | 离开房间 |
| `member-joined` | S→C | `{ userId, username, socketId }` | 新成员加入 |
| `member-left` | S→C | `{ userId, username, socketId }` | 成员离开 |
| `member-removed` | S→C | `{ roomId, userId, message }` | 被移出房间 |
| `role-changed` | S→C | `{ roomId, userId, role }` | 角色变更 |
| `y-sync` | C↔S | `{ roomId, stateVector/update, role? }` | Yjs 初始同步 |
| `y-update` | C↔S | `{ roomId, update }` | Yjs 增量更新 |
| `y-awareness` | C↔S | `{ roomId, update }` | 光标/选区同步 |
| `error` | S→C | `{ code, message }` | 错误消息 |
| `disconnected` | S→C | `{ socketId, username }` | 用户断开 |

---

*文档版本: 1.0*  
*最后更新: 2024-12-21*
