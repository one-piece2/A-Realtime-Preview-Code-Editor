import Editor from "../Editor";
import FileNameList from "../FileNameList";
import { PlaygroundContext } from "../../Context/playgroundcontent";
import { useContext } from "react";
import {debounce} from 'lodash-es'

export default function CodeEditor() {
  const { 
    files, 
    setFiles, 
    selectedFileName, 
    setSelectedFileName
} = useContext(PlaygroundContext)
const file = files[selectedFileName];
// //mock data
//   const file = {
//     name: 'lyy.tsx',
//     value: 'import React from "react";\nfunction App() {\n  return (\n    <div>\n      <h1>Hello, World!</h1>\n    </div>\n  );\n}\n\nexport default App;',
//     language: 'typescript'
//   }
  return (
    <div className="flex flex-col h-full">
        <FileNameList/>
        <Editor file={file} onChange={debounce((value?: string) => setFiles({...files, [selectedFileName]: { ...file, value: value || '' }}), 500)} />
    </div>
  )
}