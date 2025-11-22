
import {BrowserRouter,Route,Routes} from "react-router-dom"
import Home from "@/pages/home"
import EditorSigelPage from "@/pages/EditorSigelPage";
import Preview from "./pages/Preview";
import Dashboard from "@/pages/Dashboard";
import { PlaygroundProvider, PlaygroundContext } from "./Context/playgroundcontent";
import { useContext, useEffect } from 'react';
import EditorFilesPage from "@/pages/EditorFilesPage";

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
      <ThemeSwitcher>
        <BrowserRouter>
          <div className={`min-h-screen transition-colors duration-300 ${'bg-background text-foreground'}`}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/home" element={<Home />} />
              <Route path="/editor/:roomId" element={<EditorSigelPage />}/>
              <Route path="">
                 <Route path="preview" element={<Preview />} />
              </Route>
              <Route path="/editor/files" element={<EditorFilesPage />} />
            </Routes>
          </div>
        </BrowserRouter>
      </ThemeSwitcher>
    </PlaygroundProvider>
  )
}

export default App
