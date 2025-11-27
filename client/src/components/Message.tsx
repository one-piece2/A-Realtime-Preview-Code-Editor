import React, { useEffect, useState } from 'react'

export interface MessageProps {
    type: 'error' | 'warn'
    content: string
}

export const Message: React.FC<MessageProps> = (props) => {
  const { type, content } = props
  const [visible, setVisible] = useState(false)

  useEffect(() => {
      setVisible(!!content)
  }, [content])

  const isError = type === 'error'
  
  return visible ? (
    <div className={`absolute right-2 top-0 left-2 z-10 flex max-h-[calc(100%-300px)] min-h-[40px] mb-2 ${isError ? 'bg-red-50 text-red-500 border-red-500' : 'bg-yellow-50 text-yellow-500 border-yellow-500'} border-2 rounded-lg`}>
      <pre className="p-3 m-0 overflow-auto whitespace-pre-wrap flex-grow">{content}</pre>
      <button 
        className={`absolute top-1 right-1 w-[18px] h-[18px] p-0 text-[9px] leading-[18px] text-center cursor-pointer rounded-full ${isError ? 'bg-red-500 text-red-50' : 'bg-yellow-500 text-yellow-50'}`}
        onClick={() => setVisible(false)}
      >
        ✕
      </button>
    </div>
  ) : null
}