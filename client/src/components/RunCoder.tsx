
import {  useEffect, useRef } from 'react';

import {useLeetCodes} from '../modules/playground';
import {type Message } from '../utils/codeWorker';

import {debounce} from 'lodash-es'
interface RunCoderProps{
  setCodeOutput: React.Dispatch<React.SetStateAction<any[]>>;
  setCodeResult:(result:any)=>void;
  setError:(error:any)=>void;
}
export default function RunCoder(props:RunCoderProps) {
  const {setCodeOutput,setCodeResult,setError} = props;

  const workerRef = useRef<Worker | null>(null);
  const { leetCodes } = useLeetCodes();
  
  // 使用 ref 存储最新的值，避免 debounce 闭包问题
  const leetCodesRef = useRef(leetCodes);
  const setErrorRef = useRef(setError);
  const setCodeOutputRef = useRef(setCodeOutput);
  const setCodeResultRef = useRef(setCodeResult);
  
  // 每次渲染更新 ref
  leetCodesRef.current = leetCodes;
  setErrorRef.current = setError;
  setCodeOutputRef.current = setCodeOutput;
  setCodeResultRef.current = setCodeResult;
  
  useEffect(() => {
    if(!workerRef.current){
      workerRef.current = new Worker(
        new URL('../utils/codeWorker.ts', import.meta.url),
        { type: 'module' }
      );
      workerRef.current.onmessage=(e:MessageEvent<Message>)=>{
        const {type,result,Output,error} = e.data;
        if(type === 'success'){
          setErrorRef.current('');
          setCodeResultRef.current(result);
        }
        else if(type === 'error'){
          setErrorRef.current(error);
        }
        else if (type === 'console'){
          setCodeOutputRef.current((prev) => [...prev, ...Output || []]);
        }
      }
    }
  
  
  }, []);
  
  // debounce 函数只创建一次
  const handleClick = useRef(
    debounce(() => {
      console.log('Running code:', leetCodesRef.current);
      
      if (!workerRef.current) {
        console.error('Worker not initialized');
        setErrorRef.current('Worker 未初始化');
        return;
      }

      if (!leetCodesRef.current) {
        setErrorRef.current('代码为空');
        return;
      }
      // 清空旧输出
      setErrorRef.current('');
      setCodeOutputRef.current([]);
      setCodeResultRef.current('');
      workerRef.current.postMessage({
        type: 'run',
        Code: leetCodesRef.current
      });
    }, 500)
  ).current;
  return (
    <button
      className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition-all duration-200"
      onClick={handleClick}
    >
      
      Run Code
    </button>
  );
}
