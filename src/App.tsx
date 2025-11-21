
import {BrowserRouter,Route,Routes} from "react-router-dom"
import Home from "@/pages/home"
import EditorPage from "@/pages/EditorPage";
import Preview from "./pages/Preview";
import Dashboard from "@/pages/Dashboard";

function App() {
  

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/home" element={<Home />} />
        <Route path="/editor/:roomId" element={<EditorPage />}>
          <Route path="preview" element={<Preview />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
