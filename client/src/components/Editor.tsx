import MonacoEditor from '@monaco-editor/react'
import { editor } from "monaco-editor";
import { type EditorFile } from '../types/types';
import { createATA } from '../utils/ata';
import { useEffect, useRef, useState } from 'react';
import { type Socket } from 'socket.io-client';
import { useLeetCodes } from '@/modules/playground';
import {
  useInitCollaboration,
  useConnectionStatus,
  useMonacoBinding,
  useLocalUserState,
  useRemoteCursors,
  useYjsContentSync,
} from '@/modules/collaboration';

interface Props {
  file: EditorFile
  onchange?: (code: string) => void
  options?: editor.IStandaloneEditorConstructionOptions,
  socketRef?: React.MutableRefObject<Socket | null>,
  roomId?: string,
  username?: string,
  avatarUrl?: string,
}

export default function Editor(props: Props) {
  const ataRef = useRef<((code: string) => void) | null>(null)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const { setLeetCodes } = useLeetCodes()
  const { file, options, socketRef, roomId, onchange, username, avatarUrl } = props;
  const [editorReady, setEditorReady] = useState(false)

  // 初始化协作（使用封装好的 hook）
  useInitCollaboration({
    socket: socketRef?.current ?? null,
    roomId,
    username,
    avatarUrl,
  });

  // 连接状态
  const connectionStatus = useConnectionStatus();

  // Monaco 绑定
  useMonacoBinding(editorRef.current, editorReady);

  // 本地用户状态初始化
  useLocalUserState(editorRef.current, editorReady);

  // 远端光标
  const remoteCursors = useRemoteCursors(editorRef.current, editorReady, editor.EditorOption);


  // Yjs 内容同步
  useYjsContentSync(onchange, setLeetCodes);

  const handleEditorMount = (editorInstance: editor.IStandaloneCodeEditor, monaco: any) => {
    editorRef.current = editorInstance

    editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyQ, () => {
      editorInstance.getAction("editor.action.formatDocument")?.run();
    });

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      jsx: monaco.languages.typescript.JsxEmit.Preserve,
      allowJs: true,
      jsxFactory: 'React.createElement',
      jsxFragmentFactory: 'React.Fragment',
      esModuleInterop: true,
    });

    ataRef.current = createATA((code, path) => {
      monaco.languages.typescript.typescriptDefaults.addExtraLib(code, `file://${path}`)
    });

    editorInstance.onDidChangeModelContent(() => {
      const code = editorInstance.getValue();
      ataRef.current?.(code);
    });

    ataRef.current?.(editorInstance.getValue());
    setEditorReady(true);
  };

  useEffect(() => {
    ataRef.current?.(file.value)
  }, [file?.name, file?.value])

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      {/* 连接状态指示器 */}
      <div className="absolute top-2 right-2 flex items-center gap-2 z-[1000] bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border shadow-sm">
        <div 
          className={`w-2 h-2 rounded-full ${
            connectionStatus === 'online' ? 'bg-green-500' :
            connectionStatus === 'offline' ? 'bg-red-500' :
            'bg-yellow-500 animate-pulse'
          }`}
        />
        <span className="text-xs text-muted-foreground font-medium">
          {connectionStatus === 'online' && '已同步'}
          {connectionStatus === 'offline' && '离线编辑中'}
          {connectionStatus === 'syncing' && '同步中...'}
        </span>
      </div>

      <div style={{ position: 'relative', height: '100%', width: '100%' }}>
        <MonacoEditor
          height='100%'
          path={file.name}
          language={file.language}
          onMount={handleEditorMount}
          defaultValue={''}
          options={{
            fontSize: 14,
            scrollBeyondLastLine: false,
            minimap: {
              enabled: false,
            },
            scrollbar: {
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
            },
            ...options
          }}
        />
      </div>

      {/* 远端光标容器 */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-[999] overflow-hidden">
        {Object.entries(remoteCursors).map(([clientId, cursor]) => (
          <div key={clientId}>
            {/* 选区高亮 */}
            {cursor.selection && cursor.selection.map((range, index) => (
              <div
                key={`${clientId}-selection-${index}`}
                className="absolute pointer-events-none"
                style={{
                  top: `${range.top}px`,
                  left: `${range.left}px`,
                  width: `${range.width}px`,
                  height: `${range.height}px`,
                  backgroundColor: cursor.color,
                  opacity: 0.55,
                  borderRadius: '2px',
                }}
              />
            ))}
            {/* 光标和用户标签 */}
            <div
              className="absolute flex items-start pointer-events-none transition-all duration-75 ease-out"
              style={{
                top: `${cursor.top}px`,
                left: `${cursor.left}px`,
                color: cursor.color,
              }}
            >
              {/* 光标线 */}
              <div
                className="w-0.5 bg-current animate-pulse"
                style={{
                  height: `${cursor.lineHeight}px`,
                  boxShadow: `0 0 4px ${cursor.color}`,
                }}
              />
              {/* 用户标签 */}
              <div 
                className="flex items-center gap-1.5 px-2 py-1.5 ml-1 -mt-0.5 rounded-lg shadow-lg backdrop-blur-sm border border-white/20"
                style={{
                  backgroundColor: cursor.color,
                }}
              >
                {cursor.avatarUrl && (
                  <img
                    src={cursor.avatarUrl}
                    alt={cursor.name || 'User'}
                    className="w-4 h-4 rounded-full object-cover border border-white/30"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <span className="text-white text-xs font-semibold whitespace-nowrap leading-none">
                  {cursor.name || 'Anonymous'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}