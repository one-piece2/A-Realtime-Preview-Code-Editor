import { useContext, useEffect, useState } from "react"
import { PlaygroundContext } from "../Context/playgroundcontent"
import Editor from "../components/Editor";
import { compile } from "../utils/compiler";

export default function Preview() {

    const { files} = useContext(PlaygroundContext)
    const [compiledCode, setCompiledCode] = useState('')

    useEffect(() => {
        const res = compile(files);
        setCompiledCode(res);
    }, [files]);

    return <div style={{height: '100%'}}>
        <Editor file={{
            name: 'dist.js',
            value: compiledCode,
            language: 'javascript'
        }}/>
    </div>
}