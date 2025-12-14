import MonacoEditor, {
  type OnMount,
  type EditorProps,
} from '@monaco-editor/react'
import { editor } from "monaco-editor";
import { type EditorFile } from '../../types/types';
import { createATA } from '../../utils/ata';
import { useEffect, useRef, useState, useCallback } from 'react';
import { registerInlineCompletionProvider, registerCompletionKeybindings } from './inlineCompletionProvider';
import { Loader2, Sparkles } from 'lucide-react';
import type { IDisposable } from 'monaco-editor';
import { useTheme } from '@/core/config';

interface Props {
  file: EditorFile | undefined
  onChange?: EditorProps['onChange'],
  options?: editor.IStandaloneEditorConstructionOptions
}
export default function Editor(props: Props) {
  const ataRef = useRef<((code: string) => void) | null>(null)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const { file, onChange, options } = props;
  const { theme } = useTheme();
  const [isAILoading, setIsAILoading] = useState(false);
  const [isAIEnabled, setIsAIEnabled] = useState(false);
  // AI 补全
  const aiDisposablesRef = useRef<IDisposable[]>([]);
  const monacoRef = useRef<any>(null);

  const handleLoadingChange = useCallback((loading: boolean) => {
    setIsAILoading(loading);
  }, []);

  // 开启/关闭 AI 补全
  const toggleAICompletion = useCallback(() => {
    if (!editorRef.current || !monacoRef.current) return;

    if (isAIEnabled) {
      // 关闭: 清理注册
      aiDisposablesRef.current.forEach(d => d.dispose());
      aiDisposablesRef.current = [];
      setIsAIEnabled(false);
    } else {
      // 开启: 注册 AI 补全
      const providerDisposable = registerInlineCompletionProvider(
        monacoRef.current, 
        undefined, 
        handleLoadingChange
      );
      const keybindingDisposables = registerCompletionKeybindings(
        editorRef.current, 
        monacoRef.current
      );
      aiDisposablesRef.current = [providerDisposable, ...keybindingDisposables];
      setIsAIEnabled(true);
    }
  }, [isAIEnabled, handleLoadingChange]);

  //设置支持jsx语法
  const handleEditorMount: OnMount = (editor, monaco: any) => {
    // 保存 editor 实例
    editorRef.current = editor;

    monaco.editor.defineTheme('vs-light-ai', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editorGhostText.foreground': '#22c55e', 
      }
    });
    monaco.editor.defineTheme('vs-dark-ai', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editorGhostText.foreground': '#4ade80', 
      }
    });
    // 绑定 Ctrl+Q快捷键来格式化文档
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyQ, () => {
      editor.getAction("editor.action.formatDocument")?.run();
    });
    editor.updateOptions({
      inlineSuggest: {
        enabled: true,
        mode: "prefix",
      },
      //禁用冲突功能
      suggest: {
        preview: false, // 禁用默认的建议预览
        showInlineDetails: false, // 不显示行内详情
      },

      cursorSmoothCaretAnimation: "on",
    })
    // 设置 TypeScript 的编译选项，确保支持JSX语法
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      // 明确启用JSX支持
      jsx: monaco.languages.typescript.JsxEmit.Preserve,
      // 允许JSX在.tsx文件中使用
      allowJs: true,
      // 允许使用JSX语法
      jsxFactory: 'React.createElement',
      jsxFragmentFactory: 'React.Fragment',
      // 允许CommonJS模块和ES模块之间的互操作
      esModuleInterop: true,


    });
    // 创建ATA实例
    ataRef.current = createATA((code, path) => {
      // 处理自动下载的文件，例如将其保存到本地
      monaco.languages.typescript.typescriptDefaults.addExtraLib(code, `file://${path}`)
    });
    // 监听编辑器内容变化，触发自动类型获取
    editor.onDidChangeModelContent(() => {
      ataRef.current?.(editor.getValue());
    });
    // 初始化时触发一次类型获取
    ataRef.current?.(editor.getValue());

    // 保存 monaco 实例供后续使用
    monacoRef.current = monaco;
  };

  // 主题切换效果
  useEffect(() => {
    if (editorRef.current) {
    
      const monacoTheme = theme === 'dark' ? 'vs-dark-ai' : 'vs-light-ai';
      editorRef.current.updateOptions({ theme: monacoTheme });
    }
  }, [theme]);

  useEffect(() => {
    if (!file) return;

    if (editorRef.current) {
      const current = editorRef.current.getValue()
      if (current !== file.value) editorRef.current.setValue(file.value)
    }
    // 触发 ata 去检查并下载类型声明
    ataRef.current?.(file.value)
  }, [file?.name, file?.value])

  // 如果文件不存在，返回空内容
  if (!file) {
    return null;
  }

  const monacoTheme = theme === 'dark' ? 'vs-dark-ai' : 'vs-light-ai';

  return <>
    {/* AI 补全控制栏 */}
    <div className="absolute top-2 right-2 z-50 flex items-center gap-2">
      {/* Loading 指示器 */}
      {isAILoading && (
        <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-md border shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">AI 生成中...</span>
        </div>
      )}
      {/* AI 补全开关按钮 */}
      <button
        onClick={toggleAICompletion}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border shadow-sm transition-colors ${
          isAIEnabled 
            ? 'bg-primary text-primary-foreground border-primary' 
            : 'bg-background/80 backdrop-blur-sm text-muted-foreground hover:bg-accent'
        }`}
        title={isAIEnabled ? '关闭 AI 补全' : '开启 AI 补全'}
      >
        <Sparkles className="h-4 w-4" />
        <span className="text-sm">{isAIEnabled ? 'AI 已开启' : 'AI 补全'}</span>
      </button>
    </div>
    <MonacoEditor
      height='100%'
      path={file.name}
      language={file.language}
      theme={monacoTheme}
      onMount={handleEditorMount}
      value={file.value}
      onChange={onChange}
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
  </>
}