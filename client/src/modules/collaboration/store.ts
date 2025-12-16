// Collaboration 模块 Zustand Store
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
} from './types';

// 初始状态
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
};

// 创建 Collaboration Store
export const useCollaborationStore = create<CollaborationStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // 初始化协作
      initCollaboration: ({ socket, roomId, username, avatarUrl }) => {
        const { ydoc: existingDoc, provider: existingProvider } = get();

        // 如果已存在，先销毁
        if (existingProvider) {
          existingProvider.destroy();
        }
        if (existingDoc) {
          existingDoc.destroy();
        }

        // 创建新的 Y.Doc
        const ydoc = new Y.Doc();

        // 创建 Provider
        const provider = new SocketIOProvider({
          doc: ydoc,
          roomId,
          socket,
          enablePersistence: true,
        });

        set({
          roomId,
          username,
          avatarUrl,
          ydoc,
          provider,
          connectionStatus: 'syncing',
        });
      },

      // 销毁协作
      destroyCollaboration: () => {
        const { binding, provider, ydoc } = get();

        if (binding) {
          binding.destroy();
        }
        if (provider) {
          provider.destroy();
        }
        if (ydoc) {
          ydoc.destroy();
        }

        set({
          ...initialState,
        });
      },

      // 更新连接状态
      setConnectionStatus: (status: ConnectionStatus) => {
        set({ connectionStatus: status });
      },

      // 更新远端光标
      setRemoteCursors: (cursors: Record<string, RemoteCursor>) => {
        set({ remoteCursors: cursors });
      },

      // 更新协作者列表
      setCollaborators: (collaborators: Map<number, CollaborationUser>) => {
        set({ collaborators: new Map(collaborators) });
      },

      // 获取 awareness
      getAwareness: () => {
        const { provider } = get();
        return provider?.awareness ?? null;
      },

      // 获取 yText
      getYText: () => {
        const { ydoc } = get();
        return ydoc?.getText('monaco') ?? null;
      },
    }),
    { name: 'collaboration-store' }
  )
);

// 注册到全局 store registry
registerStore('collaboration', useCollaborationStore);

// 导出选择器
export const collaborationSelectors = {
  roomId: (state: CollaborationStore) => state.roomId,
  username: (state: CollaborationStore) => state.username,
  avatarUrl: (state: CollaborationStore) => state.avatarUrl,
  connectionStatus: (state: CollaborationStore) => state.connectionStatus,
  remoteCursors: (state: CollaborationStore) => state.remoteCursors,
  collaborators: (state: CollaborationStore) => state.collaborators,
  provider: (state: CollaborationStore) => state.provider,
  ydoc: (state: CollaborationStore) => state.ydoc,
};
