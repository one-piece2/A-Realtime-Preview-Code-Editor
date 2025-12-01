import MonacoEditor, {
  type OnMount,
  type EditorProps,
} from '@monaco-editor/react'
import { editor } from "monaco-editor";
import { type EditorFile } from '../../types/types';
import { createATA } from '../../utils/ata';
import { useEffect, useRef } from 'react';

interface Props {
    file: EditorFile
    onChange?: EditorProps['onChange'],
    options?: editor.IStandaloneEditorConstructionOptions
}
export default function Editor(props: Props) {
  const ataRef = useRef<((code: string) => void) | null>(null)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const { file, onChange, options } = props;

  //设置支持jsx语法
  const handleEditorMount: OnMount = (editor, monaco: any) => {
    // 绑定 Ctrl+Q快捷键来格式化文档
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyQ, () => {
      editor.getAction("editor.action.formatDocument")?.run();
    });
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
      ataRef.current= createATA((code, path) => {
      // 处理自动下载的文件，例如将其保存到本地
      monaco.languages.typescript.typescriptDefaults.addExtraLib(code, `file://${path}`)
    });
   // 监听编辑器内容变化，触发自动类型获取
    editor.onDidChangeModelContent(() => {
      ataRef.current?.(editor.getValue());
    });
   // 初始化时触发一次类型获取
    ataRef.current?.(editor.getValue());

  };
  useEffect(() => {
    
    if (editorRef.current) {
      const current = editorRef.current.getValue()
      if (current !== file.value) editorRef.current.setValue(file.value)
    }
    // 触发 ata 去检查并下载类型声明
    ataRef.current?.(file.value)
  }, [file?.name, file?.value])

  return <MonacoEditor
    height='100%'
    path={file.name}
    language={file.language}
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
}