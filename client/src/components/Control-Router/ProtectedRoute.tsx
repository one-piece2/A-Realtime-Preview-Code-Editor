import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/Context/AuthContext/useAuth';
export function ProtectedRoute() {
    const { isAuthenticated, isLoading } = useAuth();
    //可以拿到当前访问的路径，登录后重定向回来
    const location = useLocation();
  
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">加载中...</div>
        </div>
      );
    }
  
    if (!isAuthenticated) {
      // 保存当前路径，登录后重定向回来  并且不产生/login的history记录
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
  
    return <Outlet />;
  }