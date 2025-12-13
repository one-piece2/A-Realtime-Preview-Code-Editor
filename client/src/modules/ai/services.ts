// AI 模块业务服务
// 封装 AI 聊天和代码补全的业务逻辑

import { api } from '@/utils/axios';
import type { Message } from './type';
import { useAiStore } from './store';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

// 流式聊天请求配置
export interface ChatStreamOptions {
    messages: Pick<Message, 'role' | 'content'>[];
    //上下文
    context?: string;
    //流式chunk的回调
    onChunk: (content: string) => void;
    //流式完成的回调
    onDone: () => void;
    onError: (error: Error) => void;
    //取消请求的信号
    signal?: AbortSignal;
}

// 获取认证头 为了fetch请求
function getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
}


//流式聊天请求（SSE）

export async function streamChat(options: ChatStreamOptions): Promise<void> {
    const { messages, context, onChunk, onDone, onError, signal } = options;

    try {
        const response = await fetch(`${API_BASE_URL}/ai/chat/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
            body: JSON.stringify({ messages, context }),
            //这是取消请求的信号
            signal,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        // response.body 的类型是：ReadableStream<Uint8Array>  可以读取
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('无法获取响应流');
        }
        //这是将Uint8Array转换为字符串的解码器
        const decoder = new TextDecoder();

        // 缓冲区：用于处理分包问题
        // SSE 数据格式: "data: {...}\n\n"
        // 可能一个 chunk 只包含 "data: {" 而 "...}\n\n" 在下一个 chunk
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // 将新数据追加到缓冲区
            buffer += decoder.decode(value, { stream: true });

            // 按 \n\n 分割
            const parts = buffer.split('\n\n');

            // 最后一部分可能是不完整的，保留在缓冲区
            buffer = parts.pop() || '';

            // 处理完整的消息
            for (const part of parts) {
                const lines = part.split('\n');
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
                            // JSON 解析错误，跳过这条消息
                            console.warn('SSE parse error:', e);
                        }
                    }
                }
            }
        }

        // 处理缓冲区中剩余的数据
        if (buffer.trim()) {
            const lines = buffer.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.content) {
                            onChunk(data.content);
                        }
                    } catch (e) {
                        // 忽略
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


 //代码补全请求
export async function getCompletion(params: {
    prefix: string;
    suffix: string;
    language?: string;
    filename?: string;
}): Promise<string> {
    const response = await api.post('/ai/completion', params);

    if (response.data.success) {
        return response.data.data.completion;
    }

    throw new Error(response.data.error || '补全请求失败');
}


 //发送消息并处理流式响应（业务逻辑封装）
export async function sendMessageWithStream(
    conversationId: string,
    userMessage: string,
    //上下文
    context?: string,
    //取消请求的信号
    abortSignal?: AbortSignal
): Promise<void> {
    const store = useAiStore.getState();

    // 添加用户消息
    store.addMessage(conversationId, {
        role: 'user',
        content: userMessage,
    });

    // 获取当前会话
    const conversation = store.conversations[conversationId];
    if (!conversation) {
        store.setError('会话不存在');
        return;
    }

    // 开始流式响应
    store.setStreaming(true);
    store.resetStreamingContent();
    store.setError(null);

    // 准备发送的消息 这是为了转换格式  给了当前发送的消息+历史消息
    const chatMessages = conversation.messages.map((m) => ({
        role: m.role,
        content: m.content,
    }));

    // 先添加一个空的 assistant 消息占位 这是让流失输出结束后 放入消息历史的地方
    store.addMessage(conversationId, {
        role: 'assistant',
        content: '',
    });

    try {
        await streamChat({
            
            messages: chatMessages,
            context,
            signal: abortSignal,
            //更新流式消息
            onChunk: (chunk) => {
                store.appendStreamingContent(chunk);
            },
            //流式完成 把完整消息内容更新进入该对话的历史消息
            onDone: () => {
               //finalContent：流式完成后的最终内容
                const finalContent = useAiStore.getState().streamingContent;
                //conv：当前会话
                const conv = useAiStore.getState().conversations[conversationId];
                if (conv && conv.messages.length > 0) {
                    const lastMessage = conv.messages[conv.messages.length - 1];
                    if (lastMessage.role === 'assistant') {
                        useAiStore.getState().updateMessage(conversationId, lastMessage.id, finalContent);
                    }
                }
                store.setStreaming(false);
                store.resetStreamingContent();
            },
            //错误处理
            onError: (err) => {
                store.setError(err.message);
                store.setStreaming(false);
                store.resetStreamingContent();
            },
        });
    } catch (err) {
        store.setError(err instanceof Error ? err.message : '请求失败');
        store.setStreaming(false);
        store.resetStreamingContent();
    }
}


 //快捷发送消息（自动创建会话） 
export async function sendMessage(
    message: string,
    context?: string,
    abortSignal?: AbortSignal
): Promise<string> {
    const store = useAiStore.getState();

    // 如果没有当前会话，创建一个
    let conversationId = store.currentConversationId;
    if (!conversationId) {
        conversationId = store.createConversation();
    }

    await sendMessageWithStream(conversationId, message, context, abortSignal);
    return conversationId;
}

// 导出服务对象
export const aiService = {
    streamChat,
    getCompletion,
    sendMessageWithStream,
    sendMessage,
};
