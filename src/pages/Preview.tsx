import { useContext, useEffect, useState } from "react"
import { PlaygroundContext } from "../Context/playgroundcontent"
import Editor from "../components/Editor";
import { compile } from "../utils/compiler";
import iframeRaw from "../components/ifarm.html?raw";
import { IMPORT_MAP_FILE_NAME } from "@/utils/files";
export default function Preview() {

    const { files} = useContext(PlaygroundContext)
    const [compiledCode, setCompiledCode] = useState('')
    const [iframeUrl, setIframeUrl] = useState('')
const getIframeUrl = () => {
    const res = iframeRaw
      .replace(
        '<script type="importmap"></script>',
        `<script type="importmap">${files[IMPORT_MAP_FILE_NAME].value}</script>`
      )
      .replace(
        '<script type="module" id="appSrc"></script>',
        `<script type="module" id="appSrc">${compiledCode}</script>`
      );
    return URL.createObjectURL(new Blob([res], { type: "text/html" }));
  };
    useEffect(() => {
        const res = compile(files);
        setCompiledCode(res);
    }, [files]);
useEffect(() => {
    const iframeUrl = getIframeUrl();
    setIframeUrl(iframeUrl);
}, [compiledCode,files[IMPORT_MAP_FILE_NAME].value]);
    return <div style={{height: '100%'}}>
        {/* <Editor file={{
            name: 'dist.js',
            value: compiledCode,
            language: 'javascript'
        }}/> */}
          <iframe
            src={iframeUrl}
            style={{
                width: '100%',
                height: '100%',
                padding: 0,
                border: 'none',
            }}
        />
    </div>
}