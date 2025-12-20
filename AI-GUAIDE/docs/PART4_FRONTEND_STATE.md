# 协同编辑权限体系技术方案 - Part 4: 前端状态管理改造

## 目录
- [1. 模块结构](#1-模块结构)
- [2. Room 模块](#2-room-模块)
- [3. Collaboration Store 改造](#3-collaboration-store-改造)
- [4. Socket Provider 改造](#4-socket-provider-改造)
- [5. Hooks 改造](#5-hooks-改造)

---

## 1. 模块结构

### 1.1 新增目录结构

```
client/src/modules/
├── room/                         # 新增: 房间模块
│   ├── api.ts                    # Room REST API
│   ├── store.ts                  # Room Zustand Store
│   ├── types.ts                  # 类型定义
│   └── hooks.ts                  # React Hooks
├── collaboration/                # 改造: 协作模块
│   ├── store.ts                  # 添加 role 字段
│   ├── types.ts                  # 添加 role 类型
│   ├── hooks.ts                  # 改造连接逻辑
│   └── yjs/
│       └── socket-provider.ts    # 添加 JWT 和错误处理
└── auth/                         # 现有: 认证模块
    └── store.ts                  # 获取 token
```

---

## 2. Room 模块

### 2.1 types.ts

**文件路径**: `client/src/modules/room/types.ts`

```typescript
// 角色类型
export type RoomRole = 'owner' | 'editor' | 'viewer';

// 房间信息
export interface Room {
  id: string;
  roomId: string;        // 用户可见的房间号 (如: abc-123-xyz)
  name: string;
  description?: string;
  ownerId: string;
  isPublic: boolean;
  defaultRole: 'editor' | 'viewer';
  status: 'active' | 'archived' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

// 房间成员
export interface RoomMember {
  id: string;
  roomId: string;
  userId: string;
  role: RoomRole;
  joinedAt: string;
  user: {
    id: string;
    username: string;
    email: string;
    githubAvatar?: string;
  };
}

// 房间详情 (含成员)
export interface RoomDetail {
  room: Room;
  members: RoomMember[];
  myRole: RoomRole | null;
}

// 创建房间参数
export interface CreateRoomParams {
  name: string;
  description?: string;
  isPublic?: boolean;
  defaultRole?: 'editor' | 'viewer';
}

// 更新成员角色参数
export interface UpdateMemberRoleParams {
  role: 'editor' | 'viewer';
}

// Room Store 状态
export interface RoomState {
  // 当前房间
  currentRoom: Room | null;
  myRole: RoomRole | null;
  members: RoomMember[];
  
  // 我的房间列表
  ownedRooms: Room[];
  joinedRooms: Room[];
  
  // 加载状态
  isLoading: boolean;
  error: string | null;
}

// Room Store 操作
export interface RoomActions {
  // 房间操作
  createRoom: (params: CreateRoomParams) => Promise<Room>;
  fetchRoom: (roomId: string) => Promise<RoomDetail>;
  updateRoom: (roomId: string, params: Partial<CreateRoomParams>) => Promise<Room>;
  deleteRoom: (roomId: string) => Promise<void>;
  
  // 成员操作
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: (roomId: string) => Promise<void>;
  updateMemberRole: (roomId: string, userId: string, role: 'editor' | 'viewer') => Promise<void>;
  removeMember: (roomId: string, userId: string) => Promise<void>;
  
  // 我的房间
  fetchMyRooms: () => Promise<void>;
  
  // 状态管理
  setCurrentRoom: (room: Room | null, role: RoomRole | null) => void;
  setMembers: (members: RoomMember[]) => void;
  updateMyRole: (role: RoomRole) => void;
  clearError: () => void;
  reset: () => void;
}

export type RoomStore = RoomState & RoomActions;
```

### 2.2 api.ts

**文件路径**: `client/src/modules/room/api.ts`

```typescript
import axios from 'axios';
import type { Room, RoomDetail, CreateRoomParams, RoomMember } from './types';

// 假设你有一个配置好的 axios 实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  withCredentials: true,
});

// 请求拦截器: 添加 JWT Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器: 处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token 过期，跳转登录
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==================== 房间 API ====================

export const roomApi = {
  // 创建房间
  async createRoom(params: CreateRoomParams): Promise<Room> {
    const { data } = await api.post('/rooms', params);
    return data.data;
  },

  // 获取房间详情
  async getRoom(roomId: string): Promise<RoomDetail> {
    const { data } = await api.get(`/rooms/${roomId}`);
    return data.data;
  },

  // 更新房间
  async updateRoom(roomId: string, params: Partial<CreateRoomParams>): Promise<Room> {
    const { data } = await api.patch(`/rooms/${roomId}`, params);
    return data.data;
  },

  // 删除房间
  async deleteRoom(roomId: string): Promise<void> {
    await api.delete(`/rooms/${roomId}`);
  },

  // 获取我的房间列表
  async getMyRooms(): Promise<{ owned: Room[]; joined: Room[] }> {
    const { data } = await api.get('/rooms');
    return data.data;
  },

  // 加入房间
  async joinRoom(roomId: string): Promise<RoomMember> {
    const { data } = await api.post(`/rooms/${roomId}/join`);
    return data.data;
  },

  // 离开房间
  async leaveRoom(roomId: string): Promise<void> {
    await api.post(`/rooms/${roomId}/leave`);
  },

  // 获取成员列表
  async getMembers(roomId: string): Promise<RoomMember[]> {
    const { data } = await api.get(`/rooms/${roomId}/members`);
    return data.data;
  },

  // 更新成员角色
  async updateMemberRole(roomId: string, userId: string, role: 'editor' | 'viewer'): Promise<RoomMember> {
    const { data } = await api.patch(`/rooms/${roomId}/members/${userId}`, { role });
    return data.data;
  },

  // 移除成员
  async removeMember(roomId: string, userId: string): Promise<void> {
    await api.delete(`/rooms/${roomId}/members/${userId}`);
  },

  // 转让所有权
  async transferOwnership(roomId: string, userId: string): Promise<void> {
    await api.post(`/rooms/${roomId}/transfer/${userId}`);
  },
};
```

### 2.3 store.ts

**文件路径**: `client/src/modules/room/store.ts`

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { roomApi } from './api';
import type { RoomStore, RoomState, Room, RoomRole, RoomMember, CreateRoomParams } from './types';

const initialState: RoomState = {
  currentRoom: null,
  myRole: null,
  members: [],
  ownedRooms: [],
  joinedRooms: [],
  isLoading: false,
  error: null,
};

export const useRoomStore = create<RoomStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ==================== 房间操作 ====================

      createRoom: async (params: CreateRoomParams) => {
        set({ isLoading: true, error: null });
        try {
          const room = await roomApi.createRoom(params);
          set((state) => ({
            ownedRooms: [room, ...state.ownedRooms],
            isLoading: false,
          }));
          return room;
        } catch (error: any) {
          set({ error: error.response?.data?.message || '创建房间失败', isLoading: false });
          throw error;
        }
      },

      fetchRoom: async (roomId: string) => {
        set({ isLoading: true, error: null });
        try {
          const detail = await roomApi.getRoom(roomId);
          set({
            currentRoom: detail.room,
            myRole: detail.myRole,
            members: detail.members,
            isLoading: false,
          });
          return detail;
        } catch (error: any) {
          set({ error: error.response?.data?.message || '获取房间失败', isLoading: false });
          throw error;
        }
      },

      updateRoom: async (roomId: string, params: Partial<CreateRoomParams>) => {
        set({ isLoading: true, error: null });
        try {
          const room = await roomApi.updateRoom(roomId, params);
          set((state) => ({
            currentRoom: state.currentRoom?.roomId === roomId ? room : state.currentRoom,
            ownedRooms: state.ownedRooms.map((r) => (r.roomId === roomId ? room : r)),
            isLoading: false,
          }));
          return room;
        } catch (error: any) {
          set({ error: error.response?.data?.message || '更新房间失败', isLoading: false });
          throw error;
        }
      },

      deleteRoom: async (roomId: string) => {
        set({ isLoading: true, error: null });
        try {
          await roomApi.deleteRoom(roomId);
          set((state) => ({
            currentRoom: state.currentRoom?.roomId === roomId ? null : state.currentRoom,
            ownedRooms: state.ownedRooms.filter((r) => r.roomId !== roomId),
            isLoading: false,
          }));
        } catch (error: any) {
          set({ error: error.response?.data?.message || '删除房间失败', isLoading: false });
          throw error;
        }
      },

      // ==================== 成员操作 ====================

      joinRoom: async (roomId: string) => {
        set({ isLoading: true, error: null });
        try {
          await roomApi.joinRoom(roomId);
          // 重新获取房间详情以更新成员列表
          await get().fetchRoom(roomId);
        } catch (error: any) {
          set({ error: error.response?.data?.message || '加入房间失败', isLoading: false });
          throw error;
        }
      },

      leaveRoom: async (roomId: string) => {
        set({ isLoading: true, error: null });
        try {
          await roomApi.leaveRoom(roomId);
          set((state) => ({
            currentRoom: state.currentRoom?.roomId === roomId ? null : state.currentRoom,
            myRole: state.currentRoom?.roomId === roomId ? null : state.myRole,
            joinedRooms: state.joinedRooms.filter((r) => r.roomId !== roomId),
            isLoading: false,
          }));
        } catch (error: any) {
          set({ error: error.response?.data?.message || '离开房间失败', isLoading: false });
          throw error;
        }
      },

      updateMemberRole: async (roomId: string, userId: string, role: 'editor' | 'viewer') => {
        set({ isLoading: true, error: null });
        try {
          await roomApi.updateMemberRole(roomId, userId, role);
          set((state) => ({
            members: state.members.map((m) =>
              m.userId === userId ? { ...m, role } : m
            ),
            isLoading: false,
          }));
        } catch (error: any) {
          set({ error: error.response?.data?.message || '更新角色失败', isLoading: false });
          throw error;
        }
      },

      removeMember: async (roomId: string, userId: string) => {
        set({ isLoading: true, error: null });
        try {
          await roomApi.removeMember(roomId, userId);
          set((state) => ({
            members: state.members.filter((m) => m.userId !== userId),
            isLoading: false,
          }));
        } catch (error: any) {
          set({ error: error.response?.data?.message || '移除成员失败', isLoading: false });
          throw error;
        }
      },

      // ==================== 我的房间 ====================

      fetchMyRooms: async () => {
        set({ isLoading: true, error: null });
        try {
          const { owned, joined } = await roomApi.getMyRooms();
          set({
            ownedRooms: owned,
            joinedRooms: joined,
            isLoading: false,
          });
        } catch (error: any) {
          set({ error: error.response?.data?.message || '获取房间列表失败', isLoading: false });
          throw error;
        }
      },

      // ==================== 状态管理 ====================

      setCurrentRoom: (room: Room | null, role: RoomRole | null) => {
        set({ currentRoom: room, myRole: role });
      },

      setMembers: (members: RoomMember[]) => {
        set({ members });
      },

      updateMyRole: (role: RoomRole) => {
        set({ myRole: role });
      },

      clearError: () => {
        set({ error: null });
      },

      reset: () => {
        set(initialState);
      },
    }),
    { name: 'room-store' }
  )
);

// 选择器
export const roomSelectors = {
  currentRoom: (state: RoomStore) => state.currentRoom,
  myRole: (state: RoomStore) => state.myRole,
  members: (state: RoomStore) => state.members,
  ownedRooms: (state: RoomStore) => state.ownedRooms,
  joinedRooms: (state: RoomStore) => state.joinedRooms,
  isLoading: (state: RoomStore) => state.isLoading,
  error: (state: RoomStore) => state.error,
  canEdit: (state: RoomStore) => state.myRole === 'owner' || state.myRole === 'editor',
  isOwner: (state: RoomStore) => state.myRole === 'owner',
};
```

### 2.4 hooks.ts

**文件路径**: `client/src/modules/room/hooks.ts`

```typescript
import { useEffect, useCallback } from 'react';
import { useRoomStore, roomSelectors } from './store';
import type { CreateRoomParams, RoomRole } from './types';

// 获取当前房间信息
export function useCurrentRoom() {
  const currentRoom = useRoomStore(roomSelectors.currentRoom);
  const myRole = useRoomStore(roomSelectors.myRole);
  const members = useRoomStore(roomSelectors.members);
  const canEdit = useRoomStore(roomSelectors.canEdit);
  const isOwner = useRoomStore(roomSelectors.isOwner);

  return { currentRoom, myRole, members, canEdit, isOwner };
}

// 房间操作 Hook
export function useRoomActions() {
  const createRoom = useRoomStore((s) => s.createRoom);
  const fetchRoom = useRoomStore((s) => s.fetchRoom);
  const updateRoom = useRoomStore((s) => s.updateRoom);
  const deleteRoom = useRoomStore((s) => s.deleteRoom);
  const joinRoom = useRoomStore((s) => s.joinRoom);
  const leaveRoom = useRoomStore((s) => s.leaveRoom);

  return { createRoom, fetchRoom, updateRoom, deleteRoom, joinRoom, leaveRoom };
}

// 成员管理 Hook
export function useMemberActions() {
  const updateMemberRole = useRoomStore((s) => s.updateMemberRole);
  const removeMember = useRoomStore((s) => s.removeMember);
  const isOwner = useRoomStore(roomSelectors.isOwner);

  return { updateMemberRole, removeMember, canManageMembers: isOwner };
}

// 我的房间列表 Hook
export function useMyRooms() {
  const ownedRooms = useRoomStore(roomSelectors.ownedRooms);
  const joinedRooms = useRoomStore(roomSelectors.joinedRooms);
  const isLoading = useRoomStore(roomSelectors.isLoading);
  const error = useRoomStore(roomSelectors.error);
  const fetchMyRooms = useRoomStore((s) => s.fetchMyRooms);

  useEffect(() => {
    fetchMyRooms();
  }, [fetchMyRooms]);

  return { ownedRooms, joinedRooms, isLoading, error, refresh: fetchMyRooms };
}

// 进入房间 Hook (结合 Room 和 Collaboration)
export function useEnterRoom(roomId: string | null) {
  const fetchRoom = useRoomStore((s) => s.fetchRoom);
  const setCurrentRoom = useRoomStore((s) => s.setCurrentRoom);
  const isLoading = useRoomStore(roomSelectors.isLoading);
  const error = useRoomStore(roomSelectors.error);

  useEffect(() => {
    if (roomId) {
      fetchRoom(roomId).catch(console.error);
    } else {
      setCurrentRoom(null, null);
    }
  }, [roomId, fetchRoom, setCurrentRoom]);

  return { isLoading, error };
}
```

---

## 3. Collaboration Store 改造

### 3.1 types.ts 改造

**文件路径**: `client/src/modules/collaboration/types.ts`

```typescript
// 在现有类型基础上添加:

import type { RoomRole } from '../room/types';

// 更新 CollaborationUser
export interface CollaborationUser {
  name: string;
  avatarUrl: string;
  color: string;
  awarenessId?: number;
  role?: RoomRole;  // 新增: 用户角色
}

// 更新 CollaborationState
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
  
  // 新增: 权限相关
  role: RoomRole | null;      // 当前用户角色
  canEdit: boolean;           // 是否可编辑
}

// 更新 initCollaboration 参数
export interface InitCollaborationParams {
  socket: Socket;
  roomId: string;
  username: string;
  avatarUrl: string;
  role: RoomRole;             // 新增: 必须传入角色
  token: string;              // 新增: JWT Token
}

// 更新 CollaborationActions
export interface CollaborationActions {
  initCollaboration: (params: InitCollaborationParams) => void;
  destroyCollaboration: () => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setRemoteCursors: (cursors: Record<string, RemoteCursor>) => void;
  setCollaborators: (collaborators: Map<number, CollaborationUser>) => void;
  getAwareness: () => Awareness | null;
  getYText: () => Y.Text | null;
  
  // 新增: 权限相关
  setRole: (role: RoomRole) => void;
}
```

### 3.2 store.ts 改造

**文件路径**: `client/src/modules/collaboration/store.ts`

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { registerStore } from '@/core/store';
import * as Y from 'yjs';
import { SocketIOProvider } from '@/modules/collaboration/yjs/socket-provider';
import type {
  CollaborationStore,
  CollaborationState,
  ConnectionStatus,
  RemoteCursor,
  CollaborationUser,
  InitCollaborationParams,
} from './types';
import type { RoomRole } from '../room/types';

const initialState: CollaborationState = {
  roomId: null,
  username: null,
  avatarUrl: null,
  connectionStatus: 'syncing',
  ydoc: null,
  provider: null,
  binding: null,
  remoteCursors: {},
  collaborators: new Map(),
  // 新增
  role: null,
  canEdit: false,
};

export const useCollaborationStore = create<CollaborationStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      initCollaboration: ({ socket, roomId, username, avatarUrl, role, token }) => {
        const { ydoc: existingDoc, provider: existingProvider } = get();

        // 清理已有连接
        if (existingProvider) {
          existingProvider.destroy();
        }
        if (existingDoc) {
          existingDoc.destroy();
        }

        // 创建新的 Y.Doc
        const ydoc = new Y.Doc();

        // 创建 Provider (传入 token 和 role)
        const provider = new SocketIOProvider({
          doc: ydoc,
          roomId,
          socket,
          enablePersistence: true,
          token,  // 新增: 传入 token
          role,   // 新增: 传入角色
          onRoleChanged: (newRole: RoomRole) => {
            // 当服务端通知角色变更时更新
            set({ role: newRole, canEdit: newRole !== 'viewer' });
          },
        });

        set({
          roomId,
          username,
          avatarUrl,
          ydoc,
          provider,
          connectionStatus: 'syncing',
          // 新增
          role,
          canEdit: role !== 'viewer',
        });
      },

      destroyCollaboration: () => {
        const { binding, provider, ydoc } = get();

        if (binding) binding.destroy();
        if (provider) provider.destroy();
        if (ydoc) ydoc.destroy();

        set({ ...initialState });
      },

      setConnectionStatus: (status: ConnectionStatus) => {
        set({ connectionStatus: status });
      },

      setRemoteCursors: (cursors: Record<string, RemoteCursor>) => {
        set({ remoteCursors: cursors });
      },

      setCollaborators: (collaborators: Map<number, CollaborationUser>) => {
        set({ collaborators: new Map(collaborators) });
      },

      getAwareness: () => {
        const { provider } = get();
        return provider?.awareness ?? null;
      },

      getYText: () => {
        const { ydoc } = get();
        return ydoc?.getText('monaco') ?? null;
      },

      // 新增: 设置角色
      setRole: (role: RoomRole) => {
        set({ role, canEdit: role !== 'viewer' });
      },
    }),
    { name: 'collaboration-store' }
  )
);

registerStore('collaboration', useCollaborationStore);

// 更新选择器
export const collaborationSelectors = {
  roomId: (state: CollaborationStore) => state.roomId,
  username: (state: CollaborationStore) => state.username,
  avatarUrl: (state: CollaborationStore) => state.avatarUrl,
  connectionStatus: (state: CollaborationStore) => state.connectionStatus,
  remoteCursors: (state: CollaborationStore) => state.remoteCursors,
  collaborators: (state: CollaborationStore) => state.collaborators,
  provider: (state: CollaborationStore) => state.provider,
  ydoc: (state: CollaborationStore) => state.ydoc,
  // 新增
  role: (state: CollaborationStore) => state.role,
  canEdit: (state: CollaborationStore) => state.canEdit,
};
```

---

## 4. Socket Provider 改造

**文件路径**: `client/src/modules/collaboration/yjs/socket-provider.ts`

```typescript
import * as Y from 'yjs';
import type { Socket } from 'socket.io-client';
import { ACTIONS } from '../../../action';
import {
  Awareness,
  encodeAwarenessUpdate,
  applyAwarenessUpdate,
  removeAwarenessStates,
} from 'y-protocols/awareness';
import { IndexeddbPersistence } from 'y-indexeddb';
import type { RoomRole } from '../../room/types';

interface SocketIOProviderOptions {
  doc: Y.Doc;
  roomId: string;
  socket: Socket;
  enablePersistence?: boolean;
  token: string;                              // 新增: JWT Token
  role: RoomRole;                             // 新增: 用户角色
  onRoleChanged?: (role: RoomRole) => void;   // 新增: 角色变更回调
  onError?: (code: string, message: string) => void;  // 新增: 错误回调
}

export class SocketIOProvider {
  public readonly awareness: Awareness;
  private readonly doc: Y.Doc;
  private readonly roomId: string;
  private readonly socket: Socket;
  private readonly token: string;
  private role: RoomRole;
  private readonly onRoleChanged?: (role: RoomRole) => void;
  private readonly onError?: (code: string, message: string) => void;
  
  private destroyed = false;
  private persistence: IndexeddbPersistence | null = null;
  private _synced = false;
  private _connected = false;
  private pendingUpdates: Uint8Array[] = [];

  constructor(options: SocketIOProviderOptions) {
    this.doc = options.doc;
    this.roomId = options.roomId;
    this.socket = options.socket;
    this.token = options.token;
    this.role = options.role;
    this.onRoleChanged = options.onRoleChanged;
    this.onError = options.onError;

    this.awareness = new Awareness(this.doc);

    if (options.enablePersistence !== false) {
      this.initPersistence();
    }

    this.initConnectionListeners();
    this.initEventListeners();

    // 监听文档更新
    this.doc.on('update', this.handleDocUpdate);

    if (this.socket.connected) {
      this._connected = true;
      this.joinRoom();
    }
  }

  // ==================== 事件监听初始化 ====================

  private initEventListeners() {
    // Yjs 事件
    this.socket.on(ACTIONS.Y_SYNC, this.handleSyncMessage);
    this.socket.on(ACTIONS.Y_UPDATE, this.handleUpdateMessage);
    this.socket.on(ACTIONS.Y_AWARENESS, this.handleAwarenessMessage);
    
    // 用户事件
    this.socket.on(ACTIONS.DISCONNECTED, this.handleUserDisconnected);
    this.socket.on(ACTIONS.MEMBER_LEFT, this.handleUserDisconnected);
    
    // 新增: 权限事件
    this.socket.on(ACTIONS.ROLE_CHANGED, this.handleRoleChanged);
    this.socket.on(ACTIONS.MEMBER_REMOVED, this.handleMemberRemoved);
    this.socket.on(ACTIONS.ERROR, this.handleError);

    // Awareness 变化
    this.awareness.on('update', this.handleAwarenessUpdate);
  }

  // ==================== 新增: 权限相关处理 ====================

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

  // ==================== 加入房间 (带认证) ====================

  private joinRoom() {
    this.socket.emit(ACTIONS.JOIN, {
      roomId: this.roomId,
      // 不再传 username，服务端从 JWT 获取
    });
  }

  // ==================== 文档更新处理 ====================

  private readonly handleDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === this || this.destroyed) return;

    // 新增: 检查是否有编辑权限
    if (this.role === 'viewer') {
      console.warn('[SocketIOProvider] viewer 角色无法发送更新');
      return;
    }

    if (this._connected && this.socket.connected) {
      this.socket.emit(ACTIONS.Y_UPDATE, {
        roomId: this.roomId,
        update,
      });
    } else {
      this.pendingUpdates.push(update);
    }
  };

  private readonly handleSyncMessage = (payload: {
    roomId: string;
    update?: ArrayBuffer | Uint8Array | number[];
    role?: RoomRole;  // 新增: 服务端返回角色
  }) => {
    if (payload.roomId !== this.roomId || !payload.update) return;
    
    const update = this.toUint8Array(payload.update);
    Y.applyUpdate(this.doc, update, this);
    this._synced = true;
    
    // 新增: 更新角色 (如果服务端返回了)
    if (payload.role && payload.role !== this.role) {
      this.role = payload.role;
      this.onRoleChanged?.(payload.role);
    }
  };

  private readonly handleUpdateMessage = (payload: {
    roomId: string;
    update: ArrayBuffer | Uint8Array | number[];
  }) => {
    if (payload.roomId !== this.roomId) return;
    const update = this.toUint8Array(payload.update);
    Y.applyUpdate(this.doc, update, this);
  };

  private readonly handleAwarenessMessage = (payload: {
    roomId: string;
    update: ArrayBuffer | Uint8Array | number[];
  }) => {
    if (payload.roomId !== this.roomId) return;
    const update = this.toUint8Array(payload.update);
    applyAwarenessUpdate(this.awareness, update, this);
  };

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

  private readonly handleUserDisconnected = (payload: { socketId: string; username?: string; userId?: string }) => {
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
    }
  };

  // ==================== 连接管理 ====================

  private initPersistence() {
    this.persistence = new IndexeddbPersistence(`yjs-doc-${this.roomId}`, this.doc);
    this.persistence.on('synced', () => {
      console.log(`[SocketIOProvider] 本地数据已恢复: ${this.roomId}`);
    });
  }

  private initConnectionListeners() {
    this.socket.on('connect', this.handleConnect);
    this.socket.on('disconnect', this.handleDisconnect);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  private requestInitialSync() {
    const stateVector = Y.encodeStateVector(this.doc);
    this.socket.emit(ACTIONS.Y_SYNC, {
      roomId: this.roomId,
      stateVector,
    });
  }

  private flushPendingUpdates() {
    if (this.pendingUpdates.length === 0) return;
    if (this.role === 'viewer') {
      this.pendingUpdates = [];
      return;
    }
    
    const mergedUpdate = Y.mergeUpdates(this.pendingUpdates);
    this.socket.emit(ACTIONS.Y_UPDATE, {
      roomId: this.roomId,
      update: mergedUpdate,
    });
    this.pendingUpdates = [];
  }

  private handleConnect = () => {
    console.log('[SocketIOProvider] Socket 已连接');
    this._connected = true;
    this.joinRoom();
    this.flushPendingUpdates();
    this.requestInitialSync();
  };

  private handleDisconnect = () => {
    console.log('[SocketIOProvider] Socket 已断开');
    this._connected = false;
    this._synced = false;
  };

  private handleOnline = () => {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  };

  private handleOffline = () => {
    console.log('[SocketIOProvider] 网络已断开');
  };

  // ==================== 公共方法 ====================

  get synced() { return this._synced; }
  get connected() { return this._connected; }
  get currentRole() { return this.role; }

  destroy() {
    if (this.destroyed) return;
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
    this.socket.off('connect', this.handleConnect);
    this.socket.off('disconnect', this.handleDisconnect);

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }

    this.awareness.destroy();
    this.persistence?.destroy();
  }

  private toUint8Array(data: ArrayBuffer | Uint8Array | number[] | Buffer): Uint8Array {
    if (data instanceof Uint8Array) return data;
    if (Array.isArray(data)) return Uint8Array.from(data);
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    return new Uint8Array(data);
  }
}
```

---

## 5. Hooks 改造

**文件路径**: `client/src/modules/collaboration/hooks.ts` (更新)

```typescript
import { useEffect, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useCollaborationStore, collaborationSelectors } from './store';
import { useRoomStore, roomSelectors } from '../room/store';
import type { RoomRole } from '../room/types';

// 获取 token 的辅助函数
function getAccessToken(): string | null {
  return localStorage.getItem('accessToken');
}

// 创建带认证的 Socket 连接
export function useAuthenticatedSocket() {
  const socket = useMemo(() => {
    const token = getAccessToken();
    if (!token) return null;

    return io(import.meta.env.VITE_WS_URL || 'http://localhost:3000', {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });
  }, []);

  return socket;
}

// 协作状态 Hook
export function useCollaboration() {
  const roomId = useCollaborationStore(collaborationSelectors.roomId);
  const connectionStatus = useCollaborationStore(collaborationSelectors.connectionStatus);
  const collaborators = useCollaborationStore(collaborationSelectors.collaborators);
  const remoteCursors = useCollaborationStore(collaborationSelectors.remoteCursors);
  const role = useCollaborationStore(collaborationSelectors.role);
  const canEdit = useCollaborationStore(collaborationSelectors.canEdit);

  return { roomId, connectionStatus, collaborators, remoteCursors, role, canEdit };
}

// 初始化协作 Hook
export function useInitCollaboration(
  roomId: string | null,
  options: {
    username: string;
    avatarUrl: string;
  }
) {
  const socket = useAuthenticatedSocket();
  const initCollaboration = useCollaborationStore((s) => s.initCollaboration);
  const destroyCollaboration = useCollaborationStore((s) => s.destroyCollaboration);
  
  // 从 Room Store 获取角色
  const myRole = useRoomStore(roomSelectors.myRole);

  useEffect(() => {
    if (!roomId || !socket || !myRole) return;

    const token = getAccessToken();
    if (!token) {
      console.error('未找到 access token');
      return;
    }

    // 连接 socket
    socket.connect();

    // 初始化协作
    initCollaboration({
      socket,
      roomId,
      username: options.username,
      avatarUrl: options.avatarUrl,
      role: myRole,
      token,
    });

    return () => {
      destroyCollaboration();
      socket.disconnect();
    };
  }, [roomId, socket, myRole, options.username, options.avatarUrl, initCollaboration, destroyCollaboration]);
}

// 编辑权限 Hook
export function useCanEdit(): boolean {
  const collabCanEdit = useCollaborationStore(collaborationSelectors.canEdit);
  const roomCanEdit = useRoomStore(roomSelectors.canEdit);
  
  // 两个 store 都认为可以编辑才返回 true
  return collabCanEdit && roomCanEdit;
}
```

---

## 下一步

请继续阅读 **Part 5: 前端 UI 与权限控制** (`PART5_FRONTEND_UI.md`)
