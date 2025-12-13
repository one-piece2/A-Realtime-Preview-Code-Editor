// AI 模块自定义 Hooks
// 封装 AI 聊天相关的 React 逻辑

import { useRef, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { useAiStore, aiSelectors } from './store';
import { streamChat } from './services';


export function useAIChat() {
    // AbortController 用于取消正在进行的流式请求
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
  } = useAiStore(
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
// 当前会话
  const currentConversation = useAiStore(aiSelectors.currentConversation);

  /**
   * 发送消息
   * 如果没有当前会话，会创建一个新的会话
   * 然后发送消息并开始流式请求
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

      // 获取历史消息，转换为 API 格式
      const messages = useAiStore.getState().conversations[conversationId]?.messages || [];
      const chatMessages = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // 添加空的 assistant 消息占位（用于流式更新）
      addMessage(conversationId, { role: 'assistant', content: '' });

      try {
        await streamChat({
          messages: chatMessages,
          context,
          //取消请求的信号
          signal: abortControllerRef.current.signal,
          onChunk: (chunk) => {
            appendStreamingContent(chunk);
          },
          // 流式完成后，把完整内容写入消息历史
          onDone: () => {
            const finalContent = useAiStore.getState().streamingContent;
            const conv = useAiStore.getState().conversations[conversationId!];
            if (conv && conv.messages.length > 0) {
              const lastMessage = conv.messages[conv.messages.length - 1];
              if (lastMessage.role === 'assistant') {
                useAiStore.getState().updateMessage(conversationId!, lastMessage.id, finalContent);
              }
            }
            setStreaming(false);
            resetStreamingContent();
          },
          // 错误处理
          onError: (err) => {
            setError(err.message);
            setStreaming(false);
            resetStreamingContent();
          },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : '请求失败');
        setStreaming(false);
        resetStreamingContent();
      }
    },
    [currentConversationId, createConversation, addMessage, setStreaming, resetStreamingContent, setError, appendStreamingContent]
  );

  /**
   * 停止生成
   * 取消正在进行的流式请求
   */
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStreaming(false);
    resetStreamingContent();
  }, [setStreaming, resetStreamingContent]);

  return {
    // 状态
    // 当前会话
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

 // 会话列表 Hook  用于侧边栏显示和管理会话列表
export function useConversationList() {
  // 获取原始 conversations 对象
  const conversationsMap = useAiStore(aiSelectors.conversations);
  // 当前选中的会话 ID
  const currentId = useAiStore((state) => state.currentConversationId);
  // 操作方法
  const setCurrentConversation = useAiStore((state) => state.setCurrentConversation);
  const deleteConversation = useAiStore((state) => state.deleteConversation);
  const createConversation = useAiStore((state) => state.createConversation);

  // 在组件中计算排序后的列表（使用 useMemo 避免每次渲染都重新计算）
  const conversations = useMemo(
    () => Object.values(conversationsMap).sort((a, b) => b.updatedAt - a.updatedAt),
    [conversationsMap]
  );

  return {
    conversations,
    currentId,
    selectConversation: setCurrentConversation,
    deleteConversation,
    createConversation,
  };
}


 //当前会话消息 Hook  自动处理流式输出时的消息显示
export function useCurrentMessages() {
  const conversation = useAiStore(aiSelectors.currentConversation);
  const streamingContent = useAiStore(aiSelectors.streamingContent);
  const isStreaming = useAiStore(aiSelectors.isStreaming);

  // 如果正在流式输出，把 streamingContent 作为最后一条 assistant 消息的内容
  // 这样 UI 可以实时显示打字机效果
  const messages = conversation?.messages || [];
  //判断是否正在流式输出
  if (isStreaming && streamingContent && messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    //判断最后一条消息是否是assistant
    if (lastMessage.role === 'assistant') {
      return messages.map((msg, idx) =>
        idx === messages.length - 1
          ? { ...msg, content: streamingContent }
          : msg
      );
    }else{
        //不是assistant消息，直接返回
        return messages;
    }
  }
//没有流式输出时，直接返回消息
  return messages;
}