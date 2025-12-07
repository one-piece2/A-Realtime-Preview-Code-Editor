import MonacoEditor from '@monaco-editor/react'

import { editor } from "monaco-editor";
import { type EditorFile } from '../types/types';
import { createATA } from '../utils/ata';
import { useEffect, useRef, useContext, useMemo, useState } from 'react';
import { type Socket } from 'socket.io-client';
import { PlaygroundContext } from '../Context/playgroundcontent';

import * as Y from 'yjs'
import { MonacoBinding } from 'y-monaco'
import { SocketIOProvider } from '../yjs/socket-provider';

interface Props {
  file: EditorFile | undefined
  onchange?: (code: string) => void
  options?: editor.IStandaloneEditorConstructionOptions,
  socketRef?: React.MutableRefObject<Socket | null>,
  roomId?: string,
  username?: string,
  avatarUrl?: string,
  onUsersChange?: (users: Map<number, { name: string; avatarUrl: string; color: string }>) => void,
}

export default function Editor(props: Props) {
  const ataRef = useRef<((code: string) => void) | null>(null)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const [cursors, setCursors] = useState<Record<string, any>>({});
  const bindingRef = useRef<MonacoBinding | null>(null)
  const providerRef = useRef<SocketIOProvider | null>(null)
  const { setLeetCodes } = useContext(PlaygroundContext)
  const { file, options, socketRef, roomId, onchange, username, avatarUrl, onUsersChange } = props;
  const ydoc = useMemo(() => new Y.Doc(), [])
  const [editorReady, setEditorReady] = useState(false)

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
      onchange?.(code);
      setLeetCodes(code);
      ataRef.current?.(code);
    });

    ataRef.current?.(editorInstance.getValue());
    setEditorReady(true);
  };

  useEffect(() => {
    if (!file) return;
    ataRef.current?.(file.value)
  }, [file?.name, file?.value])

  const socket = socketRef?.current;

  useEffect(() => {
    if (!socket || !roomId) {
      return;
    }
    const provider = new SocketIOProvider({
      doc: ydoc,
      roomId,
      socket,
    });
    providerRef.current = provider;

    return () => {
      provider.destroy();
      providerRef.current = null;
    };
  }, [socket, roomId, ydoc]);

  useEffect(() => {
    const provider = providerRef.current;
    const editorInstance = editorRef.current;
    if (!provider || !editorReady || !editorInstance) {
      return;
    }
    const model = editorInstance.getModel();
    if (!model) {
      return;
    }
    const yText = ydoc.getText('monaco');

    const binding = new MonacoBinding(
      yText,
      model,
      new Set([editorInstance]),
      provider.awareness,
    );
    bindingRef.current = binding;

    return () => {
      binding.destroy();
      bindingRef.current = null;
    };
  }, [editorReady, ydoc]);

  // 初始化本地用户信息并同步光标位置
  useEffect(() => {
    const provider = providerRef.current;
    const editorInstance = editorRef.current;
    if (!provider || !editorInstance || !editorReady) return;
    
    const model = editorInstance.getModel();
    if (!model) return;

    const awareness = provider.awareness;

    // 生成稳定的颜色（基于 clientID）
    const generateColor = (clientId: number) => {
      const hue = (clientId * 137.508) % 360; // 使用黄金角度确保颜色分布均匀
      return `hsl(${hue}, 70%, 50%)`;
    };

    // 初始化本地用户状态
    const userColor = generateColor(awareness.clientID);
    awareness.setLocalStateField('user', {
      name: username ?? 'Anonymous',
      avatarUrl: avatarUrl ?? '/image.png',
      color: userColor,
      awarenessId: awareness.clientID,
    });

    // 防抖函数，避免频繁更新
    let debounceTimer: NodeJS.Timeout | null = null;
    const debouncedUpdate = (fn: () => void) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(fn, 50); // 50ms 防抖
    };

    // 同步本地光标位置
    const updateLocalCursor = () => {
      try {
        // 获取当前光标和选择范围
        const selection = editorInstance.getSelection();
        if (!selection) {
          // 如果没有选择，清除光标状态
          awareness.setLocalStateField('cursor', null);
          return;
        }
      
        const startPos = selection.getStartPosition();
        const endPos = selection.getEndPosition();
        
        // 计算偏移量
        const anchor = model.getOffsetAt(startPos);
        const head = model.getOffsetAt(endPos);
        const position = model.getOffsetAt(endPos); // 光标位置使用 head

        // 更新 awareness 状态
        awareness.setLocalStateField('cursor', {
          position,
          anchor,
          head,
          startLine: startPos.lineNumber,
          startColumn: startPos.column,
          endLine: endPos.lineNumber,
          endColumn: endPos.column,
        });
      } catch (error) {
        // 忽略位置计算错误（可能发生在内容快速变化时）
        console.warn('更新光标位置失败:', error);
      }
    };

    // 监听光标变化（使用防抖）
    const cursorDisposable = editorInstance.onDidChangeCursorPosition(() => {
      debouncedUpdate(updateLocalCursor);
    });
    
    const selectionDisposable = editorInstance.onDidChangeCursorSelection(() => {
      debouncedUpdate(updateLocalCursor);
    });

    // 监听内容变化，更新光标位置（内容变化可能导致位置失效）
    const contentDisposable = editorInstance.onDidChangeModelContent(() => {
      debouncedUpdate(updateLocalCursor);
    });

    // 监听编辑器尺寸变化
    const layoutDisposable = editorInstance.onDidLayoutChange?.(() => {
      debouncedUpdate(updateLocalCursor);
    });
    
    updateLocalCursor(); // 初始化

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      cursorDisposable.dispose();
      selectionDisposable.dispose();
      contentDisposable.dispose();
      layoutDisposable?.dispose?.();
      // 清理时清除光标状态
      awareness.setLocalStateField('cursor', null);
    };
  }, [username, avatarUrl, editorReady, ydoc]);

  // 渲染远端光标
  useEffect(() => {
    const provider = providerRef.current;
    const editorInstance = editorRef.current;
    if (!provider || !editorInstance || !editorReady) return;
    
    const model = editorInstance.getModel();
    if (!model) return;
    
    const awareness = provider.awareness;

    // 使用 requestAnimationFrame 优化渲染性能
    let rafId: number | null = null;
    const handleChange = () => {
      if (rafId !== null) {
        //作用是当rafId不为null时，取消当前的动画帧
        cancelAnimationFrame(rafId);
      }
      //作用是当rafId为null时，请求下一帧动画

      rafId = requestAnimationFrame(() => {
        try {
          const states = awareness.getStates();
          const newCursors: Record<string, any> = {};

          states.forEach((state, clientId) => {
            // 跳过本地用户
            if (clientId === awareness.clientID) return;
            
            // 检查是否有用户信息和光标信息
            if (!state.user || !state.cursor) return;

            let offset: number | null = null;
            
            // 优先使用 position，然后是 head，最后是 anchor
            if (typeof state.cursor.position === 'number') {
              offset = state.cursor.position;
            } else if (typeof state.cursor.head === 'number') {
              offset = state.cursor.head;
            } else if (typeof state.cursor.anchor === 'number') {
              offset = state.cursor.anchor;
            } else {
              return;
            }

            // 确保偏移量在有效范围内
            if (offset === null || offset === undefined) {
              return;
            }
            const maxLen = model.getValueLength();
            const safeOffset = Math.max(0, Math.min(maxLen, offset));

            let pos;
            try {
              pos = model.getPositionAt(safeOffset);
            } catch (error) {
              // 位置计算失败，跳过这个光标
              return;
            }

            // 获取光标在编辑器中的可见位置
            const layout = editorInstance.getScrolledVisiblePosition(pos);
            if (!layout) return;

            // 获取行高
            const lineHeight = layout.height && layout.height > 0
              ? layout.height
              : (editorInstance.getOption(editor.EditorOption.lineHeight) as number);

            const left = layout.left ?? 0;
            const top = layout.top ?? 0;

            // 检查光标是否在可见区域内（添加一些边距）
            const editorLayout = editorInstance.getLayoutInfo();
            if (left < -50 || left > editorLayout.width + 50 || 
                top < -50 || top > editorLayout.height + 50) {
              // 光标不在可见区域，不渲染
              return;
            }

            newCursors[String(clientId)] = {
              name: state.user.name || 'Anonymous',
              avatarUrl: state.user.avatarUrl || '/image.png',
              color: state.user.color || '#3b82f6',
              top,
              left,
              lineHeight,
              clientId: String(clientId),
            };
          });

          setCursors(newCursors);
        } catch (error) {
          console.warn('渲染远端光标失败:', error);
        }
      });
    };

    awareness.on('change', handleChange);
    
    // 监听滚动和布局变化
    const scrollDisposable = editorInstance.onDidScrollChange(handleChange);
    const layoutDisposable = editorInstance.onDidLayoutChange?.(handleChange);
    const contentDisposable = editorInstance.onDidChangeModelContent(handleChange);

    // 初始渲染
    handleChange();

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      awareness.off('change', handleChange);
      scrollDisposable?.dispose?.();
      layoutDisposable?.dispose?.();
      contentDisposable?.dispose?.();
    };
  }, [editorReady, ydoc]);

  // 同步用户信息到父组件
  useEffect(() => {
    const provider = providerRef.current;
    if (!provider || !onUsersChange) return;

    const awareness = provider.awareness;

    const updateUsers = () => {
      const states = awareness.getStates();
      const usersMap = new Map<number, { name: string; avatarUrl: string; color: string }>();

      states.forEach((state, clientId) => {
        if (state.user) {
          usersMap.set(clientId, {
            name: state.user.name || 'Anonymous',
            avatarUrl: state.user.avatarUrl || '/image.png',
            color: state.user.color || '#3b82f6',
          });
        }
      });

      onUsersChange(usersMap);
    };

    awareness.on('change', updateUsers);
    updateUsers(); // 初始更新

    return () => {
      awareness.off('change', updateUsers);
    };
  }, [editorReady, ydoc, onUsersChange]);

  useEffect(() => {
    const yText = ydoc.getText('monaco');
    const handleContentChange = () => {
      const value = yText.toString();
      onchange?.(value);
      setLeetCodes(value);
    };
    yText.observe(handleContentChange);
    handleContentChange();

    return () => {
      yText.unobserve(handleContentChange);
    };
  }, [ydoc, onchange, setLeetCodes]);

  useEffect(() => {
    return () => {
      bindingRef.current?.destroy();
      providerRef.current?.destroy();
      ydoc.destroy();
    };
  }, [ydoc]);

  // 如果文件不存在，返回空内容
  if (!file) {
    return (
      <div style={{ position: 'relative', height: '100%', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <div style={{ color: 'var(--muted-foreground)' }}>文件不存在</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
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
        {Object.entries(cursors).map(([clientId, cursor]: [string, any]) => (
          <div
            key={clientId}
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
        ))}
      </div>
    </div>
  )
}