import { useState, useContext, } from 'react';
import { Card, Typography, Empty, Button, message, } from 'antd';
import { CopyOutlined, ClearOutlined, ReloadOutlined } from '@ant-design/icons';
import { PlaygroundContext } from '../Context/playgroundcontent';
import copy from 'copy-to-clipboard';
import RunCoder from './RunCoder';
const { Title, Text } = Typography;

interface OutputBoxProps {


  onClear?: () => void;
  onRefresh?: () => void;

}

export default function OutputBox({



  onClear,
  onRefresh,

}: OutputBoxProps) {
  const { theme } = useContext(PlaygroundContext);
  const [messageApi, contextHolder] = message.useMessage();

  const [codeOutput, setCodeOutput] = useState<any[]>(
    []

  );
  const [CodeResult, setCodeResult] = useState<any>();

  const [error, setError] = useState<any>('');









  // 复制输出内容到剪贴板
  const handleCopy = () => {
    if (codeOutput && copy(codeOutput.join('\n').trim())) {
      messageApi.success('输出内容已复制到剪贴板');
    } else {
      messageApi.warning('无可复制内容');
    }
  };

  // 清除输出内容
  const handleClear = () => {


    setCodeOutput([]);
    if (onClear) {
      onClear();
    }
    messageApi.info('输出已清除');
  }


  // 刷新输出
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
      messageApi.info('正在刷新输出...');
    }
  };

  // 根据主题确定样式类名
  const contentBgClass = theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50';

  const textColorClass = theme === 'dark' ? 'text-gray-200' : 'text-gray-800';

  return (
    <div className={`relative h-full ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
      {contextHolder}
      <Card
        style={{ backgroundColor: theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200' }}

        title={
          <div className="flex items-center justify-between w-full">
            <Title level={5} className="m-0">Output</Title>
            <div className="flex space-x-2">
              <RunCoder setCodeOutput={setCodeOutput} setCodeResult={setCodeResult} setError={setError} />
              <Button
                type="text"
                size="small"
                icon={<ReloadOutlined />}
                title="刷新输出"
                onClick={handleRefresh}

              />


              <>
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  title="复制输出"
                  onClick={handleCopy}

                />
                <Button
                  type="text"
                  size="small"
                  icon={<ClearOutlined />}
                  title="清除输出"
                  onClick={handleClear}

                />
              </>

            </div>
          </div>
        }
      >
        <div className={`flex-1 overflow-auto p-4 ${contentBgClass} rounded font-mono text-sm ${textColorClass} transition-colors duration-300`}>



          <div className="flex items-center justify-center h-full min-h-[100px]">
            {error ? (
              <pre className="text-red-500">{error}</pre>)

              : codeOutput.length || (CodeResult !== '' && CodeResult !== null && CodeResult !== undefined && CodeResult !== 'undefined') ? (
                <div className="flex flex-col items-center justify-center px-4 py-2" >
                  <pre className="text-green-400">
                    {codeOutput.map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </pre>
                  {CodeResult !== '' && CodeResult !== null && CodeResult !== undefined && CodeResult !== 'undefined' && (
                    <pre className="text-blue-400 font-bold">Result: {String(CodeResult)}</pre>
                  )}
                </div>
              ) :
                <Empty
                  description={
                    <Text type="secondary">{'暂无输出结果'}</Text>
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            }
          </div>



        </div>
      </Card>
    </div>
  );
}
