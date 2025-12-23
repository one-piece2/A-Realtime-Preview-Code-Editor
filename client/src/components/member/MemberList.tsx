import { useCurrentRoom, useMemberActions, useMemberSync } from '@/modules/room/hooks';
import { MemberItem } from './MemberItem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function MemberList() {
  const { members, currentRoom } = useCurrentRoom();
  const { updateMemberRole, removeMember, canManageMembers } = useMemberActions();
  
  // 使用 hook 实现成员列表实时同步
  useMemberSync();

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
            {members.map((member) => (
              <MemberItem
                key={member.id}
                member={member}
                canManage={canManageMembers && member.role !== 'owner'}
                onRoleChange={(role) =>
                  updateMemberRole(currentRoom.roomId, member.userId, role)
                }
                onRemove={() => removeMember(currentRoom.roomId, member.userId)}
              />
            ))}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
