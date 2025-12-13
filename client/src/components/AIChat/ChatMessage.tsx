// 单条消息组件（支持 Markdown 渲染和代码高亮）
import { useState, memo } from 'react';
import { User, Bot, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Message } from '@/modules/ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';

interface ChatMessageProps {
    message: Message;
}

export const ChatMessage = memo(function ChatMessage({ message }: ChatMessageProps) {
    const isUser = message.role === 'user';
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
            {/* 头像 */}
            <Avatar className="size-8 shrink-0">
                <AvatarFallback
                    className={cn(
                        isUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground'
                    )}
                >
                    {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
                </AvatarFallback>
            </Avatar>

            {/* 消息内容 */}
            <div
                className={cn(
                    'group relative max-w-[85%] rounded-2xl px-4 py-3',
                    isUser
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted rounded-bl-md'
                )}
            >
                {/* 复制按钮（仅 AI 消息显示） */}
                {!isUser && (
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleCopy}
                        className="absolute top-2 right-2 size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        {copied ? (
                            <Check className="size-3 text-green-500" />
                        ) : (
                            <Copy className="size-3" />
                        )}
                    </Button>
                )}

                {/* Markdown 渲染内容 */}
                <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                    {isUser ? (
                        // 用户消息：简单渲染
                        <p className="whitespace-pre-wrap m-0">{message.content}</p>
                    ) : (
                        // AI 消息：Markdown 渲染
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                // 代码块渲染
                                code({ node, className, children, ...props }) {
                                    const match = /language-(\w+)/.exec(className || '');
                                    const isInline = !match && !String(children).includes('\n');
                                    
                                    if (isInline) {
                                        return (
                                            <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm" {...props}>
                                                {children}
                                            </code>
                                        );
                                    }
                                    
                                    return (
                                        <CodeBlock
                                            code={String(children).replace(/\n$/, '')}
                                            language={match ? match[1] : 'plaintext'}
                                        />
                                    );
                                },
                                // 段落
                                p({ children }) {
                                    return <p className="mb-3 last:mb-0">{children}</p>;
                                },
                                // 列表
                                ul({ children }) {
                                    return <ul className="list-disc pl-4 mb-3 space-y-1">{children}</ul>;
                                },
                                ol({ children }) {
                                    return <ol className="list-decimal pl-4 mb-3 space-y-1">{children}</ol>;
                                },
                                // 链接
                                a({ href, children }) {
                                    return (
                                        <a
                                            href={href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline"
                                        >
                                            {children}
                                        </a>
                                    );
                                },
                                // 标题
                                h1({ children }) {
                                    return <h1 className="text-xl font-bold mb-2 mt-4">{children}</h1>;
                                },
                                h2({ children }) {
                                    return <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>;
                                },
                                h3({ children }) {
                                    return <h3 className="text-base font-bold mb-2 mt-2">{children}</h3>;
                                },
                                // 引用块
                                blockquote({ children }) {
                                    return (
                                        <blockquote className="border-l-4 border-border pl-4 italic my-3 text-muted-foreground">
                                            {children}
                                        </blockquote>
                                    );
                                },
                                // 表格
                                table({ children }) {
                                    return (
                                        <div className="overflow-x-auto my-3">
                                            <table className="min-w-full border-collapse border border-border">
                                                {children}
                                            </table>
                                        </div>
                                    );
                                },
                                th({ children }) {
                                    return (
                                        <th className="border border-border px-3 py-2 bg-muted font-semibold">
                                            {children}
                                        </th>
                                    );
                                },
                                td({ children }) {
                                    return (
                                        <td className="border border-border px-3 py-2">
                                            {children}
                                        </td>
                                    );
                                },
                            }}
                        >
                            {message.content}
                        </ReactMarkdown>
                    )}
                </div>

                {/* 时间戳 */}
                <div className={cn('text-xs mt-2 opacity-60', isUser && 'text-right')}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                </div>
            </div>
        </div>
    );
});
