// import FileNameList from "../FileNameList";
import { useFiles, useSelectedFileName, useFileActions } from "@/modules/playground";
import { useTheme } from "@/core/config";
import { debounce } from 'lodash-es'
import Editor from "./Editor";

export default function CodeEditor() {
  const files = useFiles()
  const { theme } = useTheme()
  const { setFiles } = useFileActions()
  const { selectedFileName } = useSelectedFileName()
  const file = files[selectedFileName];

// //mock data
//   const file = {
//     name: 'lyy.tsx',
//     value: 'import React from "react";\nfunction App() {\n  return (\n    <div>\n      <h1>Hello, World!</h1>\n    </div>\n  );\n}\n\nexport default App;',
//     language: 'typescript'
//   }
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden">
        {/* <FileNameList/> */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <Editor options={{theme:`vs-${theme}`}} file={file} onChange={debounce((value?: string) => setFiles({...files, [selectedFileName]: { ...file, value: value || '' }}), 500)} />
        </div>
    </div>
  )
}