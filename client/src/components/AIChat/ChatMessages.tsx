// 聊天消息列表组件
import { useEffect, useRef } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCurrentMessages, useAIChat } from '@/modules/ai';
import { ChatMessage } from './ChatMessage';

export function ChatMessages() {
    const messages = useCurrentMessages();
    const { isStreaming, error } = useAIChat();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 自动滚动到底部
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isStreaming]);

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

    return (
        <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
                {messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                ))}

                {/* 流式加载提示 */}
                {isStreaming && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        <span>AI 正在思考...</span>
                    </div>
                )}

                {/* 错误提示 */}
                {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                        错误: {error}
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>
        </ScrollArea>
    );
}
