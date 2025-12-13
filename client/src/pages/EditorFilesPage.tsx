import { useState, useEffect, useCallback } from "react";
import { Allotment } from "allotment";
import 'allotment/dist/style.css';
import Preview from "./Preview";
import CodeEditor from "../components/CoderEditor";
import Header from "@/components/Header";
import { FileTree } from "@/components/FileTree/FileTree";
import Terminal from "@/components/Terminal";
import { ChatSidebar } from "@/components/AIChat/ChatSidebar";
import { useFilesSubscription, saveFilesToHash, useSelectedFile } from "@/modules/playground";

export default function EditorFilesPage() {
  const [showTerminal, setShowTerminal] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const selectedFile = useSelectedFile();

  // 订阅 files 变化并同步到 URL hash（副作用）
  const handleFilesChange = useCallback(saveFilesToHash, []);
  useFilesSubscription(handleFilesChange);

  // 监听快捷键：Ctrl+` 切换 Terminal，Ctrl+L 切换 AIChat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+` (Backquote key) - 切换 Terminal
      const isBackquote = 
        e.key === '`' || 
        e.key === '~' || 
        e.keyCode === 192 || 
        (e.code === 'Backquote' && !e.shiftKey);
      
      if ((e.ctrlKey || e.metaKey) && isBackquote) {
        e.preventDefault();
        setShowTerminal(prev => !prev);
      }

      // Ctrl+L - 切换 AIChat 侧边栏
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        setShowAIChat(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 获取当前编辑器代码作为 AI 上下文
  const editorContext = selectedFile 
    ? `文件: ${selectedFile.name}\n\n\`\`\`${selectedFile.language || ''}\n${selectedFile.value}\n\`\`\`` 
    : undefined;

  return (
    <div className="h-screen flex flex-col">
      <Header word={'Code Editor'} photoUrl={'/logo3.jpg'} />

      <div className="flex-1 flex overflow-hidden">
        {/* FileTree 固定在左侧，固定宽度，不可拖动 */}
        <div className="w-[220px] shrink-0 overflow-hidden">
          <FileTree />
        </div>

        {/* 主内容区域：使用水平 Allotment 管理编辑器区域和 AI 侧边栏 */}
        <Allotment>
          {/* 左侧：CodeEditor + Preview + Terminal */}
          <Allotment.Pane minSize={600}>
            <Allotment vertical defaultSizes={showTerminal ? [60, 40] : [100]}>
              {/* 上半部分：CodeEditor 和 Preview 水平排列 */}
              <Allotment.Pane minSize={300}>
                <Allotment defaultSizes={[50, 50]}>
                  <Allotment.Pane minSize={300}>
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
          </Allotment.Pane>

          {/* 右侧：AI 聊天侧边栏（可拖拽调整宽度） */}
          {showAIChat && (
            <Allotment.Pane minSize={380} maxSize={800} preferredSize={480}>
              <ChatSidebar
                isOpen={showAIChat}
                onToggle={() => setShowAIChat(prev => !prev)}
                editorContext={editorContext}
              />
            </Allotment.Pane>
          )}
        </Allotment>
      </div>
    </div>
  );
}