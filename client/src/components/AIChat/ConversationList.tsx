// 会话历史列表组件
import { MessageSquare, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useConversationList } from '@/modules/ai';
import { cn } from '@/lib/utils';

interface ConversationListProps {
    onSelect: () => void;
}

export function ConversationList({ onSelect }: ConversationListProps) {
    const { t } = useTranslation();
    const { conversations, currentId, selectConversation, deleteConversation } = useConversationList();

    const handleSelect = (id: string) => {
        selectConversation(id);
        onSelect();
    };

    if (conversations.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
                <p className="text-sm text-muted-foreground">
                    {t('ai.noHistory')}
                </p>
            </div>
        );
    }

    return (
        <ScrollArea className="flex-1">
            <div className="p-2">
                {conversations.map((conv) => (
                    <div
                        key={conv.id}
                        className={cn(
                            'group flex items-center gap-3 p-3 rounded-lg cursor-pointer mb-1 transition-colors',
                            conv.id === currentId
                                ? 'bg-accent'
                                : 'hover:bg-accent/50'
                        )}
                        onClick={() => handleSelect(conv.id)}
                    >
                        <MessageSquare className="size-4 shrink-0 text-muted-foreground" />

                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                                {conv.messages.length > 0 
                                    ? conv.messages[conv.messages.length - 1].content.slice(0, 30)+'...'
                                    : t('ai.newChat')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {conv.messages.length} {t('ai.messages')} · {formatDate(conv.updatedAt, t)}
                            </p>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                deleteConversation(conv.id);
                            }}
                            className="size-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}

// 格式化日期
function formatDate(timestamp: number, t: (key: string) => string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return t('ai.justNow');
    if (diff < 3600000) return `${Math.floor(diff / 60000)} ${t('ai.minutesAgo')}`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ${t('ai.hoursAgo')}`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} ${t('ai.daysAgo')}`;

    return date.toLocaleDateString();
}
