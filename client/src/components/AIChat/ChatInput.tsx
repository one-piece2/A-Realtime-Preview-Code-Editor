// 消息输入组件
import { useState, useRef, useEffect } from 'react';
import { Send, Square, Paperclip, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatInputProps {
    onSend: (message: string) => void;
    onStop: () => void;
    isStreaming: boolean;
    disabled?: boolean;
}

export function ChatInput({ onSend, onStop, isStreaming, disabled }: ChatInputProps) {
    const [input, setInput] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // 自动调整高度
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
        }
    }, [input]);

    // 发送消息
    const handleSend = () => {
        const trimmed = input.trim();
        if (!trimmed || isStreaming || disabled) return;
        onSend(trimmed);
        setInput('');
    };

    // 键盘事件：Enter 发送，Shift+Enter 换行
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="p-4 border-t border-border bg-background">
            <div className="flex items-end gap-2 rounded-xl border p-2 bg-muted/30">
                {/* 附件按钮 */}
                <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0"
                    title="上传文件"
                >
                    <Paperclip className="size-5" />
                </Button>

                {/* 代码上下文按钮 */}
                <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0"
                    title="添加代码上下文"
                >
                    <Code className="size-5" />
                </Button>

                {/* 输入框 */}
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="输入消息... (Shift+Enter 换行)"
                    disabled={isStreaming || disabled}
                    rows={1}
                    className={cn(
                        'flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed',
                        'placeholder:text-muted-foreground',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        'min-h-[24px] max-h-[150px]'
                    )}
                />

                {/* 发送/停止按钮 */}
                {isStreaming ? (
                    <Button
                        variant="destructive"
                        size="icon-sm"
                        onClick={onStop}
                        className="shrink-0"
                        title="停止生成"
                    >
                        <Square className="size-5" />
                    </Button>
                ) : (
                    <Button
                        size="icon-sm"
                        onClick={handleSend}
                        disabled={!input.trim() || disabled}
                        className="shrink-0"
                        title="发送"
                    >
                        <Send className="size-5" />
                    </Button>
                )}
            </div>

            <p className="text-xs mt-2 text-center text-muted-foreground">
                AI 可能会犯错，请核实重要信息
            </p>
        </div>
    );
}
