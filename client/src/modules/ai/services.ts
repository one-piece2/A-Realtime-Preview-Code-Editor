// AI 模块业务服务层
// 只负责纯 API 调用，不依赖 store
// API 接口从 @/api/ai 导入

import { aiApi } from '@/api/ai/ai';
import type { Completion } from '@/api/ai/types';
import type { Message } from './type';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 流式聊天请求配置
export interface ChatStreamOptions {
    messages: Pick<Message, 'role' | 'content'>[];
    // 上下文
    context?: string;
    // 流式 chunk 的回调
    onChunk: (content: string) => void;
    // 流式完成的回调
    onDone: () => void;
    // 错误回调
    onError: (error: Error) => void;
    // 取消请求的信号
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

// 代码补全请求（使用封装的 aiApi）
export async function getCompletion(params: Completion, signal?: AbortSignal): Promise<string> {
    const response = await aiApi.getCompletion(params, signal);

    if (response.success) {
        return response.data.completion;
    }

    throw new Error(response.error || '补全请求失败');
}

// 导出服务对象（只包含纯 API 调用）
export const aiService = {
    streamChat,
    getCompletion,
};
