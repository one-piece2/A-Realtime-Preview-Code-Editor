
import React, { useState, useRef, useEffect } from 'react'
import { type FileNameItemProps } from '../types/types'
import { Popconfirm } from 'antd';




export const FileNameItem: React.FC<FileNameItemProps> = (props) => {
  const {
    value,
    actived = false,
    onClick,
    onEditComplete,
    onRemove,
    readonly,
    creating
  } = props

  const [name, setName] = useState(value);
  const [editing, setEditing] = useState(false)
  const [editingCreating] = useState(creating)
  const inputRef = useRef<HTMLInputElement>(null)
  const handleDoubleClick = () => {
    setEditing(true)
    setTimeout(() => {
      inputRef?.current?.focus()
    }, 0)
  }
  useEffect(() => {
    if (editingCreating) {
      inputRef?.current?.focus()
    }
  }, [editingCreating]);

  return (
    <div
      className={`px-4 py-2 m-1 rounded-t-lg cursor-pointer transition-colors duration-200 flex items-center justify-center text-sm ${actived ? 'bg-white dark:bg-gray-800 border-b-0 shadow-sm font-medium text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
      onClick={onClick}
    >
      {editing ? (
        <input
          ref={inputRef}
          className="w-full text-center outline-none"
          value={name}
          onBlur={() => {
            setEditing(false)
            onEditComplete(name)
          }}
          onChange={(e) => setName(e.target.value)}
        />
      ) : (
        <>
          <span onDoubleClick={!readonly ? handleDoubleClick : () => { }}>{name}</span>
          {
            !readonly ? (
              <Popconfirm
                title="确认删除该文件吗？"
                okText="确定"
                cancelText="取消"
                onConfirm={(e) => {
                  e?.stopPropagation();
                  onRemove();
                }}
              >
                <span style={{ marginLeft: 5, display: 'flex' }}>
                  <svg width='12' height='12' viewBox='0 0 24 24'>
                    <line stroke='#999' x1='18' y1='6' x2='6' y2='18'></line>
                    <line stroke='#999' x1='6' y1='6' x2='18' y2='18'></line>
                  </svg>
                </span>
              </Popconfirm>
            ) : null
          }
      </>

      )}
      </div>
  )}