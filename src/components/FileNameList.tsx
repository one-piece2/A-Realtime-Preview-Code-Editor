import { useContext } from "react"
import { PlaygroundContext } from "../Context/playgroundcontent"
import { useState, useEffect } from "react"

export default function FileNameList() {
    const {
        files,
        removeFile,
        addFile,
        updateFileName,
        selectedFileName
    } = useContext(PlaygroundContext)

    const [tabs, setTabs] = useState([''])

    useEffect(() => {
        setTabs(Object.keys(files))
    }, [files])

    return <div>
        {
            tabs.map((item, index) => (
                <div>{item}</div>
            ))
        }
    </div>

}