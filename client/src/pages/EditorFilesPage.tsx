import { useState, useEffect } from "react";
import { Allotment } from "allotment";
import 'allotment/dist/style.css';
import Preview from "./Preview";
import CodeEditor from "../components/CoderEditor";
import Header from "@/components/Header";
import { FileTree } from "@/components/FileTree/FileTree";
import Terminal from "@/components/Terminal";
import { usePlaygroundStore, saveFilesToHash } from "@/modules/playground";

export default function EditorFilesPage() {
  const [showTerminal, setShowTerminal] = useState(false);

  // 只在这个页面订阅 files 变化并同步到 URL hash
  useEffect(() => {
    const unsubscribe = usePlaygroundStore.subscribe((state) => {
      saveFilesToHash(state.files);
    });
    return () => unsubscribe();
  }, []);

  // 监听 Ctrl+~ 快捷键（实际上是 Ctrl+`，因为 ~ 是通过 Shift+` 输入的）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+` (Backquote key)
      // keyCode 192 是 Backquote 键
      // key 可能是 '`' 或 'Dead'（在某些键盘布局中）
      const isBackquote = 
        e.key === '`' || 
        e.key === '~' || 
        e.keyCode === 192 || 
        (e.code === 'Backquote' && !e.shiftKey);
      
      if ((e.ctrlKey || e.metaKey) && isBackquote) {
        e.preventDefault();
        setShowTerminal(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="h-screen flex flex-col">
      <Header word={'Code Editor'} photoUrl={'/logo3.jpg'} />

      <div className="flex-1 flex overflow-hidden">
        {/* FileTree 固定在左侧，固定宽度，不可拖动 */}
        <div className="w-[220px] shrink-0 overflow-hidden">
          <FileTree />
        </div>

        {/* 右侧使用 Allotment 管理 CodeEditor、Terminal 和 Preview */}
        <div className="flex-1 min-w-0">
          <Allotment vertical defaultSizes={showTerminal ? [60, 40] : [100]}>
            {/* 上半部分：CodeEditor 和 Preview 水平排列 */}
            <Allotment.Pane minSize={300}>
              <Allotment defaultSizes={[50, 50]}>
                <Allotment.Pane minSize={400}>
                  <CodeEditor />
                </Allotment.Pane>
                <Allotment.Pane minSize={300}>
                  <Preview />
                </Allotment.Pane>
              </Allotment>
            </Allotment.Pane>

            {/* 下半部分：Terminal（可显示/隐藏） */}
            {showTerminal && (
              <Allotment.Pane minSize={200} maxSize={500}>
                <Terminal />
              </Allotment.Pane>
            )}
          </Allotment>
        </div>
      </div>
    </div>
  );
}