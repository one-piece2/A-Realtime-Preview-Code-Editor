
import React, { useState, useRef, useEffect } from 'react'
import { type FileNameItemProps } from '../types/types'




export const FileNameItem: React.FC<FileNameItemProps> = (props) => {
  const {
    value,
    actived = false,
    onClick,
  } = props

  const [name, setName] = useState(value)
 
  return (
    <div
      className={`px-4 py-2 m-1 rounded-t-lg cursor-pointer transition-colors duration-200 flex items-center justify-center text-sm ${actived ? 'bg-white dark:bg-gray-800 border-b-0 shadow-sm font-medium text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
      onClick={onClick}
    >
      <span>{name}</span>
    </div>
  )
}