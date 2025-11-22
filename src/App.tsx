
import {BrowserRouter,Route,Routes} from "react-router-dom"
import Home from "@/pages/home"
import EditorSigelPage from "@/pages/EditorSigelPage";
import Preview from "./pages/Preview";
import Dashboard from "@/pages/Dashboard";


function App() {
  

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/home" element={<Home />} />
        <Route path="/editor/:roomId" element={<EditorSigelPage />}/>
        <Route path="">
           <Route path="preview" element={<Preview />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
