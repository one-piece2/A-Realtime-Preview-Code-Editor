import { useContext } from "react"
import { PlaygroundContext } from "../Context/playgroundcontent"
import { useState, useEffect } from "react"
import { FileNameItem } from "./FileListItem"
export default function FileNameList() {
    const {
        files,
        removeFile,
        addFile,
        updateFileName,
        selectedFileName,
        setSelectedFileName,
    } = useContext(PlaygroundContext)

    const [tabs, setTabs] = useState([''])

    useEffect(() => {
        setTabs(Object.keys(files))
    }, [files])

    return (
        <div className="flex overflow-x-auto whitespace-nowrap p-1 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
            {tabs.map((item, index) => (
                <FileNameItem
                    key={item+index}
                    value={item}
                    actived={item === selectedFileName}
                    onClick={() => setSelectedFileName(item)}
                />
            ))}
        </div>
    )

}