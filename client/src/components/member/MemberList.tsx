import { useCurrentRoom, useMemberActions, useMemberSync } from '@/modules/room/hooks';
import { useCollaborators } from '@/modules/collaboration/hooks';
import { MemberItem } from './MemberItem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function MemberList() {
  const { members, currentRoom } = useCurrentRoom();
  const { updateMemberRole, removeMember, canManageMembers } = useMemberActions();
  const collaborators = useCollaborators();
  
  // 使用 hook 实现成员列表实时同步
  useMemberSync();

  // 根据用户名从协作者列表中获取头像
  const getCollaboratorAvatar = (username: string) => {
    for (const [_, collaborator] of collaborators) {
      if (collaborator.name === username) {
        return collaborator.avatarUrl;
      }
    }
    return null;
  };

  if (!currentRoom) return null;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="w-4 h-4" />
          成员 ({members.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <ul className="divide-y divide-border">
            {members.map((member) => {
              const collaboratorAvatar = getCollaboratorAvatar(member.user.username);
              return (
                <MemberItem
                  key={member.id}
                  member={member}
                  collaboratorAvatar={collaboratorAvatar}
                  canManage={canManageMembers && member.role !== 'owner'}
                  onRoleChange={(role) =>
                    updateMemberRole(currentRoom.roomId, member.userId, role)
                  }
                  onRemove={() => removeMember(currentRoom.roomId, member.userId)}
                />
              );
            })}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
