import Editor from "../Editor";
import FileNameList from "../FileNameList";

export default function CodeEditor() {
//mock data
  const file = {
    name: 'lyy.tsx',
    value: 'import React from "react";\nfunction App() {\n  return (\n    <div>\n      <h1>Hello, World!</h1>\n    </div>\n  );\n}\n\nexport default App;',
    language: 'typescript'
  }
  return (
    <div className="flex flex-col h-full">
        <FileNameList/>
        <Editor file={file} />
    </div>
  )
}