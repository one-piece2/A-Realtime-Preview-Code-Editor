
//切换主题按钮
import {type HeaderProps} from '../types/types'
import { MoonOutlined, SunOutlined, CopyOutlined, DownloadOutlined } from '@ant-design/icons'
//复制按钮
import copy from 'copy-to-clipboard'
// 引入下载文件函数
import { downloadFiles } from '../utils/loadandcompress';

import { PlaygroundContext } from '../Context/playgroundcontent';
import { useContext } from 'react';

import { message } from 'antd';
export default function Header(props: HeaderProps) {
  const { word,photoUrl } = props;
  const { theme, setTheme, files } = useContext(PlaygroundContext)
  const [messageApi, contextHolder] = message.useMessage();
  return (
    <div className={`flex justify-between items-center p-4 border-b-2 w-full ${theme === 'dark' ? 'bg-gray-800 text-gray-100 border-amber-500' : 'bg-gray-100 text-gray-800 border-amber-600'} transition-colors duration-300`}>
      <div className="flex items-center space-x-2">
        <img alt='logo' src={photoUrl} className="h-10 w-10 rounded" />
        <span className="font-bold text-lg">{word}</span>
      </div>
      <div className="flex items-center ">
          <CopyOutlined
          title='复制当前代码'
          style={{ marginLeft: '20px' }}
          onClick={() => {
            copy(window.location.href);
            messageApi.success('分享链接已复制。')
          }}
        />
          <DownloadOutlined
          title='下载当前代码'
          style={{ marginLeft: '10px' }}
          onClick={async () => {
            try {
              await downloadFiles(files);
              messageApi.success('代码已下载。');
            } catch (error) {
              messageApi.error('下载失败，请稍后重试。');
            }
          }}
        />
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className={`p-2 rounded-full transition-colors duration-300 ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
          aria-label={theme === 'light' ? '切换暗色主题' : '切换亮色主题'}
        >
          {theme === 'light' ?
            <MoonOutlined className="h-8 w-8" /> :
            <SunOutlined className="h-8 w-8" />
          }
        </button>
        <img
          src='/1.png'
          alt="Avatar"
          className="h-8 w-8 rounded-full border-2 border-white"
        />
      </div>
      {contextHolder}

    </div>
  )
}