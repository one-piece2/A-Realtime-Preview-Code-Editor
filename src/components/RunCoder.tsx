import { Button } from 'antd';
import { useContext, useEffect, useRef } from 'react';
import { PlaygroundContext } from '../Context/playgroundcontent';
import {type Message } from '../utils/codeWorker';
import { type codeOutput } from './OutputBox';
import {debounce} from 'lodash-es'
interface RunCoderProps{
  setCodeOutput:(codeOutput:codeOutput)=>void;
}
export default function RunCoder(props:RunCoderProps) {
  const {setCodeOutput} = props;

 const workerRef = useRef<Worker | null>(null);
  const { leetCodes } = useContext(PlaygroundContext);  
 useEffect(() => {
  if(!workerRef.current){
    workerRef.current = new Worker(
      new URL('../utils/codeWorker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current.onmessage=(e:MessageEvent<Message>)=>{
      const { type, Output, result } = e.data;
      if(type==='success'){
        console.log(Output,result)
        setCodeOutput({
          CodeOutput:Output,
          CodeResult:result
        });
      }
      else if(type==='error'){
        console.log(Output,result)
      }
    }
  }
  return ()=>{
    workerRef.current?.terminate();
  }
  }, [workerRef.current]);
  const handleClick=()=>{
    workerRef.current?.postMessage({
     type:'run',
     Code:leetCodes
    })
    
  }
  return (
    <Button size="large"  type="primary" style={{fontWeight:'bold'}} onClick={debounce(handleClick,500)}>
      Run Code
    </Button>
  );
}