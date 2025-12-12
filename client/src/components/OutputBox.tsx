import { useState } from 'react';
import { useTheme } from '@/core/config';
import copy from 'copy-to-clipboard';
import RunCoder from './RunCoder';
import {message} from 'antd';

interface OutputBoxProps {
  onClear?: () => void;
  onRefresh?: () => void;
}

export default function OutputBox({ onClear, onRefresh }: OutputBoxProps) {
  const { theme } = useTheme();

  const [codeOutput, setCodeOutput] = useState<any[]>([]);
  const [CodeResult, setCodeResult] = useState<any>('');
  const [error, setError] = useState<any>('');
 const [messageApi, contextHolder] = message.useMessage();
  const isDark = theme === 'dark';

  const handleCopy = () => {
    if (codeOutput.length === 0) return;
    copy(codeOutput.join('\n'));
    messageApi.success('输出已复制。');
  };

  const handleClear = () => {
    setCodeOutput([]);
    onClear?.();
  };

  const handleRefresh = () => {
    onRefresh?.();
  };

  return (
    <div className={`h-full w-full flex flex-col rounded-lg  
        ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'}
      `}
    >
      {contextHolder}
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2 border-b
          ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-100'}
      `}>
        <div className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Output
        </div>

        {/* 控制按钮组 */}
        <div className="flex items-center gap-2">

          <RunCoder 
            setCodeOutput={setCodeOutput}
            setCodeResult={setCodeResult}
            setError={setError}
          />

          <button
            onClick={handleRefresh}
            className="px-2 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            Refresh
          </button>

          <button
            onClick={handleCopy}
            className="px-2 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Copy
          </button>

          <button
            onClick={handleClear}
            className="px-2 py-1 text-sm rounded bg-red-600 text-white hover:bg-red-700"
          >
            Clear
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className={`flex-1 overflow-auto p-4 font-mono text-sm whitespace-pre-wrap
          ${isDark ? 'text-gray-200 bg-gray-900' : 'text-gray-800 bg-gray-50'}
      `}>
        {/* 错误 */}
        {error && (
          <div className="text-red-400">
            {error}
          </div>
        )}

        {/* 输出 */}
        {codeOutput.length > 0 && (
          <div className="space-y-1 text-green-400">
            {codeOutput.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}

        {/* result */}
        {CodeResult !== undefined && CodeResult !== '' &&CodeResult !== 'undefined'&&CodeResult !== null&& (
          <div className="mt-3 text-blue-400 font-bold">
            Result: {String(CodeResult)}
          </div>
        )}

        {/* 空状态 */}
        {!error && codeOutput.length === 0 && !CodeResult && (
          <div className="text-gray-400 text-center mt-10">
            No output yet.
          </div>
        )}
      </div>
    </div>
  );
}
