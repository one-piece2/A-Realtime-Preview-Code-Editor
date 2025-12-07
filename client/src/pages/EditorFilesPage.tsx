import { Allotment } from "allotment";
import 'allotment/dist/style.css';
import Preview from "./Preview";
import CodeEditor from "../components/CoderEditor";
import Header from "@/components/Header";
import { FileTree } from "@/components/FileTree/FileTree";
export default function EditorFilesPage() {

  return (
    <div className="h-screen flex flex-col " >

      <Header word={'Code Editor'} photoUrl={'/logo3.jpg'} />

      <div className="flex-1 flex overflow-hidden">
        {/* FileTree 固定在左侧，固定宽度，不可拖动 */}
        <div className="w-[220px] shrink-0 overflow-hidden">
          <FileTree />
        </div>

        {/* 右侧使用 Allotment 管理 CodeEditor 和 Preview */}
        <div className="flex-1 min-w-0">
          <Allotment defaultSizes={[100, 100]}>
            <Allotment.Pane minSize={500}>
              <CodeEditor />
            </Allotment.Pane>

            <Allotment.Pane minSize={0}>
              <Preview />
            </Allotment.Pane>
          </Allotment>
        </div>
      </div>

    </div>
  )
}