import MonacoEditor, {
  type OnMount,
  type EditorProps,
} from '@monaco-editor/react'
import { editor } from "monaco-editor";
import React from 'react';
import { createATA } from '../utils/ata';

export default function Editor() {

  const code = `export default function App() {
    return <div>xxx</div>
}
    `;
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
      // 编译目标为ES2020
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      // 使用ES模块
      module: monaco.languages.typescript.ModuleKind.ESNext
    });
    // 创建ATA实例
    const ata = createATA((code, path) => {
      // 处理自动下载的文件，例如将其保存到本地
      monaco.languages.typescript.typescriptDefaults.addExtraLib(code, `file://${path}`)
    });
   // 监听编辑器内容变化，触发自动类型获取
    editor.onDidChangeModelContent(() => {
      ata(editor.getValue());
    });
   // 初始化时触发一次类型获取
    ata(editor.getValue());

  };

  return <MonacoEditor
    height='100%'
    path={'lyy.tsx'}
    language={"typescript"}
    onMount={handleEditorMount}
    value={code}
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
      }
    }
  />
}