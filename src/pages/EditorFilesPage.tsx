import { Allotment } from "allotment";
import 'allotment/dist/style.css';
import Preview from "./Preview";
import CodeEditor from "../components/CoderEditor";
import Header from "@/components/Header";

export default function EditorFilesPage() {
 
  return (
    <div className="h-screen " >
      <Header word={'Code Editor'} photoUrl={'/logo3.jpg'} />
      <Allotment defaultSizes={[100, 100]}>
        <Allotment.Pane minSize={500}>

          <CodeEditor />

        </Allotment.Pane>
        <Allotment.Pane minSize={0}>

          <Preview />

        </Allotment.Pane>
      </Allotment>
    </div>
  )
}