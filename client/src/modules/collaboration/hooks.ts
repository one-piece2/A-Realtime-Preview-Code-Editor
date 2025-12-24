// Collaboration 模块 Hooks
// UI 层通过这些 hooks 获取协作状态和操作
import { useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { Socket } from 'socket.io-client';
import type { editor } from 'monaco-editor';
import { MonacoBinding } from 'y-monaco';
import { useCollaborationStore, collaborationSelectors } from './store';
import { getAuthenticatedSocket, disconnectSocket } from '@/api/socket';
import { useRoomStore, roomSelectors } from '../room/store';
import { getAccessToken } from './services';
import { ACTIONS } from '@/action';
import {
  initLocalUserState,
  updateLocalCursorPosition,
  calculateRemoteCursors,
  extractCollaborators,
  createDebounce,
} from './services';
import type { CollaborationUser } from './types';
import type { RoomRole } from '../room/types';

// 主要的协作 Hook - 初始化和管理协作会话 可以在ui中手动调用这些东西
export function useCollaboration() {
  return useCollaborationStore(
    useShallow((state) => ({
      roomId: state.roomId,
      username: state.username,
      avatarUrl: state.avatarUrl,
      connectionStatus: state.connectionStatus,
      initCollaboration: state.initCollaboration,
      destroyCollaboration: state.destroyCollaboration,
    }))
  );
}

// 创建带认证的 Socket 连接（使用单例模式）
export function useAuthenticatedSocket() {
  const socket = useMemo(() => getAuthenticatedSocket(), []);
  return socket;
}
//初始化协作会话的 Hook 一层封装
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
    if (!socket || !roomId) {
      return;
    }
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
      role: myRole as RoomRole ,
      token,
    });

    return () => {
      // 先通知服务器离开房间
      if (socket?.connected && roomId) {
        socket.emit(ACTIONS.LEAVE, { roomId });
      }
      // 然后销毁协作和断开连接
      destroyCollaboration();
      disconnectSocket();
    };
    // 注意：myRole 不应该在依赖数组中，因为角色变更不应该导致重新初始化连接
    // 角色信息已经在初始化时传递，后续通过 ROLE_CHANGED 事件同步
  }, [socket, roomId, options.username, options.avatarUrl, initCollaboration, destroyCollaboration]);
}

// 连接状态 Hook
export function useConnectionStatus() {
  const connectionStatus = useCollaborationStore(collaborationSelectors.connectionStatus);
  const setConnectionStatus = useCollaborationStore((state) => state.setConnectionStatus);
  const provider = useCollaborationStore(collaborationSelectors.provider);
  const socketRef = useRef<Socket | null>(null);

  // 监听连接状态变化
  useEffect(() => {
    if (!provider) return;

    const socket = (provider as any).socket as Socket;
    socketRef.current = socket;

    let browserOffline = !navigator.onLine;
    // 状态更新函数
    const updateStatus = () => {
      // 优先检查浏览器离线状态
      if (browserOffline) {
        setConnectionStatus('offline');
        return;
      }
       //这里是在读取provider实例身上定义的get方法来获取connected的状态 ：  get connected()
      if (!provider.connected || !socket.connected) {
        setConnectionStatus('offline');
      } else if (!provider.synced) {
        setConnectionStatus('syncing');
      } else {
        setConnectionStatus('online');
      }
    };
    // 监听 socket 连接/断开事件，实时更新状态
    const handleConnect = () => updateStatus();
    const handleDisconnect = () => setConnectionStatus('offline');
        // 监听浏览器在线/离线事件
    const handleOnline = () => {
      browserOffline = false;
      updateStatus();
    };
    const handleOffline = () => {
      browserOffline = true;
      setConnectionStatus('offline');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    updateStatus();
     // 轮询作为兜底（主要用于检测 synced 状态变化）
    const interval = setInterval(updateStatus, 1000);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [provider, setConnectionStatus]);

  return connectionStatus;
}

// 编辑权限 Hook
export function useCanEdit(): boolean {
  const collabCanEdit = useCollaborationStore(collaborationSelectors.canEdit);
  const roomCanEdit = useRoomStore(roomSelectors.canEdit);
  
  // 两个 store 都认为可以编辑才返回 true
  return collabCanEdit && roomCanEdit;
}

// 获取当前用户角色 Hook
export function useCollaborationRole() {
  return useCollaborationStore(collaborationSelectors.role);
}

 //Monaco 编辑器绑定 Hook 返回绑定实例
export function useMonacoBinding(
  editorInstance: editor.IStandaloneCodeEditor | null,
  editorReady: boolean
) {
  const provider = useCollaborationStore(collaborationSelectors.provider);
  const ydoc = useCollaborationStore(collaborationSelectors.ydoc);
  const bindingRef = useRef<MonacoBinding | null>(null);

  useEffect(() => {
    if (!provider || !editorReady || !editorInstance || !ydoc) {
      return;
    }

    const model = editorInstance.getModel();
    if (!model) {
      return;
    }

    const yText = ydoc.getText('monaco');
    const binding = new MonacoBinding(
      yText,
      model,
      new Set([editorInstance]),
      provider.awareness
    );
    bindingRef.current = binding;

    return () => {
      binding.destroy();
      bindingRef.current = null;
    };
  }, [provider, editorReady, editorInstance, ydoc]);

  return bindingRef;
}

// 本地用户状态初始化 Hook
export function useLocalUserState(
  editorInstance: editor.IStandaloneCodeEditor | null,
  editorReady: boolean
) {
  const provider = useCollaborationStore(collaborationSelectors.provider);
  const username = useCollaborationStore(collaborationSelectors.username);
  const avatarUrl = useCollaborationStore(collaborationSelectors.avatarUrl);

  useEffect(() => {
    if (!provider || !editorInstance || !editorReady) return;

    const model = editorInstance.getModel();
    if (!model) return;

    const awareness = provider.awareness;

    // 初始化本地用户状态
    initLocalUserState(awareness, username ?? 'Anonymous', avatarUrl ?? '/image.png');

    // 防抖更新光标
    const debouncedUpdate = createDebounce(50);

    const updateCursor = () => {
      debouncedUpdate(() => updateLocalCursorPosition(awareness, editorInstance));
    };

    // 监听光标变化（使用防抖）
    const cursorDisposable = editorInstance.onDidChangeCursorPosition(updateCursor);
    const selectionDisposable = editorInstance.onDidChangeCursorSelection(updateCursor);
     // 监听内容变化，更新光标位置（内容变化可能导致位置失效）
    const contentDisposable = editorInstance.onDidChangeModelContent(updateCursor);
        // 监听编辑器尺寸变化
    const layoutDisposable = editorInstance.onDidLayoutChange?.(updateCursor);

    updateCursor();

    return () => {
      cursorDisposable.dispose();
      selectionDisposable.dispose();
      contentDisposable.dispose();
      layoutDisposable?.dispose?.();
      awareness.setLocalStateField('cursor', null);
    };
  }, [provider, username, avatarUrl, editorReady, editorInstance]);
}


// 远端光标渲染 Hook
export function useRemoteCursors(
  editorInstance: editor.IStandaloneCodeEditor | null,
  editorReady: boolean,
  editorOption: typeof editor.EditorOption
) {
  const provider = useCollaborationStore(collaborationSelectors.provider);
  const remoteCursors = useCollaborationStore(collaborationSelectors.remoteCursors);
  const setRemoteCursors = useCollaborationStore((state) => state.setRemoteCursors);

  useEffect(() => {
    if (!provider || !editorInstance || !editorReady) return;

    const model = editorInstance.getModel();
    if (!model) return;

    const awareness = provider.awareness;
    let rafId: number | null = null;

    const handleChange = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        try {
          const cursors = calculateRemoteCursors(awareness, editorInstance, editorOption);
          setRemoteCursors(cursors);
        } catch (error) {
          console.warn('渲染远端光标失败:', error);
        }
      });
    };

    awareness.on('change', handleChange);
      // 监听滚动和布局变化
    const scrollDisposable = editorInstance.onDidScrollChange(handleChange);
    const layoutDisposable = editorInstance.onDidLayoutChange?.(handleChange);
    const contentDisposable = editorInstance.onDidChangeModelContent(handleChange);

    handleChange();

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      awareness.off('change', handleChange);
      scrollDisposable?.dispose?.();
      layoutDisposable?.dispose?.();
      contentDisposable?.dispose?.();
    };
  }, [provider, editorReady, editorInstance, editorOption, setRemoteCursors]);

  return remoteCursors;
}

// 协作者列表 Hook
export function useCollaborators(
  onUsersChange?: (users: Map<number, CollaborationUser>) => void
) {
  const provider = useCollaborationStore(collaborationSelectors.provider);
  const collaborators = useCollaborationStore(collaborationSelectors.collaborators);
  const setCollaborators = useCollaborationStore((state) => state.setCollaborators);

  useEffect(() => {
    if (!provider) return;

    const awareness = provider.awareness;

    const updateUsers = () => {
      // 从 awareness 状态中提取协作者信息
      const usersMap = extractCollaborators(awareness);
      setCollaborators(usersMap);
      onUsersChange?.(usersMap);
    };

    awareness.on('change', updateUsers);
    updateUsers();

    return () => {
      awareness.off('change', updateUsers);
    };
  }, [provider, setCollaborators, onUsersChange]);

  return collaborators;
}


  //Yjs 文档内容变化监听 Hook
export function useYjsContentSync(
  onchange?: (code: string) => void,
  setLeetCodes?: (code: string) => void
) {
  const ydoc = useCollaborationStore(collaborationSelectors.ydoc);

  useEffect(() => {
    if (!ydoc) return;

    const yText = ydoc.getText('monaco');

    const handleContentChange = () => {
      const value = yText.toString();
      onchange?.(value);
      setLeetCodes?.(value);
    };

    yText.observe(handleContentChange);
    handleContentChange();

    return () => {
      yText.unobserve(handleContentChange);
    };
  }, [ydoc, onchange, setLeetCodes]);
}


 //获取 Provider 实例
 
export function useProvider() {
  return useCollaborationStore(collaborationSelectors.provider);
}


 // 获取 Y.Doc 实例
 
export function useYDoc() {
  return useCollaborationStore(collaborationSelectors.ydoc);
}
