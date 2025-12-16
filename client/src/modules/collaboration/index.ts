/**
 * Collaboration 模块导出
 */

// Store
export { useCollaborationStore, collaborationSelectors } from './store';

// Hooks
export {
  useCollaboration,
  useInitCollaboration,
  useConnectionStatus,
  useMonacoBinding,
  useLocalUserState,
  useRemoteCursors,
  useCollaborators,
  useYjsContentSync,
  useProvider,
  useYDoc,
} from './hooks';

// Types
export type {
  CollaborationUser,
  CursorPosition,
  RemoteCursor,
  SelectionRange,
  ConnectionStatus,
  CollaborationState,
  CollaborationActions,
  CollaborationStore,
} from './types';

// Services
export {
  generateUserColor,
  initLocalUserState,
  updateLocalCursorPosition,
  calculateRemoteCursors,
  extractCollaborators,
  createDebounce,
} from './services';
