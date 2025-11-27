
import { useCallback, useContext, useEffect, useRef } from 'react';
import { PlaygroundContext } from '../Context/playgroundcontent';
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
  const { leetCodes } = useContext(PlaygroundContext);  
 useEffect(() => {
  if(!workerRef.current){
    workerRef.current = new Worker(
      new URL('../utils/codeWorker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current.onmessage=(e:MessageEvent<Message>)=>{
      const {type,result,Output,error} = e.data;
      if(type === 'success'){
        setError('');
        setCodeResult(result);
        
      }
      else if(type === 'error'){
        setError(error);
      }
      else{
          setCodeOutput((prev) => [...prev, ...Output || []]); // 注意 Output 是数组
      }
    }
  }
  
  //如果以workerRef.current为依赖项目：初始渲染：workerRef.current 是 null，useEffect 执行，创建 worker 并赋值给 workerRef.current
// workerRef.current 变化：此时 workerRef.current 从 null 变为 Worker 实例
// React 检测依赖变化：由于依赖数组中的 workerRef.current 发生了变化，useEffect 会重新执行
// 重复创建和销毁：useEffect 的清理函数（return 中的代码）会先执行，终止刚刚创建的 worker，然后又创建一个新的 worker
  }, []);
  const handleClick = useCallback(
    
    debounce(() => {
    console.log('Running code:', leetCodes);
    
    if (!workerRef.current) {
      console.error('Worker not initialized');
      setError('Worker 未初始化');
      return;
    }

    if (!leetCodes) {
      setError('代码为空');
      return;
    }
 // 清空旧输出
      setError('');
      setCodeOutput([]);
      setCodeResult('');
    workerRef.current.postMessage({
      type: 'run',
      Code: leetCodes
    });
  }, 500), [leetCodes, setCodeOutput]);
  return (
    <button
      className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition-all duration-200"
      onClick={handleClick}
    >
      
      Run Code
    </button>
  );
}
