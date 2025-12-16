# Collaboration 模块重构文档

## 概述

本次重构将原本混杂在 UI 组件中的 Yjs 协作逻辑抽离为独立的 `collaboration` 模块，遵循项目现有的模块化架构（参考 `modules/playground`）。

## 目录结构

```
src/modules/collaboration/
├── types.ts      # 类型定义
├── services.ts   # 服务层（底层 Yjs 操作封装）
├── store.ts      # Zustand Store（状态管理）
├── hooks.ts      # React Hooks（UI 层接口）
├── index.ts      # 统一导出
├── yjs/          # Yjs Provider（从原 src/yjs 移动）
│   └── socket-provider.ts
└── README.md     # 本文档
```

---

## 重构前后对比

### 重构前

**问题：**
- `Editor.tsx` 约 620 行，包含大量 Yjs 协作逻辑
- 协作状态（ydoc、provider、awareness）分散在组件内部
- 光标渲染、用户状态同步等逻辑与 UI 耦合
- 难以复用和测试

**原 Editor.tsx 结构：**
```tsx
export default function Editor(props: Props) {
  // 状态定义
  const [cursors, setCursors] = useState<Record<string, any>>({});
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'syncing'>('syncing');
  const bindingRef = useRef<MonacoBinding | null>(null);
  const providerRef = useRef<SocketIOProvider | null>(null);
  const ydoc = useMemo(() => new Y.Doc(), []);

  // 初始化 Provider（~80行）
  useEffect(() => {
    const provider = new SocketIOProvider({ ... });
    // 连接状态监听
    // 浏览器在线/离线事件
    // ...
  }, [socket, roomId, ydoc]);

  // Monaco 绑定（~30行）
  useEffect(() => { ... }, [editorReady, ydoc]);

  // 本地用户状态初始化（~100行）
  useEffect(() => { ... }, [username, avatarUrl, editorReady, ydoc]);

  // 远端光标渲染（~170行）
  useEffect(() => { ... }, [editorReady, ydoc]);

  // 用户信息同步（~30行）
  useEffect(() => { ... }, [editorReady, ydoc, onUsersChange]);

  // 内容同步（~20行）
  useEffect(() => { ... }, [ydoc, onchange, setLeetCodes]);

  // 清理（~10行）
  useEffect(() => { ... }, [ydoc]);

  return ( ... );
}
```

### 重构后

**改进：**
- `Editor.tsx` 约 210 行，只关注 UI 渲染
- 协作逻辑封装在独立模块中
- 通过 Hooks 提供清晰的 API
- 易于复用、测试和维护

**新 Editor.tsx 结构：**
```tsx
import {
  useCollaborationStore,
  useConnectionStatus,
  useMonacoBinding,
  useLocalUserState,
  useRemoteCursors,
  useCollaborators,
  useYjsContentSync,
} from '@/modules/collaboration';

export default function Editor(props: Props) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [editorReady, setEditorReady] = useState(false);

  // 初始化协作
  const initCollaboration = useCollaborationStore((state) => state.initCollaboration);
  const destroyCollaboration = useCollaborationStore((state) => state.destroyCollaboration);

  useEffect(() => {
    if (!socket || !roomId) return;
    initCollaboration({ socket, roomId, username, avatarUrl });
    return () => destroyCollaboration();
  }, [socket, roomId, username, avatarUrl]);

  // 使用 Hooks
  const connectionStatus = useConnectionStatus();
  useMonacoBinding(editorRef.current, editorReady);
  useLocalUserState(editorRef.current, editorReady);
  const remoteCursors = useRemoteCursors(editorRef.current, editorReady, editor.EditorOption);
  useCollaborators(onUsersChange);
  useYjsContentSync(onchange, setLeetCodes);

  return ( ... );
}
```

---

## 模块 API 文档

### Types (`types.ts`)

```typescript
// 用户信息
interface CollaborationUser {
  name: string;
  avatarUrl: string;
  color: string;
  awarenessId?: number;
}

// 光标位置
interface CursorPosition {
  position: number;
  anchor: number;
  head: number;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

// 远端光标渲染信息
interface RemoteCursor {
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
interface SelectionRange {
  top: number;
  left: number;
  width: number;
  height: number;
}

// 连接状态
type ConnectionStatus = 'online' | 'offline' | 'syncing';
```

### Store (`store.ts`)

```typescript
// 状态
interface CollaborationState {
  roomId: string | null;
  username: string | null;
  avatarUrl: string | null;
  connectionStatus: ConnectionStatus;
  ydoc: Y.Doc | null;
  provider: SocketIOProvider | null;
  binding: MonacoBinding | null;
  remoteCursors: Record<string, RemoteCursor>;
  collaborators: Map<number, CollaborationUser>;
}

// 操作
interface CollaborationActions {
  initCollaboration: (params: { socket, roomId, username, avatarUrl }) => void;
  destroyCollaboration: () => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setRemoteCursors: (cursors: Record<string, RemoteCursor>) => void;
  setCollaborators: (collaborators: Map<number, CollaborationUser>) => void;
  getAwareness: () => Awareness | null;
  getYText: () => Y.Text | null;
}
```

### Hooks (`hooks.ts`)

| Hook | 说明 | 参数 | 返回值 |
|------|------|------|--------|
| `useCollaboration()` | 主要协作 Hook | - | `{ roomId, username, avatarUrl, connectionStatus, initCollaboration, destroyCollaboration }` |
| `useInitCollaboration(params)` | 初始化协作会话 | `{ socket, roomId, username, avatarUrl }` | - |
| `useConnectionStatus()` | 连接状态监听 | - | `ConnectionStatus` |
| `useMonacoBinding(editor, ready)` | Monaco 编辑器绑定 | `editor`, `editorReady` | `bindingRef` |
| `useLocalUserState(editor, ready)` | 本地用户状态同步 | `editor`, `editorReady` | - |
| `useRemoteCursors(editor, ready, option)` | 远端光标渲染 | `editor`, `editorReady`, `EditorOption` | `Record<string, RemoteCursor>` |
| `useCollaborators(callback?)` | 协作者列表 | `onUsersChange?` | `Map<number, CollaborationUser>` |
| `useYjsContentSync(onchange?, setLeetCodes?)` | 内容变化同步 | `onchange?`, `setLeetCodes?` | - |
| `useProvider()` | 获取 Provider | - | `SocketIOProvider \| null` |
| `useYDoc()` | 获取 Y.Doc | - | `Y.Doc \| null` |

### Services (`services.ts`)

```typescript
// 生成用户颜色
generateUserColor(clientId: number): string

// 初始化本地用户 awareness 状态
initLocalUserState(awareness: Awareness, username: string, avatarUrl: string): void

// 更新本地光标位置
updateLocalCursorPosition(awareness: Awareness, editor: IStandaloneCodeEditor): void

// 计算远端光标渲染数据
calculateRemoteCursors(awareness: Awareness, editor: IStandaloneCodeEditor, editorOption): Record<string, RemoteCursor>

// 提取协作者信息
extractCollaborators(awareness: Awareness): Map<number, CollaborationUser>

// 创建防抖函数
createDebounce(delay?: number): (fn: () => void) => void
```

---

## 使用指南

### 基本使用

```tsx
import {
  useCollaborationStore,
  useConnectionStatus,
  useMonacoBinding,
  useLocalUserState,
  useRemoteCursors,
  useCollaborators,
  useYjsContentSync,
  type CollaborationUser,
} from '@/modules/collaboration';

function MyEditor({ socket, roomId, username, avatarUrl }) {
  const editorRef = useRef(null);
  const [editorReady, setEditorReady] = useState(false);

  // 1. 初始化协作
  const initCollaboration = useCollaborationStore((s) => s.initCollaboration);
  const destroyCollaboration = useCollaborationStore((s) => s.destroyCollaboration);

  useEffect(() => {
    if (!socket || !roomId) return;
    initCollaboration({ socket, roomId, username, avatarUrl });
    return () => destroyCollaboration();
  }, [socket, roomId]);

  // 2. 使用各种 Hooks
  const connectionStatus = useConnectionStatus();
  useMonacoBinding(editorRef.current, editorReady);
  useLocalUserState(editorRef.current, editorReady);
  const remoteCursors = useRemoteCursors(editorRef.current, editorReady, editor.EditorOption);
  useCollaborators((users) => console.log('用户变化:', users));
  useYjsContentSync((code) => console.log('内容变化:', code));

  // 3. 渲染
  return (
    <div>
      {/* 连接状态 */}
      <div>{connectionStatus}</div>
      
      {/* 编辑器 */}
      <MonacoEditor onMount={(e) => { editorRef.current = e; setEditorReady(true); }} />
      
      {/* 远端光标 */}
      {Object.entries(remoteCursors).map(([id, cursor]) => (
        <CursorOverlay key={id} cursor={cursor} />
      ))}
    </div>
  );
}
```

### 仅获取协作状态

```tsx
import { useCollaborationStore, collaborationSelectors } from '@/modules/collaboration';

function StatusBar() {
  const connectionStatus = useCollaborationStore(collaborationSelectors.connectionStatus);
  const collaborators = useCollaborationStore(collaborationSelectors.collaborators);

  return (
    <div>
      <span>状态: {connectionStatus}</span>
      <span>在线人数: {collaborators.size}</span>
    </div>
  );
}
```

### 直接访问 Yjs 实例

```tsx
import { useProvider, useYDoc } from '@/modules/collaboration';

function AdvancedFeature() {
  const provider = useProvider();
  const ydoc = useYDoc();

  const handleCustomSync = () => {
    if (!provider || !ydoc) return;
    
    const awareness = provider.awareness;
    const yText = ydoc.getText('monaco');
    
    // 自定义操作...
  };

  return <button onClick={handleCustomSync}>自定义同步</button>;
}
```

---

## 迁移指南

### 从旧代码迁移

1. **移除旧导入：**
```diff
- import * as Y from 'yjs';
- import { MonacoBinding } from 'y-monaco';
- import { SocketIOProvider } from '@/yjs/socket-provider';
+ import { useCollaborationStore, useConnectionStatus, ... } from '@/modules/collaboration';
```

2. **移除组件内的 Yjs 状态：**
```diff
- const [cursors, setCursors] = useState({});
- const [connectionStatus, setConnectionStatus] = useState('syncing');
- const bindingRef = useRef(null);
- const providerRef = useRef(null);
- const ydoc = useMemo(() => new Y.Doc(), []);
+ const connectionStatus = useConnectionStatus();
+ const remoteCursors = useRemoteCursors(editorRef.current, editorReady, editor.EditorOption);
```

3. **移除大量 useEffect：**
```diff
- useEffect(() => { /* Provider 初始化 */ }, [...]);
- useEffect(() => { /* Monaco 绑定 */ }, [...]);
- useEffect(() => { /* 本地用户状态 */ }, [...]);
- useEffect(() => { /* 远端光标渲染 */ }, [...]);
- useEffect(() => { /* 用户信息同步 */ }, [...]);
- useEffect(() => { /* 内容同步 */ }, [...]);
- useEffect(() => { /* 清理 */ }, [...]);

+ // 初始化协作
+ useEffect(() => {
+   if (!socket || !roomId) return;
+   initCollaboration({ socket, roomId, username, avatarUrl });
+   return () => destroyCollaboration();
+ }, [socket, roomId, username, avatarUrl]);
+
+ // 使用 Hooks
+ useMonacoBinding(editorRef.current, editorReady);
+ useLocalUserState(editorRef.current, editorReady);
+ useCollaborators(onUsersChange);
+ useYjsContentSync(onchange, setLeetCodes);
```

---

## 注意事项

1. **Provider 路径变更：** `socket-provider.ts` 已移动到 `@/modules/collaboration/yjs/socket-provider`

2. **类型导入：** 使用 `CollaborationUser` 替代内联类型定义
   ```tsx
   import type { CollaborationUser } from '@/modules/collaboration';
   ```

3. **Store 持久化：** 协作状态不会持久化到 localStorage（与 playground 模块不同）

4. **清理：** 调用 `destroyCollaboration()` 会自动清理 ydoc、provider、binding

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/modules/collaboration/types.ts` | 新增 | 类型定义 |
| `src/modules/collaboration/services.ts` | 新增 | 服务层 |
| `src/modules/collaboration/store.ts` | 新增 | Zustand Store |
| `src/modules/collaboration/hooks.ts` | 新增 | React Hooks |
| `src/modules/collaboration/index.ts` | 新增 | 统一导出 |
| `src/modules/collaboration/yjs/socket-provider.ts` | 移动 | 从 `src/yjs/` 移动 |
| `src/modules/index.ts` | 修改 | 添加 collaboration 导出 |
| `src/components/Editor.tsx` | 重构 | 620行 → 210行 |
| `src/pages/EditorSigelPage.tsx` | 修改 | 使用新类型 |
