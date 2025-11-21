
import {BrowserRouter,Route,Routes} from "react-router-dom"
import Home from "@/pages/home"
import EditorPage from "@/pages/EditorPage";
function App() {
  

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/editor/:roomId" element={<EditorPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
