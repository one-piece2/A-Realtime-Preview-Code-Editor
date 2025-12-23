import { Eye } from 'lucide-react';
import type { RoomRole } from '@/modules/room/types';

interface ReadOnlyBannerProps {
  role: RoomRole | null;
}

export function ReadOnlyBanner({ role }: ReadOnlyBannerProps) {
  if (role !== 'viewer') return null;

  return (
    <div className="absolute top-2 right-2 z-10 bg-yellow-500/90 text-yellow-900 px-3 py-1.5 rounded-md flex items-center gap-2 text-xs font-medium shadow-md">
      <Eye className="w-3.5 h-3.5" />
      <span>只读模式</span>
    </div>
  );
}
