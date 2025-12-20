# Phase 2: 前端核心逻辑 (Hooks & Storage)

> 实现记忆与流式请求的大脑

## 1. 目标概述

构建 AI 聊天功能的核心逻辑层，包括：
- **Zustand Store**: 管理 AI 聊天状态
- **useAIChat Hook**: 处理流式请求和消息管理
- **useChatStorage Hook**: 本地持久化聊天记录

---

## 2. 目录结构

```
client/src/modules/ai/
├── index.ts              # 模块导出
├── store.ts              # Zustand Store
├── hooks.ts              # 自定义 Hooks
├── services.ts           # API 服务层
└── types.ts              # 类型定义
```

---

## 3. 实施步骤

### 3.1 类型定义

**文件**: `client/src/modules/ai/types.ts`

```typescript
// 消息角色
export type MessageRole = 'user' | 'assistant' | 'system';

// 单条消息
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  // 可选：附件信息
  attachments?: Attachment[];
}

// 附件类型
export interface Attachment {
  id: string;
  name: string;
  type: 'file' | 'code' | 'image';
  content: string; // 文件内容或摘要
  size?: number;
}

// 会话
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

// Store 状态
export interface AIState {
  // 当前会话
  currentConversationId: string | null;
  conversations: Record<string, Conversation>;
  
  // 流式状态
  isStreaming: boolean;
  streamingContent: string;
  
  // 错误状态
  error: string | null;
}

// Store Actions
export interface AIActions {
  // 会话管理
  createConversation: () => string;
  deleteConversation: (id: string) => void;
  setCurrentConversation: (id: string | null) => void;
  
  // 消息管理
  addMessage: (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (conversationId: string, messageId: string, content: string) => void;
  clearMessages: (conversationId: string) => void;
  
  // 流式状态
  setStreaming: (isStreaming: boolean) => void;
  appendStreamingContent: (content: string) => void;
  resetStreamingContent: () => void;
  
  // 错误处理
  setError: (error: string | null) => void;
  
  // 重置
  reset: () => void;
}

export type AIStore = AIState & AIActions;
```

### 3.2 创建 Zustand Store

**文件**: `client/src/modules/ai/store.ts`

```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { registerStore } from '@/core/store';
import type { AIStore, AIState, Conversation, Message } from './types';

// 生成唯一 ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// 初始状态
const initialState: AIState = {
  currentConversationId: null,
  conversations: {},
  isStreaming: false,
  streamingContent: '',
  error: null,
};

// 创建 Store
export const useAIStore = create<AIStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // 创建新会话
        createConversation: () => {
          const id = generateId();
          const conversation: Conversation = {
            id,
            title: '新对话',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          set((state) => ({
            conversations: {
              ...state.conversations,
              [id]: conversation,
            },
            currentConversationId: id,
          }));

          return id;
        },

        // 删除会话
        deleteConversation: (id: string) => {
          set((state) => {
            const { [id]: removed, ...rest } = state.conversations;
            const newCurrentId =
              state.currentConversationId === id
                ? Object.keys(rest)[0] || null
                : state.currentConversationId;

            return {
              conversations: rest,
              currentConversationId: newCurrentId,
            };
          });
        },

        // 设置当前会话
        setCurrentConversation: (id: string | null) => {
          set({ currentConversationId: id });
        },

        // 添加消息
        addMessage: (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>) => {
          const newMessage: Message = {
            ...message,
            id: generateId(),
            timestamp: Date.now(),
          };

          set((state) => {
            const conversation = state.conversations[conversationId];
            if (!conversation) return state;

            // 自动生成标题（使用第一条用户消息）
            let title = conversation.title;
            if (conversation.messages.length === 0 && message.role === 'user') {
              title = message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '');
            }

            return {
              conversations: {
                ...state.conversations,
                [conversationId]: {
                  ...conversation,
                  title,
                  messages: [...conversation.messages, newMessage],
                  updatedAt: Date.now(),
                },
              },
            };
          });
        },

        // 更新消息内容
        updateMessage: (conversationId: string, messageId: string, content: string) => {
          set((state) => {
            const conversation = state.conversations[conversationId];
            if (!conversation) return state;

            return {
              conversations: {
                ...state.conversations,
                [conversationId]: {
                  ...conversation,
                  messages: conversation.messages.map((msg) =>
                    msg.id === messageId ? { ...msg, content } : msg
                  ),
                  updatedAt: Date.now(),
                },
              },
            };
          });
        },

        // 清空消息
        clearMessages: (conversationId: string) => {
          set((state) => {
            const conversation = state.conversations[conversationId];
            if (!conversation) return state;

            return {
              conversations: {
                ...state.conversations,
                [conversationId]: {
                  ...conversation,
                  messages: [],
                  updatedAt: Date.now(),
                },
              },
            };
          });
        },

        // 流式状态管理
        setStreaming: (isStreaming: boolean) => set({ isStreaming }),
        
        appendStreamingContent: (content: string) => {
          set((state) => ({
            streamingContent: state.streamingContent + content,
          }));
        },
        
        resetStreamingContent: () => set({ streamingContent: '' }),

        // 错误处理
        setError: (error: string | null) => set({ error }),

        // 重置
        reset: () => set(initialState),
      }),
      {
        name: 'ai-store',
        partialize: (state) => ({
          conversations: state.conversations,
          currentConversationId: state.currentConversationId,
        }),
      }
    )
  )
);

// 注册到全局 store registry
registerStore('ai', useAIStore);

// 选择器
export const aiSelectors = {
  currentConversation: (state: AIStore) =>
    state.currentConversationId ? state.conversations[state.currentConversationId] : null,
  conversationList: (state: AIStore) =>
    Object.values(state.conversations).sort((a, b) => b.updatedAt - a.updatedAt),
  isStreaming: (state: AIStore) => state.isStreaming,
  streamingContent: (state: AIStore) => state.streamingContent,
  error: (state: AIStore) => state.error,
};
```

### 3.3 API 服务层

**文件**: `client/src/modules/ai/services.ts`

```typescript
import { axiosInstance } from '@/utils/axios';
import type { Message } from './types';

const API_BASE = '/ai';

export interface ChatStreamOptions {
  messages: Pick<Message, 'role' | 'content'>[];
  context?: string;
  onChunk: (content: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
}

/**
 * 流式聊天请求
 */
export async function streamChat(options: ChatStreamOptions): Promise<void> {
  const { messages, context, onChunk, onDone, onError, signal } = options;

  try {
    const response = await fetch(`${axiosInstance.defaults.baseURL}${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 添加认证头（如果需要）
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ messages, context }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const lines = text.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.error) {
              throw new Error(data.error);
            }
            
            if (data.done) {
              onDone();
              return;
            }
            
            if (data.content) {
              onChunk(data.content);
            }
          } catch (e) {
            // 忽略 JSON 解析错误（可能是不完整的数据）
          }
        }
      }
    }

    onDone();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // 用户取消请求
      onDone();
      return;
    }
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * 代码补全请求
 */
export async function getCompletion(params: {
  prefix: string;
  suffix: string;
  language?: string;
  filename?: string;
}): Promise<string> {
  const response = await axiosInstance.post(`${API_BASE}/completion`, params);
  
  if (response.data.success) {
    return response.data.data.completion;
  }
  
  throw new Error(response.data.error || 'Completion failed');
}

// 获取认证头
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
```

### 3.4 自定义 Hooks

**文件**: `client/src/modules/ai/hooks.ts`

```typescript
import { useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAIStore, aiSelectors } from './store';
import { streamChat } from './services';
import type { Message } from './types';

/**
 * 主要的 AI 聊天 Hook
 */
export function useAIChat() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    currentConversationId,
    isStreaming,
    streamingContent,
    error,
    createConversation,
    addMessage,
    setStreaming,
    appendStreamingContent,
    resetStreamingContent,
    setError,
  } = useAIStore(
    useShallow((state) => ({
      currentConversationId: state.currentConversationId,
      isStreaming: state.isStreaming,
      streamingContent: state.streamingContent,
      error: state.error,
      createConversation: state.createConversation,
      addMessage: state.addMessage,
      setStreaming: state.setStreaming,
      appendStreamingContent: state.appendStreamingContent,
      resetStreamingContent: state.resetStreamingContent,
      setError: state.setError,
    }))
  );

  const currentConversation = useAIStore(aiSelectors.currentConversation);

  /**
   * 发送消息
   */
  const sendMessage = useCallback(
    async (content: string, context?: string) => {
      // 确保有当前会话
      let conversationId = currentConversationId;
      if (!conversationId) {
        conversationId = createConversation();
      }

      // 添加用户消息
      addMessage(conversationId, { role: 'user', content });

      // 准备流式请求
      setStreaming(true);
      resetStreamingContent();
      setError(null);

      // 创建 AbortController
      abortControllerRef.current = new AbortController();

      // 获取历史消息
      const messages = useAIStore.getState().conversations[conversationId]?.messages || [];
      const chatMessages = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // 临时消息 ID（用于流式更新）
      const tempMessageId = `temp-${Date.now()}`;
      addMessage(conversationId, { role: 'assistant', content: '' });

      try {
        await streamChat({
          messages: chatMessages,
          context,
          signal: abortControllerRef.current.signal,
          onChunk: (chunk) => {
            appendStreamingContent(chunk);
          },
          onDone: () => {
            // 流式完成后，更新最后一条消息
            const finalContent = useAIStore.getState().streamingContent;
            const conv = useAIStore.getState().conversations[conversationId!];
            if (conv && conv.messages.length > 0) {
              const lastMessage = conv.messages[conv.messages.length - 1];
              useAIStore.getState().updateMessage(conversationId!, lastMessage.id, finalContent);
            }
            setStreaming(false);
            resetStreamingContent();
          },
          onError: (err) => {
            setError(err.message);
            setStreaming(false);
          },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStreaming(false);
      }
    },
    [currentConversationId, createConversation, addMessage, setStreaming, resetStreamingContent, setError, appendStreamingContent]
  );

  /**
   * 停止生成
   */
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStreaming(false);
  }, [setStreaming]);

  return {
    // 状态
    conversation: currentConversation,
    messages: currentConversation?.messages || [],
    isStreaming,
    streamingContent,
    error,
    
    // 操作
    sendMessage,
    stopGeneration,
    createConversation,
  };
}

/**
 * 会话列表 Hook
 */
export function useConversationList() {
  const conversations = useAIStore(aiSelectors.conversationList);
  const currentId = useAIStore((state) => state.currentConversationId);
  const setCurrentConversation = useAIStore((state) => state.setCurrentConversation);
  const deleteConversation = useAIStore((state) => state.deleteConversation);
  const createConversation = useAIStore((state) => state.createConversation);

  return {
    conversations,
    currentId,
    selectConversation: setCurrentConversation,
    deleteConversation,
    createConversation,
  };
}

/**
 * 当前会话消息 Hook
 */
export function useCurrentMessages() {
  const conversation = useAIStore(aiSelectors.currentConversation);
  const streamingContent = useAIStore(aiSelectors.streamingContent);
  const isStreaming = useAIStore(aiSelectors.isStreaming);

  // 如果正在流式输出，附加临时内容到最后一条消息
  const messages = conversation?.messages || [];
  
  if (isStreaming && streamingContent && messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'assistant') {
      return messages.map((msg, idx) =>
        idx === messages.length - 1
          ? { ...msg, content: streamingContent }
          : msg
      );
    }
  }

  return messages;
}
```

### 3.5 模块导出

**文件**: `client/src/modules/ai/index.ts`

```typescript
// Store
export { useAIStore, aiSelectors } from './store';

// Hooks
export { useAIChat, useConversationList, useCurrentMessages } from './hooks';

// Services
export { streamChat, getCompletion } from './services';

// Types
export type {
  Message,
  MessageRole,
  Conversation,
  Attachment,
  AIState,
  AIActions,
  AIStore,
} from './types';
```

---

## 4. 使用示例

```tsx
import { useAIChat, useCurrentMessages } from '@/modules/ai';

function ChatComponent() {
  const { sendMessage, isStreaming, stopGeneration } = useAIChat();
  const messages = useCurrentMessages();
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim() && !isStreaming) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.id} className={msg.role}>
          {msg.content}
        </div>
      ))}
      
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      
      {isStreaming ? (
        <button onClick={stopGeneration}>停止</button>
      ) : (
        <button onClick={handleSend}>发送</button>
      )}
    </div>
  );
}
```

---

## 5. 下一步

完成 Phase 2 后，进入 **Phase 3: 智能对话侧边栏**，实现完整的 Chat UI 组件。
