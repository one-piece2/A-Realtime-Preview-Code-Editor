import { Crown, Edit, Eye, MoreVertical, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { RoomMember } from '@/modules/room/types';

interface MemberItemProps {
  member: RoomMember;
  canManage: boolean;
  onRoleChange: (role: 'editor' | 'viewer') => void;
  onRemove: () => void;
}

const roleConfig = {
  owner: { icon: Crown, color: 'text-yellow-500', label: '房主' },
  editor: { icon: Edit, color: 'text-green-500', label: '编辑者' },
  viewer: { icon: Eye, color: 'text-muted-foreground', label: '观看者' },
};

export function MemberItem({
  member,
  canManage,
  onRoleChange,
  onRemove,
}: MemberItemProps) {
  const config = roleConfig[member.role];
  const RoleIcon = config.icon;

  return (
    <li className="px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage
            src={member.user.githubAvatar || undefined}
            alt={member.user.username}
          />
          <AvatarFallback>
            {member.user.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0">
          <div className="font-medium text-sm truncate">
            {member.user.username}
          </div>
          {/* <div className="text-xs text-muted-foreground truncate">
            {member.user.email}
          </div> */}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className={`flex items-center gap-1 text-xs ${config.color}`}>
          <RoleIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{config.label}</span>
        </span>

        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {member.role !== 'editor' && (
                <DropdownMenuItem onClick={() => onRoleChange('editor')}>
                  <Edit className="w-4 h-4 text-green-500" />
                  设为编辑者
                </DropdownMenuItem>
              )}
              {member.role !== 'viewer' && (
                <DropdownMenuItem onClick={() => onRoleChange('viewer')}>
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  设为观看者
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onRemove}
                className="text-destructive focus:text-destructive"
              >
                <UserMinus className="w-4 h-4" />
                移出房间
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </li>
  );
}
