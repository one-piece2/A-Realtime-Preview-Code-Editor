import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Settings, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MemberList } from '@/components/member/MemberList';
import { ReadOnlyBanner } from '@/components/permission/ReadOnlyBanner';
import { RoleChangeNotification } from '@/components/permission/RoleChangeNotification';
import { OwnerOnly } from '@/components/permission/PermissionGuard';
import { useEnterRoom, useCurrentRoom } from '@/modules/room/hooks';
import {
  useInitCollaboration,
  useConnectionStatus,
  useCanEdit,
} from '@/modules/collaboration/hooks';
import { useAuthStore } from '@/modules/auth/store';
import { getRoleDisplayName } from '@/modules/room/service';

export function RoomEditorPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  // 获取用户信息
  const user = useAuthStore((s) => s.user);

  // 获取房间信息
  const { isLoading: roomLoading, error: roomError } = useEnterRoom(roomId || null);
  const { currentRoom, myRole, members } = useCurrentRoom();

  // 初始化协作
  useInitCollaboration(roomId || null, {
    username: user?.username || 'Anonymous',
    avatarUrl: user?.githubAvatar || '/default-avatar.png',
  });

  // 连接状态
  const connectionStatus = useConnectionStatus();
  const canEdit = useCanEdit();

  // 加载中
  if (roomLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">加载房间信息...</span>
      </div>
    );
  }

  // 错误或房间不存在
  if (roomError || !currentRoom) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-destructive">
          {roomError || '房间不存在或您没有权限访问'}
        </p>
        <Button onClick={() => navigate('/rooms')}>返回房间列表</Button>
      </div>
    );
  }

  // 连接状态指示器
  const statusConfig = {
    online: { color: 'bg-green-500', text: '已连接' },
    syncing: { color: 'bg-yellow-500', text: '同步中' },
    offline: { color: 'bg-red-500', text: '离线' },
  };
  const status = statusConfig[connectionStatus];

  return (
    <div className="h-screen flex flex-col">
      {/* 顶部栏 */}
      <header className="h-14 border-b flex items-center justify-between px-4 bg-background shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate('/rooms')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="font-semibold text-sm">{currentRoom.name}</h1>
            <code className="text-xs text-muted-foreground">{currentRoom.roomId}</code>
          </div>
          {myRole && (
            <Badge variant="secondary">{getRoleDisplayName(myRole)}</Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* 连接状态 */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className={`w-2 h-2 rounded-full ${status.color}`} />
            <span className="hidden sm:inline">{status.text}</span>
          </div>

          {/* 在线人数 */}
          <Badge variant="outline">{members.length} 人在线</Badge>

          {/* 分享按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              // 可以添加 toast 提示
            }}
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">分享</span>
          </Button>

          {/* 房间设置（仅房主可见） */}
          <OwnerOnly>
            <Button variant="outline" size="icon-sm">
              <Settings className="w-4 h-4" />
            </Button>
          </OwnerOnly>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 编辑器区域 */}
        <main className="flex-1 relative">
          {/* 只读提示 */}
          <ReadOnlyBanner role={myRole} />

          {/* 编辑器占位 - 这里应该放你现有的 Editor 组件 */}
          <div className="h-full w-full flex items-center justify-center bg-muted/30">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium mb-2">编辑器区域</p>
              <p className="text-sm">
                {canEdit ? '您可以编辑代码' : '只读模式'}
              </p>
              <p className="text-xs mt-4">
                请在此处集成您现有的 Monaco Editor 组件
              </p>
            </div>
          </div>
        </main>

        {/* 侧边栏 - 成员列表 */}
        <aside className="w-64 border-l overflow-hidden hidden lg:block">
          <MemberList />
        </aside>
      </div>

      {/* 角色变更通知 */}
      <RoleChangeNotification />
    </div>
  );
}
