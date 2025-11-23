import { useContext, useEffect, useState } from "react"
import { PlaygroundContext } from "../Context/playgroundcontent"
import { compile } from "../utils/compiler";
import iframeRaw from "../components/ifarm.html?raw";
import { IMPORT_MAP_FILE_NAME } from "@/utils/files";
import { Message } from "../components/Message";

export default function Preview() {
    const { files} = useContext(PlaygroundContext)
    const [compiledCode, setCompiledCode] = useState<string>('')
    const [iframeUrl, setIframeUrl] = useState<string|null>(null)
    
    const getIframeUrl = () => {
        try {
            if (!compiledCode) {
                return null;
            }
            const res = iframeRaw
                .replace(
                    '<script type="importmap"></script>',
                    `<script type="importmap">${files[IMPORT_MAP_FILE_NAME]?.value || ''}</script>`
                )
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
    
    useEffect(() => {
        try {
            const res = compile(files);
            setCompiledCode(res);
        } catch (error) {
            console.error('Compilation error:', error);
        }
    }, [files]);
    
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
    }, [compiledCode, files[IMPORT_MAP_FILE_NAME]?.value]);
    const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'ERROR') {
                    setError(event.data.message);
        }
    }
        const [error, setError] = useState('')
    useEffect(() => {
        window.addEventListener('message', handleMessage)
        return () => {
          window.removeEventListener('message', handleMessage)
        }
    }, [])
    return (
        <div style={{height: '100%'}}>
            {iframeUrl ? (
                <iframe
                    src={iframeUrl}
                    style={{
                        width: '100%',
                        height: '100%',
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