/**
 * 公开路由组件 - 使用 Zustand hooks
 * 已登录用户访问时重定向到首页
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/modules/auth';

export function PublicRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  // 加载中显示 loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  // 已登录重定向到首页
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
