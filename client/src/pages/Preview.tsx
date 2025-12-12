import { useEffect, useState, useRef, useMemo } from "react"
import { useFiles, useDependencies } from "@/modules/playground"
// import { compile } from "../utils/compiler";
import { debounce } from "lodash-es";
//以字符串的形式编译代码
import iframeRaw from "../components/ifarm.html?raw";

import { Message } from "../components/Message";

export default function Preview() {
    const files = useFiles()
    const { dependencies } = useDependencies()
    const workerRef = useRef<Worker | null>(null);
    const [compiledCode, setCompiledCode] = useState<string>('')
    const [iframeUrl, setIframeUrl] = useState<string|null>(null)
    const [error, setError] = useState('')
    
    // 用字符串化版本作为稳定的依赖标识
    const filesKey = useMemo(() => JSON.stringify(files), [files]);
    const depsKey = useMemo(() => JSON.stringify(dependencies), [dependencies]);
    
    //引入工作者线程
    useEffect(() => {
        if(!workerRef.current){
            workerRef.current = new Worker(
                new URL('../utils/compiler.ts', import.meta.url),
                { type: 'module' }
            );
            workerRef.current.onmessage = (event: MessageEvent) => {
                const { type, result, message } = event.data;
                if(type === 'success'){
                    setCompiledCode(result);
                } else if(type === 'error' && message){
                    setError(message);
                }
                // 忽略其他消息类型
            }
        }
    }, [])
    
    // 使用 ref 存储最新值，避免 debounce 闭包问题
    const filesRef = useRef(files);
    const depsRef = useRef(dependencies);
    filesRef.current = files;
    depsRef.current = dependencies;
    
    // debounce 函数只创建一次
    const debouncedCompile = useRef(
        debounce(() => {
            if(workerRef.current){
                workerRef.current.postMessage({ 
                    type: 'compile', 
                    files: filesRef.current, 
                    dependencies: depsRef.current 
                });
            }
        }, 500)
    ).current;
    
    // 当 files 或 dependencies 内容变化时触发编译（用字符串化版本比较）
    useEffect(() => {
        setError(''); // 清除错误移到这里，只在依赖变化时执行
        debouncedCompile();
    }, [filesKey, depsKey])
    
    const getIframeUrl = () => {
        try {
            if (!compiledCode) {
                return null;
            }
            const res = iframeRaw
            
                .replace(
                    '<script type="module" id="appSrc"></script>',
                    `<script type="module" id="appSrc">${compiledCode}</script>`
                );
            return URL.createObjectURL(new Blob([res], { type: "text/html" }));
        } catch (error) {
            console.error('Error creating iframe URL:', error);
            return null;
        }
    };
    
    // useEffect(() => {
    //     try {
    //         const res = compile(files);
    //         setCompiledCode(res);
    //     } catch (error) {
    //         console.error('Compilation error:', error);
    //     }
    // }, [files]);
    
    useEffect(() => {
    //清理旧的URL
        if (iframeUrl) {
            URL.revokeObjectURL(iframeUrl);
        }
        
        const newIframeUrl = getIframeUrl();
        setIframeUrl(newIframeUrl);
        
 //清理新的URL
        return () => {
            if (newIframeUrl) {
                URL.revokeObjectURL(newIframeUrl);
            }
        };
    }, [compiledCode]);
    const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'ERROR') {
                    setError(event.data.message);
        }
    }
    useEffect(() => {
        window.addEventListener('message', handleMessage)
        return () => {
          window.removeEventListener('message', handleMessage)
        }
    }, [])
    return (
        <div style={{height: '100%', width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column',zIndex: 1}}>
            {iframeUrl ? (
                <iframe
                    src={iframeUrl}
                    style={{
                        width: '100%',
                 flex:'1',
                        padding: 0,
                        border: 'none',
                    }}
                />
            ) : (
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: '#f5f5f5'}}>
                    Loading preview...
                </div>
            )}
            {/* 使用固定文本确保Message组件能显示 */}
            <Message type='error' content={error} />
        </div>
    )
}