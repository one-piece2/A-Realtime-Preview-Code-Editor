// 主侧边栏容器（可折叠）
import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { ChatHeader } from './ChatHeader';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { ConversationList } from './ConversationList';
import { useAIChat } from '@/modules/ai';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
    isOpen: boolean;
    //切换折叠状态
    onToggle: () => void;
    editorContext?: string; // 当前编辑器代码上下文
}

export function ChatSidebar({ isOpen, onToggle, editorContext }: ChatSidebarProps) {
    const [showHistory, setShowHistory] = useState(false);
    const { sendMessage, isStreaming, stopGeneration, conversation } = useAIChat();

    // 发送消息时带上编辑器上下文
    const handleSend = (content: string) => {
        sendMessage(content, editorContext);
    };

    // 折叠状态：显示浮动按钮
    if (!isOpen) {
        return (
            <button
                onClick={onToggle}
                className={cn(
                    'fixed right-4 bottom-4 p-3 rounded-full shadow-lg z-50 transition-all',
                    'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
            >
                <MessageSquare className="size-6" />
            </button>
        );
    }

    // 展开状态：显示完整侧边栏
    return (
        <div
            className={cn(
                'h-full w-[380px] flex flex-col border-l transition-all duration-300',
                'bg-background border-border'
            )}
        >
            {/* 头部 */}
            <ChatHeader
                title={conversation?.title || 'AI 助手'}
                onClose={onToggle}
                onToggleHistory={() => setShowHistory(!showHistory)}
                showHistory={showHistory}
            />

            {/* 内容区域：历史列表 或 聊天界面 */}
            {showHistory ? (
                <ConversationList onSelect={() => setShowHistory(false)} />
            ) : (
                <>
                    <ChatMessages />
                    <ChatInput
                        onSend={handleSend}
                        onStop={stopGeneration}
                        isStreaming={isStreaming}
                    />
                </>
            )}
        </div>
    );
}
