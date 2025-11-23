import { useContext } from "react"
import { PlaygroundContext } from "../Context/playgroundcontent"
import { useState, useEffect } from "react"
import { FileNameItem } from "./FileListItem"
import { APP_COMPONENT_FILE_NAME, ENTRY_FILE_NAME, IMPORT_MAP_FILE_NAME } from "@/utils/files"
export default function FileNameList() {
    const {
        files,
        removeFile,
        addFile,
        updateFileName,
        selectedFileName,
        setSelectedFileName,
    } = useContext(PlaygroundContext)
    const [creating, setCreating] = useState(false);
    const [tabs, setTabs] = useState([''])

    useEffect(() => {
        setTabs(Object.keys(files))
    }, [files])
    const handleEditComplete = (name: string, prevName: string) => {
        setSelectedFileName(name)
        updateFileName(prevName, name)
        setCreating(true)
    }
    const addTab = () => {
        const newFileName = 'Comp' + Math.random().toString().slice(2, 8) + '.tsx';
        addFile(newFileName);
        setSelectedFileName(newFileName);
        setCreating(true)
    }
const handleRemove = (name: string) => {
    removeFile(name)
    setSelectedFileName(ENTRY_FILE_NAME)
}
const readonlyFileNames = [ENTRY_FILE_NAME, IMPORT_MAP_FILE_NAME, APP_COMPONENT_FILE_NAME];
    return (
        <div className="flex overflow-x-auto whitespace-nowrap p-1 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
            {tabs.map((item, index) => (
                <FileNameItem
                    readonly={readonlyFileNames.includes(item)}
                    creating={creating && index === tabs.length - 1}
                    key={item + index}
                    value={item}
                    actived={item === selectedFileName}
                    onClick={() => setSelectedFileName(item)}
                    onEditComplete={(name) => handleEditComplete(name, item)}
                    onRemove={() => {
                      
                        handleRemove(item)
                    }}
                />
            ))}
            <div className='px-2 py-1  dark:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-pointer mt-1' onClick={addTab} >
                +
            </div>
        </div>
    )

}