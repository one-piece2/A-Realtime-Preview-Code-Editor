/**
 * 受保护路由组件 - 使用 Zustand hooks
 * 需要登录才能访问的路由
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/modules/auth';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // 加载中显示 loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  // 未登录重定向到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
