
import {  useRef } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { useCurrentMessages, useAIChat } from '@/modules/ai';
import { ChatMessage } from './ChatMessage';

export function ChatMessages() {
    const messages = useCurrentMessages();
    const { isStreaming, error } = useAIChat();
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    // 空状态
    if (messages.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                    <Bot className="size-8 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">AI 编程助手</h4>
                <p className="text-sm text-muted-foreground">
                    我可以帮你解答编程问题、审查代码、生成代码片段
                </p>
            </div>
        );
    }

    // 计算总项数：消息 + 可选的流式提示 + 可选的错误提示
    const extraItemCount = (isStreaming ? 1 : 0) + (error ? 1 : 0);
    const totalCount = messages.length + extraItemCount;

    return (
        <Virtuoso
            ref={virtuosoRef}
            className="flex-1 h-full"
            // 列表总项数：消息数 + 额外状态项（流式提示/错误提示）
            totalCount={totalCount}
            // 预渲染200px的额外内容，避免快速滚动时出现白屏
            overscan={200}
            // 监听是否滚动到底部，用于智能自动滚动
            // atBottomStateChange={handleAtBottomStateChange}
            // 距离底部100px内视为即为在底部
            atBottomThreshold={100}
            // 新内容添加时自动平滑滚动到底部
            followOutput="smooth"
            // 渲染每一项的回调函数，index 为当前项索引
            itemContent={(index) => {
                // 渲染消息
                if (index < messages.length) {
                    return (
                        <div className="px-4 py-2">
                            <ChatMessage message={messages[index]} />
                        </div>
                    );
                }

                // 渲染流式加载提示
                const streamingIndex = messages.length;
                if (isStreaming && index === streamingIndex) {
                    return (
                        <div className="px-4 py-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="size-4 animate-spin" />
                                <span>AI 正在思考...</span>
                            </div>
                        </div>
                    );
                }

                // 渲染错误提示
                if (error) {
                    return (
                        <div className="px-4 py-2">
                            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                                错误: {error}
                            </div>
                        </div>
                    );
                }

                return null;
            }}
            // 自定义组件：Header/Footer 用于添加列表顶部和底部的间距
            components={{
                Header: () => <div className="h-2" />,
                Footer: () => <div className="h-2" />,
            }}
        />
    );
}
