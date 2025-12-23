import type { ReactNode } from 'react';
import { useCurrentRoom } from '@/modules/room/hooks';
import type { RoomRole } from '@/modules/room/types';

interface PermissionGuardProps {
  requiredRoles: RoomRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGuard({
  requiredRoles,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const { myRole } = useCurrentRoom();

  if (!myRole || !requiredRoles.includes(myRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// 便捷组件：仅房主可见
export function OwnerOnly({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <PermissionGuard requiredRoles={['owner']} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

// 便捷组件：编辑者或房主可见
export function EditorOrOwner({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <PermissionGuard requiredRoles={['owner', 'editor']} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}
