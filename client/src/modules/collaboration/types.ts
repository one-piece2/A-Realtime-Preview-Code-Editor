
import type { Socket } from 'socket.io-client';
import type * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';
import type { SocketIOProvider } from '@/modules/collaboration/yjs/socket-provider';
import type { MonacoBinding } from 'y-monaco';
import type { RoomRole } from '../room/types';
// 用户信息
export interface CollaborationUser {
  name: string;
  avatarUrl: string;
  color: string;
  //ydoc给每个用户分配的id
  awarenessId?: number;
  role?: RoomRole;
}

//光标位置信息
export interface CursorPosition {
  position: number;
  anchor: number;
  head: number;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

// 远端光标渲染信息
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

// 选区范围
export interface SelectionRange {
  top: number;
  left: number;
  width: number;
  height: number;
}

// 连接状态
export type ConnectionStatus = 'online' | 'offline' | 'syncing';

// 协作状态
export interface CollaborationState {
  // 连接相关
  roomId: string | null;
  username: string | null;
  avatarUrl: string | null;
  connectionStatus: ConnectionStatus;

  // Yjs 实例（不持久化）
  ydoc: Y.Doc | null;
  provider: SocketIOProvider | null;
  binding: MonacoBinding | null;

  // 远端用户光标
  remoteCursors: Record<string, RemoteCursor>;

  // 协作用户列表
  collaborators: Map<number, CollaborationUser>;

  role: RoomRole | null;      // 当前用户角色
  canEdit: boolean;           // 是否可编辑
}

// 协作操作
export interface CollaborationActions {
  // 初始化协作
  initCollaboration: (params: {
    socket: Socket;
    roomId: string;
    username: string;
    avatarUrl: string;
    role: RoomRole;             // 必须传入角色
    token: string;               //jwt Token
  }) => void;

  // 销毁协作
  destroyCollaboration: () => void;

  // 更新连接状态
  setConnectionStatus: (status: ConnectionStatus) => void;

  // 更新远端光标
  setRemoteCursors: (cursors: Record<string, RemoteCursor>) => void;

  // 更新协作者列表
  setCollaborators: (collaborators: Map<number, CollaborationUser>) => void;

  // 获取 awareness
  getAwareness: () => Awareness | null;

  // 获取 yText
  getYText: () => Y.Text | null;
   setRole: (role: RoomRole) => void;
}

// 完整 Store 类型
export type CollaborationStore = CollaborationState & CollaborationActions;
