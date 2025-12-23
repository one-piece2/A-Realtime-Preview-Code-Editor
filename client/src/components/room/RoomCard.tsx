import { Link } from 'react-router-dom';
import { Lock, Globe, Crown, Edit, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Room, RoomRole } from '@/modules/room/types';

interface RoomCardProps {
  //房间信息
  room: Room;
  role?: RoomRole;
}

const roleConfig = {
  owner: { icon: Crown, color: 'bg-yellow-500', label: '房主' },
  editor: { icon: Edit, color: 'bg-green-500', label: '编辑者' },
  viewer: { icon: Eye, color: 'bg-gray-500', label: '观看者' },
};

export function RoomCard({ room, role }: RoomCardProps) {
  const config = role ? roleConfig[role] : null;
  const RoleIcon = config?.icon;

  return (
    <Link to={`/room/${room.roomId}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base truncate flex-1 pr-2">
              {room.name}
            </CardTitle>
            <div className="flex items-center gap-2 shrink-0">
              {room.isPublic ? (
                <Globe className="w-4 h-4 text-green-500" />
              ) : (
                <Lock className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
          {room.description && (
            <CardDescription className="line-clamp-2">
              {room.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
              {room.roomId}
            </code>
            {config && RoleIcon && (
              <Badge variant="secondary" className="gap-1">
                <RoleIcon className="w-3 h-3" />
                {config.label}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
