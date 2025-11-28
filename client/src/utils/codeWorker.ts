



type MessageType = 'console' | 'log' | 'error' | 'success' | 'run';
export interface Message {
    type: MessageType;
    Output?: any[];
    result?: any;
    Code: string;
    error?: any;
}

self.onmessage = function (e: MessageEvent<Message>) {
    const { type, Code } = e.data;
    if (type === 'run') {
        try{
           const result = eval(Code);
          
           postMessage({ type: 'success', result: result === undefined ? 'undefined' : result });
        }
        catch (error) {
            // 发送完整的错误信息，包括堆栈跟踪
            if (error instanceof Error) {
              
                postMessage({ 
                    type: 'error', 
                    error: `${error.name}: ${error.message}\n${error.stack || ''}` 
                });
            } else {
              
                postMessage({ type: 'error', error: String(error) });
            }
        }
    }
      

};

// 处理不可序列化对象
function safeArg(arg: unknown) {
  try { return structuredClone(arg); }
  catch {}
  try { return JSON.parse(JSON.stringify(arg)); }
  catch {}
  return `[Unserializable:${Object.prototype.toString.call(arg)}]`;
}

type ConsoleMethod =
  | 'log' | 'error' | 'warn' | 'info'
  | 'dir' | 'table' | 'trace' | 'assert'
  | 'clear' | 'count' | 'countReset'
  | 'group' | 'groupCollapsed' | 'groupEnd'
  | 'time' | 'timeEnd' | 'timeLog' | 'profile' | 'profileEnd';

// 重写 console
const methods: ConsoleMethod[] = [
  'log','error','warn','info','dir','table','trace','assert',
  'clear','count','countReset','group','groupCollapsed','groupEnd',
  'time','timeEnd','timeLog','profile','profileEnd'
];

/**
 * 拦截控制台，所有日志传给主线程
 */
methods.forEach((method) => {
    let originMethod = console[method];
  (console as any)[method] = (...args: unknown[]) => {
    // 调用原始方法
   (originMethod as any).apply(console, args );
  
    // 发送给主线程
    postMessage({ type: 'console', Output: args.map(safeArg), method,});
  };
});