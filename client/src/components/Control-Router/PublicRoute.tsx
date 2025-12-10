import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/Context/AuthContext/useAuth';

export function PublicRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  // 如果已登录，重定向到首页  并且不产生/的history记录
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}