# React Context → Zustand + Context 迁移指南

## 📐 架构图描述

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              应用层 (App.tsx)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    GlobalConfigProvider                              │   │
│  │                   (仅全局配置: theme, env, language)                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         UI 组件层                                    │   │
│  │                                                                      │   │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │   │
│  │   │  Header  │  │  Editor  │  │ FileTree │  │  Panel   │  ...      │   │
│  │   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘           │   │
│  │        │             │             │             │                   │   │
│  └────────┼─────────────┼─────────────┼─────────────┼───────────────────┘   │
│           │             │             │             │                        │
│           ▼             ▼             ▼             ▼                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Hooks 层                                     │   │
│  │                                                                      │   │
│  │   useAuth()    usePlayground()    useFiles()    useTheme()          │   │
│  │   useUser()    useFileList()      useDependencies()  ...            │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Store Registry (核心模块)                       │   │
│  │                                                                      │   │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │   │
│  │   │ Auth Store  │  │ Playground  │  │  Future...  │                │   │
│  │   │  (Zustand)  │  │   Store     │  │   Stores    │                │   │
│  │   └─────────────┘  └─────────────┘  └─────────────┘                │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Services 层                                   │   │
│  │                                                                      │   │
│  │   API 调用    本地存储    业务逻辑    工具函数                         │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 📁 重构后的项目目录结构

```
src/
├── core/                          # 核心模块
│   ├── config/                    # 全局配置
│   │   ├── GlobalConfigContext.tsx  # 全局配置 Context (主题/语言/环境)
│   │   └── index.ts
│   ├── store/                     # Store 管理
│   │   ├── registry.ts            # Store 注册中心
│   │   ├── middleware.ts          # Zustand 中间件
│   │   └── index.ts
│   └── index.ts
│
├── modules/                       # 业务模块
│   ├── auth/                      # 认证模块
│   │   ├── types.ts               # 类型定义
│   │   ├── services.ts            # 业务逻辑/API
│   │   ├── store.ts               # Zustand store
│   │   ├── hooks.ts               # UI 层 hooks
│   │   └── index.ts
│   │
│   ├── playground/                # 编辑器模块
│   │   ├── types.ts
│   │   ├── services.ts
│   │   ├── store.ts
│   │   ├── hooks.ts
│   │   └── index.ts
│   │
│   └── index.ts                   # 模块统一导出
│
├── components/                    # UI 组件
│   ├── examples/                  # 示例组件
│   │   ├── AuthExample.tsx
│   │   ├── PlaygroundExample.tsx
│   │   └── index.ts
│   └── ...
│
├── App.tsx                        # 应用入口
└── App.new.tsx                    # 重构后的应用入口 (参考)
```

## 🔄 迁移步骤清单

### 阶段 1: 准备工作

- [ ] **1.1 安装依赖**
  ```bash
  npm install zustand
  ```

- [ ] **1.2 创建目录结构**
  ```bash
  mkdir -p src/core/config src/core/store src/modules/auth src/modules/playground
  ```

### 阶段 2: 核心模块

- [ ] **2.1 创建全局配置 Context**
  - 文件: `src/core/config/GlobalConfigContext.tsx`
  - 仅包含: theme, language, env, apiBaseUrl
  - 禁止包含任何业务逻辑状态

- [ ] **2.2 创建 Store Registry**
  - 文件: `src/core/store/registry.ts`
  - 实现: registerStore, getStore, hasStore

- [ ] **2.3 创建中间件**
  - 文件: `src/core/store/middleware.ts`
  - 实现: logger, persist, subscribeWithSelector

### 阶段 3: 业务模块迁移

- [ ] **3.1 迁移 Auth 模块**
  1. 创建 `types.ts` - 定义 User, AuthState, AuthActions
  2. 创建 `services.ts` - 提取 API 调用和业务逻辑
  3. 创建 `store.ts` - 使用 Zustand 创建 store
  4. 创建 `hooks.ts` - 封装 UI 层使用的 hooks
  5. 注册到 Store Registry

- [ ] **3.2 迁移 Playground 模块**
  1. 创建 `types.ts` - 定义 Files, EditorFile, Dependencies
  2. 创建 `services.ts` - 提取文件操作、Hash 同步等逻辑
  3. 创建 `store.ts` - 使用 Zustand 创建 store
  4. 创建 `hooks.ts` - 封装 UI 层使用的 hooks
  5. 注册到 Store Registry

### 阶段 4: 更新 UI 组件

- [ ] **4.1 更新 App.tsx**
  - 替换 PlaygroundProvider → GlobalConfigProvider
  - 替换 AuthProvider → AuthInitializer
  - 移除 ThemeSwitcher (已内置到 GlobalConfigProvider)

- [ ] **4.2 更新使用 Context 的组件**

  | 旧代码 | 新代码 |
  |--------|--------|
  | `useContext(PlaygroundContext)` | `usePlayground()` |
  | `useContext(AuthContext)` | `useAuth()` |
  | `const { theme } = useContext(PlaygroundContext)` | `const { theme } = useTheme()` |
  | `const { files, setFiles } = useContext(PlaygroundContext)` | `const { files, setFiles } = usePlayground()` |

- [ ] **4.3 逐个替换组件中的 Context 调用**
  - Header.tsx
  - Editor.tsx
  - FileTree.tsx
  - FileNameList.tsx
  - ... (其他组件)

### 阶段 5: 测试与清理

- [ ] **5.1 测试所有功能**
  - 认证流程 (登录/注册/登出)
  - 文件操作 (创建/删除/重命名)
  - 主题切换
  - URL Hash 同步

- [ ] **5.2 删除旧的 Context 文件**
  - `src/Context/playgroundcontent.tsx`
  - `src/Context/AuthContext/`

- [ ] **5.3 更新 App.tsx**
  - 将 `App.new.tsx` 内容合并到 `App.tsx`
  - 删除 `App.new.tsx`

## ⚠️ 注意事项

### 1. 避免过度渲染

```typescript
// ❌ 错误: 订阅整个 store，任何状态变化都会导致重渲染
const state = usePlaygroundStore();

// ✅ 正确: 使用选择器只订阅需要的状态
const files = usePlaygroundStore((state) => state.files);

// ✅ 更好: 使用 useShallow 订阅多个状态
const { files, selectedFileName } = usePlaygroundStore(
  useShallow((state) => ({
    files: state.files,
    selectedFileName: state.selectedFileName,
  }))
);
```

### 2. Store 组合方式

```typescript
// 方式 1: 在 hooks 层组合多个 store
export function useEditorState() {
  const files = usePlaygroundStore((s) => s.files);
  const user = useAuthStore((s) => s.user);
  return { files, user };
}

// 方式 2: 使用 Store Registry 跨 store 通信
import { getStore } from '@/core/store';

const authStore = getStore('auth');
const currentUser = authStore?.getState().user;
```

### 3. 异步操作处理

```typescript
// store.ts 中的异步 action
login: async (email, password) => {
  set({ isLoading: true, authError: null });
  try {
    const response = await loginApi({ email, password });
    set({ user: response.user, isLoading: false });
  } catch (error) {
    set({ isLoading: false, authError: error.message });
    throw error;
  }
},
```

### 4. 持久化配置

```typescript
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set) => ({
      // state and actions
    }),
    {
      name: 'store-name',
      partialize: (state) => ({ 
        // 只持久化部分状态
        theme: state.theme 
      }),
    }
  )
);
```

### 5. DevTools 调试

```typescript
import { devtools } from 'zustand/middleware';

const useStore = create(
  devtools(
    (set) => ({
      // state and actions
    }),
    { name: 'store-name' }
  )
);
```

## 📝 示例代码对比

### 旧代码 (Context)

```tsx
// 组件中使用
import { useContext } from 'react';
import { PlaygroundContext } from '@/Context/playgroundcontent';

function Editor() {
  const { files, selectedFileName, setFiles, theme } = useContext(PlaygroundContext);
  // ...
}
```

### 新代码 (Zustand + Hooks)

```tsx
// 组件中使用
import { usePlayground } from '@/modules/playground';
import { useTheme } from '@/core/config';

function Editor() {
  const { files, selectedFileName, setFiles } = usePlayground();
  const { theme } = useTheme();
  // ...
}
```

## 🎯 核心原则

1. **Context 只做全局配置** - 主题、语言、环境变量
2. **业务状态用 Zustand** - 用户、文件、依赖等
3. **UI 通过 Hooks 访问** - 不直接导入 store
4. **Services 封装业务逻辑** - API 调用、数据处理
5. **模块独立** - 每个模块自包含，可独立测试
