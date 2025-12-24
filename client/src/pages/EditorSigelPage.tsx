
import Editor from '@/components/Editor';
import LeetCode from '@/components/LeetCode';
import OutputBox from '@/components/OutputBox';
import { MemberList } from '@/components/member/MemberList';
import { ReadOnlyBanner } from '@/components/permission/ReadOnlyBanner';
import { RoleChangeNotification } from '@/components/permission/RoleChangeNotification';
import { OwnerOnly } from '@/components/permission/PermissionGuard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Allotment } from "allotment";
import 'allotment/dist/style.css';
import { useTheme } from '@/core/config';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, Share2, Settings } from 'lucide-react';
import { useInitCollaboration, useConnectionStatus } from '@/modules/collaboration';
import { useCanEdit } from '@/modules/collaboration/hooks';
import { useCurrentRoom, useEnterRoom } from '@/modules/room/hooks';
import { getRoleDisplayName } from '@/modules/room/service';
import { useAuth } from '@/modules/auth';

import getDogAvatarUrl from '@/utils/dogAvataUrl';


export default function EditorPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId } = useParams();
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const codeRef = useRef<string>('');
  // 获取头像
  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const url = await getDogAvatarUrl();
        if (active && url) {
          setAvatarUrl(url);
        }
      } catch (error) {
        console.error('获取头像失败', error);
      }
    }
    init();
    return () => {
      active = false;
    }
  }, []);

  // 加载房间数据（包括 myRole） 
  useEnterRoom(roomId || null);

  // 获取房间信息和权限
  const { currentRoom, myRole, members } = useCurrentRoom();

  // 初始化协作（在房间数据加载后）
  useInitCollaboration(roomId || null, {
    username: user?.username || location.state?.username || 'Anonymous',
    avatarUrl: user?.githubAvatar || avatarUrl || '/image.png',
  });
  const connectionStatus = useConnectionStatus();
  const canEdit = useCanEdit();


  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    // TODO: 添加 toast 提示
  };

  // const handleLeave = () => {
  //   // 主动通知服务器离开房间
  //   const socket = getCurrentSocket();
  //   if (socket?.connected) {
  //     socket.emit(ACTIONS.LEAVE, {
  //       roomId,
  //     });
  //   }
  //   setTimeout(() => {
  //     navigate('/');
  //   }, 100);
  // };

  const file = {
    name: 'lyy.js',
    value: 'console.log("Hello World!");',
    language: 'javascript'
  }


  // const onChange = (value: string | undefined) => {
  //   setLeetCodes(value)
  //   // socket事件发送逻辑已移至Editor组件内部处理
  // }
  //路由守卫 如果没有username 则跳转到首页

  // if (!location.state) {
  //   return <Navigate to="/" />;
  // }

  // 连接状态配置
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
          <Button variant="ghost" size="sm" onClick={() => navigate('/rooms')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="font-semibold text-sm">
              {currentRoom?.name || 'LeetCode Together'}
            </h1>
            <code className="text-xs text-muted-foreground">{roomId}</code>
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
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">分享</span>
          </Button>

          {/* 房间设置（仅房主可见） */}
          <OwnerOnly>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </OwnerOnly>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 编辑器区域 */}
        <main className="flex-1 relative">
          <Allotment className="h-full" vertical defaultSizes={[1, 1]}>
            <Allotment.Pane minSize={100}>
              <Allotment className="h-full" defaultSizes={[100, 100]}>
                <Allotment.Pane minSize={0}>
                  <LeetCode />
                </Allotment.Pane>
                <Allotment.Pane minSize={800}>
                  <div className="relative h-full">
                    {/* 只读提示 */}
                    <ReadOnlyBanner role={myRole} />
                    <Editor
                      options={{ 
                        theme: `vs-${theme}`,
                        readOnly: !canEdit,
                      }}
                      file={file}
                      onchange={(code) => { codeRef.current = code; }}
                    />
                  </div>
                </Allotment.Pane>
              </Allotment>
            </Allotment.Pane>
            <Allotment.Pane minSize={100} maxSize={400}>
              <OutputBox
                onRefresh={() => console.log('刷新输出')}
                onClear={() => console.log('清除输出')}
              />
            </Allotment.Pane>
          </Allotment>
        </main>

        {/* 侧边栏 - 成员列表 */}
        <aside className="w-74 border-l overflow-hidden hidden lg:block">
          <MemberList />
        </aside>
      </div>

      {/* 角色变更通知 */}
      <RoleChangeNotification />
    </div>
  )
}
