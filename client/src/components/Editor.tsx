import MonacoEditor from '@monaco-editor/react'
import { ACTIONS } from '../action';
import { editor } from "monaco-editor";
import { type EditorFile } from '../types/types';
import { createATA } from '../utils/ata';
import { useEffect, useRef } from 'react';
import { type Socket } from 'socket.io-client';
import {PlaygroundContext} from '../Context/playgroundcontent';
import { useContext } from 'react';


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
  const {setLeetCodes}=useContext(PlaygroundContext)
const isRemoteChangeRef = useRef(false);
  const { file, options, socketRef, roomId, onchange } = props;

  // 处理编辑器挂载事件
  const handleEditorMount = (editor: editor.IStandaloneCodeEditor, monaco: any) => {
    editorRef.current = editor


    // 绑定 Ctrl+Q快捷键来格式化文档
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyQ, () => {
      editor.getAction("editor.action.formatDocument")?.run();
    });
    // 设置 Ty`peScript 的编译选项，确保支持JSX语法
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
    
    // 监听编辑器内容变化，
    editor.onDidChangeModelContent((e: any) => {
      console.log( '编辑器内容变化事件')
      const code = editor.getValue();
      onchange?.(code);
      setLeetCodes(code);
      // 触发自动类型获取
      ataRef.current?.(code);
      
      // 调用onChange回调
      // onChange?.(code);
      
      // 区分变更来源，只有当不是通过setValue方法触发的变更时才发送socket事件
      if (isRemoteChangeRef.current) {
         // 这是远程更新引起的，不往后端发
         isRemoteChangeRef.current = false;
          return;
  
        
      }
      // 这是本地用户输入，应当广播
  console.log("编辑器给后端");
  console.log('socketRef 状态:', socketRef?.current?.connected, socketRef?.current?.id);
  socketRef?.current?.emit(ACTIONS.CODE_CHANGE, { roomId, code });
    });
    
    // 初始化时触发一次类型获取
    ataRef.current?.(editor.getValue());
  };
  useEffect(() => {

    // if (editorRef.current) {
    //   const current = editorRef.current.getValue()
    //   if (current !== file.value) editorRef.current.setValue(file.value)
    // }
    // 触发 ata 去检查并下载类型声明
    ataRef.current?.(file.value)
  }, [file?.name, file?.value])
  useEffect(() => {
    if (!socketRef?.current) return;
    
    socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
      console.log(code, '接收socket代码变更');
      if (code && editorRef.current) {
        isRemoteChangeRef.current = true;
        editorRef.current.setValue(code);
      }
    });
    
    // 清理函数 - 移除事件监听器
    return () => {
      socketRef.current?.off(ACTIONS.CODE_CHANGE);
    };
  }, [socketRef?.current]);
  // const handlechange=(value: string | undefined)=>{
  //   if(value!==undefined){
  //     setLeetCodes(value)
    
  //   }}
  return <MonacoEditor

    height='100%'
    path={file.name}
    language={file.language}
    onMount={handleEditorMount}
    value={file.value}
    // onChange={handlechange
    // }
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
