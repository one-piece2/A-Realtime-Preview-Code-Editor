

import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Toaster, toast } from "sonner";

// 全局配置
import { GlobalConfigProvider } from "@/core/config";

// 业务模块 hooks
import { useAuthInitializer,useAuthError } from "@/modules/auth";

// 页面组件
import Home from "@/pages/home";
import EditorSigelPage from "@/pages/EditorSigelPage";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import NotFound from "@/pages/NotFound";
import Dashboard from "@/pages/Dashboard";
import EditorFilesPage from "@/pages/EditorFilesPage";
import AuthCallback from "@/pages/AuthCallback";

// 路由守卫
import { ProtectedRoute } from "@/components/Control-Router/ProtectedRoute";
import { PublicRoute } from "@/components/Control-Router/PublicRoute";
import { useLocation, Navigate } from "react-router-dom";

// 单独的路由守卫组件
function ProtectedRoute2({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const username = (location.state as any)?.username ?? localStorage.getItem("username");
  if (!username) {
    toast.error("请先登录或加入房间");
    return <Navigate to="/" replace />;
  }
  return children;
}

// // 主题应用组件 - 使用新的 useTheme hook
// function ThemeApplier({ children }: { children: React.ReactNode }) {
//   const { theme } = useTheme();

//   useEffect(() => {
//     // 主题切换逻辑已移至 GlobalConfigContext
//     // 这里可以添加额外的主题相关副作用
//   }, [theme]);

//   return <>{children}</>;
// }

// Auth 初始化组件
function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuthInitializer();
  const {authError,clearAuthError} = useAuthError();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white">
          Loading...
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-red-600 dark:text-red-400 font-semibold mb-3">初始化失败</div>
          <div className="text-sm text-gray-700 dark:text-gray-300 break-words mb-4">{String(authError)}</div>
          <div className="flex gap-2">
            <button
              className="px-3 py-2 rounded bg-blue-600 text-white"
              onClick={() => {
                location.reload();
                clearAuthError();
              }}
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// 应用路由
function AppRoutes() {
  return (
    <Routes>
      {/* 公开路由 */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Route>

      {/* 受保护的路由 */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/home" element={<Home />} />
        <Route
          path="/editor/:roomId"
          element={
            <ProtectedRoute2>
              <EditorSigelPage />
            </ProtectedRoute2>
          }
        />
        <Route path="/editor/files" element={<EditorFilesPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}


// 主应用组件
function App() {
  return (
       <GlobalConfigProvider>
        <AuthInitializer>
          <BrowserRouter>
            <Toaster position="top-center" />
            <div className="min-h-screen transition-colors duration-300">
              <AppRoutes />
            </div>
          </BrowserRouter>
        </AuthInitializer>
        
 
    </GlobalConfigProvider>

  );
}

export default App;
