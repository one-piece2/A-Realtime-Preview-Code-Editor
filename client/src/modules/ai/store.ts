import type { AIStore, AIState, Conversation, Message } from './type';
import { registerStore } from '@/core/store';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

const generateId = () => uuidv4();

// 初始状态
const initialState: AIState = {
  currentConversationId: null,
  conversations: {},
  isStreaming: false,
  streamingContent: '',
  error: null,
};

export const useAiStore = create<AIStore>()(
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
            const { [id]: _, ...rest } = state.conversations;
            return {
              conversations: rest,
              currentConversationId:
                state.currentConversationId === id ? null : state.currentConversationId,
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

            return {
              conversations: {
                ...state.conversations,
                [conversationId]: {
                  ...conversation,
                  messages: [...conversation.messages, newMessage],
                  updatedAt: Date.now(),
                },
              },
            };
          });
        },

        // 更新消息
        updateMessage: (conversationId: string, messageId: string, content: string) => {
          set((state) => {
            //获取当前会话内容
            const conversation = state.conversations[conversationId];
            if (!conversation) return state;

            return {
              conversations: {
                ...state.conversations,
                //更新这个对话中的消息
                [conversationId]: {
                    //会话中的内容
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

        // 清空会话中的消息
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

        // 流式状态
        setStreaming: (isStreaming: boolean) => {
          set({ isStreaming });
        },
      //增加流式内容
        appendStreamingContent: (content: string) => {
          set((state) => ({
            streamingContent: state.streamingContent + content,
          }));
        },
      //重置流式内容
        resetStreamingContent: () => {
          set({ streamingContent: '' });
        },

        // 错误处理
        setError: (error: string | null) => {
          set({ error });
        },

        // 重置
        reset: () => {
          set(initialState);
        },
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
registerStore('ai', useAiStore);
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
