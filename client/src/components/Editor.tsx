import MonacoEditor from '@monaco-editor/react'

import { editor } from "monaco-editor";
import { type EditorFile } from '../types/types';
import { createATA } from '../utils/ata';
import { useEffect, useRef, useContext, useMemo, useState } from 'react';
import { type Socket } from 'socket.io-client';
import { PlaygroundContext } from '../Context/playgroundcontent';

import * as Y from 'yjs'
import { MonacoBinding } from 'y-monaco'
import { SocketIOProvider } from '../yjs/socket-provider'; // 自定义 Provider，负责 Yjs 与 socket.io 的通信

interface Props {
  file: EditorFile
  onchange?: (code: string) => void
  options?: editor.IStandaloneEditorConstructionOptions,
  socketRef?: React.MutableRefObject<Socket | null>,
  roomId?: string
}
export default function Editor(props: Props) {
  const ataRef = useRef<((code: string) => void) | null>(null)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const bindingRef = useRef<MonacoBinding | null>(null) // 保存 MonacoBinding，方便卸载时销毁
  const providerRef = useRef<SocketIOProvider | null>(null) // 保存 Provider 实例，方便统一清理
  const { setLeetCodes } = useContext(PlaygroundContext)
  const { file, options, socketRef, roomId, onchange } = props;
  const ydoc = useMemo(() => new Y.Doc(), []) // 每个编辑器实例创建独立的 Y.Doc
  const [editorReady, setEditorReady] = useState(false) // 标记 Monaco 是否挂载完成

  // 处理编辑器挂载事件
  const handleEditorMount = (editorInstance: editor.IStandaloneCodeEditor, monaco: any) => {
    editorRef.current = editorInstance

    // 绑定 Ctrl+Q 快捷键来格式化文档
    editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyQ, () => {
      editorInstance.getAction("editor.action.formatDocument")?.run();
    });
    // 设置 TypeScript 的编译选项，确保支持 JSX 语法
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      jsx: monaco.languages.typescript.JsxEmit.Preserve,
      // 允许JSX在.tsx文件中使用
      allowJs: true,
      // 允许使用JSX语法
      jsxFactory: 'React.createElement',
      jsxFragmentFactory: 'React.Fragment',
      // 允许CommonJS模块和ES模块之间的互操作
      esModuleInterop: true,
    });

    // 创建 ATA 实例，自动补充缺失的类型声明
    ataRef.current = createATA((code, path) => {
      monaco.languages.typescript.typescriptDefaults.addExtraLib(code, `file://${path}`)
    });

    // 监听编辑器内容变化，用于触发 ATA 与对外回调（协同同步交由 Yjs 完成）
    editorInstance.onDidChangeModelContent(() => {
      const code = editorInstance.getValue();
      onchange?.(code);
      setLeetCodes(code);
      // 触发自动类型获取
      ataRef.current?.(code);
    });

    // 初始化时触发一次类型下载
    ataRef.current?.(editorInstance.getValue());
    setEditorReady(true); // 标记编辑器已准备好，可与 Yjs 建立绑定
  };

  // 监听文件变化，触发 ATA 重新拉取类型声明
  useEffect(() => {
    ataRef.current?.(file.value)
  }, [file?.name, file?.value])

  const socket = socketRef?.current; // 拿到 socket 实例，避免直接依赖 ref 对象

  // 建立 SocketIOProvider，将当前房间的 Y.Doc 与服务器同步
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

  // 将 Yjs 文本与 Monaco 编辑器绑定，实现真正的协同编辑
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
  }, [ editorReady]);

  // 监听 Yjs 文本变化，用于更新外部状态（如 codeRef、leetCodes）
  
  useEffect(() => {
    const yText = ydoc.getText('monaco');
    const handleContentChange = () => {
      const value = yText.toString();
      onchange?.(value);
      setLeetCodes(value);
    };
    yText.observe(handleContentChange);
    handleContentChange(); // 初始化时触发一次，保持状态一致

    return () => {
      yText.unobserve(handleContentChange);
    };
  }, [ydoc, onchange, setLeetCodes]);

  // 组件卸载时统一清理绑定、Provider 与 Y.Doc
  useEffect(() => {
    return () => {
      bindingRef.current?.destroy();
      providerRef.current?.destroy();
      ydoc.destroy();
    };
  }, [ydoc]);

  return <MonacoEditor
    height='100%'
    path={file.name}
    language={file.language}
    onMount={handleEditorMount}
   defaultValue={''}
    options={
      {
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
      }

    }
  />
}