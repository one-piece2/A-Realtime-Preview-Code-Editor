import { createContext, useEffect, useState, type PropsWithChildren } from 'react'
import { compress, uncompress } from '../utils/loadandcompress'
import { fileName2Language } from '../utils/judgeLangyage'


import { initFiles } from '../utils/files'
import { type Files } from '../types/types'

export interface PlaygroundContext {
  files: Files
  selectedFileName: string
  setSelectedFileName: (fileName: string) => void
  setFiles: (files: Files) => void
  addFile: (fileName: string) => void
  removeFile: (fileName: string) => void
  updateFileName: (oldFieldName: string, newFieldName: string) => void
  theme: 'dark' | 'light'
  setTheme: (theme: 'dark' | 'light') => void
}

export const PlaygroundContext = createContext<PlaygroundContext>({
  selectedFileName: 'App.tsx',
} as PlaygroundContext)
// 从url中获取files
const getFilesFromHash=()=>{
  // 从url中获取hash
  const hash=window.location.hash
  if(!hash) return initFiles
  try{
    // 从url中获取的hash是编码后的，所以要先解码   hash.slice(1) 是去掉hash的第一个字符 #
    //JSON.parse作用是将一个JSON字符串转换为一个JavaScript对象
    return JSON.parse(uncompress(decodeURIComponent(hash.slice(1))))
  }catch(e){
    console.error('从url中获取files失败',e)
    return initFiles
  }
}
export const PlaygroundProvider = (props: PropsWithChildren) => {
  const { children } = props
  const [files, setFiles] = useState<Files>(getFilesFromHash())
  const [selectedFileName, setSelectedFileName] = useState('App.tsx');
  const [theme, setTheme] = useState<PlaygroundContext['theme']>('light')
  const addFile = (name: string) => {
    files[name] = {
      name,
      language: fileName2Language(name),
      value: '',
    }
    setFiles({ ...files })
  }

  const removeFile = (name: string) => {
    delete files[name]
    setFiles({ ...files })
  }

  const updateFileName = (oldFieldName: string, newFieldName: string) => {
    if (!files[oldFieldName] || newFieldName === undefined || newFieldName === null) return
    const { [oldFieldName]: value, ...rest } = files
    const newFile = {
      [newFieldName]: {
        ...value,
        language: fileName2Language(newFieldName),
        name: newFieldName,
      },
    }
    setFiles({
      ...rest,
      ...newFile,
    })
  }
  useEffect(()=>{
    //JSON.stringify作用是将一个JavaScript对象转换为一个JSON字符串
    const hash=compress(JSON.stringify(files))
    //把hash编码后设置到url中 ，还要encodeURIComponent编码一次 把url里不支持的字符编码一下 后续还要decodeURIComponent解码一次
    window.location.hash=encodeURIComponent(hash)
  },[files])

  return (
    <PlaygroundContext.Provider
      value={{
        theme,
        setTheme,
        files,
        selectedFileName,
        setSelectedFileName,
        setFiles,
        addFile,
        removeFile,
        updateFileName,
      }}
    >
      {children}
    </PlaygroundContext.Provider>
  )
}
