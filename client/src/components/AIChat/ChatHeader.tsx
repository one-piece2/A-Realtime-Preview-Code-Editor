// 头部组件（标题、操作按钮）
import { X, History, Plus, Trash2, MoreVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useConversationList } from '@/modules/ai';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
    title: string;
    onClose: () => void;
    onToggleHistory: () => void;
    showHistory: boolean;
}

export function ChatHeader({ title, onClose, onToggleHistory, showHistory }: ChatHeaderProps) {
    const { t } = useTranslation();
    const { createConversation, currentId, deleteConversation } = useConversationList();

    const handleNewChat = () => {
        createConversation();
    };

    const handleDelete = () => {
        if (currentId) {
            deleteConversation(currentId);
        }
    };

    return (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
            {/* 标题 */}
            <h3 className="font-semibold text-sm truncate max-w-[180px]">
                {title}
            </h3>

            {/* 操作按钮 */}
            <div className="flex items-center gap-1 ">
                {/* 新建对话 */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={handleNewChat}
                        >
                            <Plus className="size-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent className="z-9999">{t('ai.newChat')}</TooltipContent>
                </Tooltip>

                {/* 历史记录 */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={onToggleHistory}
                            className={cn(showHistory && 'bg-accent')}
                        >
                            <History className="size-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent className="z-9999">{showHistory ? t('ai.backToChat') : t('ai.history')}</TooltipContent>
                </Tooltip>

                {/* 更多操作 - 使用 DropdownMenu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                            <MoreVertical className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleNewChat}>
                            <Plus className="size-4 mr-2" />
                            {t('ai.newConversation')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onToggleHistory}>
                            <History className="size-4 mr-2" />
                            {showHistory ? t('ai.backToChat') : t('ai.history')}
                        </DropdownMenuItem>
                        {currentId && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={handleDelete}
                                    className="text-destructive focus:text-destructive"
                                >
                                    <Trash2 className="size-4 mr-2" />
                                    {t('ai.deleteConversation')}
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* 关闭侧边栏 */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={onClose}
                        >
                            <X className="size-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent className="z-9999">{t('ai.close')}</TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
}
