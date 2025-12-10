
import { BrowserRouter, Route, Routes } from "react-router-dom"
import Home from "@/pages/home"
import EditorSigelPage from "@/pages/EditorSigelPage";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import NotFound from "@/pages/NotFound";
import Dashboard from "@/pages/Dashboard";
import { PlaygroundProvider, PlaygroundContext } from "./Context/playgroundcontent";
import { useContext, useEffect } from 'react';
import EditorFilesPage from "@/pages/EditorFilesPage";
import AuthCallback from "@/pages/AuthCallback";
import { Toaster } from "sonner";
import { AuthProvider } from "./Context/AuthContext/AuthContext";
import { useLocation, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/Control-Router/ProtectedRoute";
import { PublicRoute } from "./components/Control-Router/PublicRoute";
//单独的路由守卫组件
function ProtectedRoute2({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (!location.state?.username) {
    return <Navigate to="/" replace />;
  }
  return children;
}
// 主题切换器组件
function ThemeSwitcher({ children }: { children: React.ReactNode }) {
  const { theme } = useContext(PlaygroundContext);

  useEffect(() => {
    // 更新HTML元素的class来切换主题
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // 设置根元素的背景色和文字颜色
    document.documentElement.style.backgroundColor = theme === 'dark' ? '#111827' : '#ffffff';
    document.documentElement.style.color = theme === 'dark' ? '#f3f4f6' : '#1f2937';
  }, [theme]);

  return <>{children}</>;
}

function App() {
  return (
    <PlaygroundProvider>
      <AuthProvider>
        <ThemeSwitcher>
          <BrowserRouter>
            <Toaster position="top-center" />
            <div className="min-h-screen transition-colors duration-300">
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
                  <Route path="/editor/:roomId" element={<ProtectedRoute2> <EditorSigelPage /></ProtectedRoute2>} />
                  <Route path="/editor/files" element={<EditorFilesPage />} />
                </Route>
                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </BrowserRouter>
        </ThemeSwitcher>
      </AuthProvider>
    </PlaygroundProvider>
  )
}

export default App
