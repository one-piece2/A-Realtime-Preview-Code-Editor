import { useEffect, useState } from 'react';
import { Crown, Edit, Eye, X } from 'lucide-react';
import { useCollaborationRole } from '@/modules/collaboration/hooks';
import type { RoomRole } from '@/modules/room/types';

const roleConfig = {
  owner: { icon: Crown, color: 'bg-yellow-500', label: '房主' },
  editor: { icon: Edit, color: 'bg-green-500', label: '编辑者' },
  viewer: { icon: Eye, color: 'bg-gray-500', label: '观看者' },
};

export function RoleChangeNotification() {
  const role = useCollaborationRole();
  const [prevRole, setPrevRole] = useState<RoomRole | null>(null);
  const [notification, setNotification] = useState<{
    show: boolean;
    role: RoomRole;
  } | null>(null);

  useEffect(() => {
    // 首次加载时记录角色，不显示通知
    if (prevRole === null && role) {
      setPrevRole(role);
      return;
    }

    // 角色变更时显示通知
    if (role && prevRole && role !== prevRole) {
      setNotification({ show: true, role });

      // 5秒后自动隐藏
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);

      setPrevRole(role);
      return () => clearTimeout(timer);
    }

    setPrevRole(role);
  }, [role, prevRole]);

  if (!notification?.show) return null;

  const config = roleConfig[notification.role];
  const Icon = config.icon;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div
        className={`${config.color} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3`}
      >
        <Icon className="w-5 h-5" />
        <div>
          <div className="font-medium">角色已变更</div>
          <div className="text-sm opacity-90">
            您现在是 {config.label}
            {notification.role === 'viewer' && ' (只读)'}
          </div>
        </div>
        <button
          onClick={() => setNotification(null)}
          className="p-1 hover:bg-white/20 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
