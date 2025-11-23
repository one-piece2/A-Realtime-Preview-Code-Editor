
//切换主题按钮
import {type HeaderProps} from '../types/types'
import { MoonOutlined, SunOutlined, CopyOutlined, DownloadOutlined, SettingOutlined, HomeOutlined, LogoutOutlined, CloseOutlined } from '@ant-design/icons'

//复制按钮
import copy from 'copy-to-clipboard'
// 引入下载文件函数
import { downloadFiles } from '../utils/loadandcompress';

import { PlaygroundContext } from '../Context/playgroundcontent';
import { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
export default function Header(props: HeaderProps) {
  const { word,photoUrl } = props;
  const { theme, setTheme, files } = useContext(PlaygroundContext)
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLImageElement>(null);
  
  // 处理点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && 
          avatarRef.current && !avatarRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // 处理头像点击
  const handleAvatarClick = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  // 处理回到首页
  const handleGoHome = () => {
    navigate('/');
    setIsMenuOpen(false);
    messageApi.success('已回到首页');
  };
  
  // 处理设置
  const handleSettings = () => {
    // 这里可以实现设置页面的导航或打开设置对话框
    messageApi.info('设置功能即将上线');
    setIsMenuOpen(false);
  };
  
  // 处理退出登录
  const handleLogout = () => {
    // 这里可以实现退出登录的逻辑
    messageApi.success('已退出登录');
    setIsMenuOpen(false);
    // 可以添加重定向到登录页的逻辑
  };
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
        <div className="relative">
          <img
            src='/1.png'
            alt="Avatar"
            className="h-8 w-8 rounded-full border-2 border-white cursor-pointer hover:opacity-90 transition-opacity"
            onClick={handleAvatarClick}
            ref={avatarRef}
          />
          {isMenuOpen && (
            <div 
              ref={menuRef}
              className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border z-50`}
            >
              <button
                className="flex items-center px-4 py-2 text-sm w-full text-left hover:bg-opacity-10 hover:bg-white transition-colors"
                onClick={handleGoHome}
              >
                <HomeOutlined className="mr-2" />
                回到首页
              </button>
              <button
                className="flex items-center px-4 py-2 text-sm w-full text-left hover:bg-opacity-10 hover:bg-white transition-colors"
                onClick={handleSettings}
              >
                <SettingOutlined className="mr-2" />
                设置
              </button>
              <div className={`${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} border-t my-1`}></div>
                <button
                className="flex items-center px-4 py-2 text-sm w-full text-left hover:bg-opacity-10 hover:bg-white transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                <CloseOutlined className="mr-2" />
               关闭
              </button>
              <button
                className="flex items-center px-4 py-2 text-sm w-full text-left hover:bg-opacity-10 hover:bg-white transition-colors text-red-500"
                onClick={handleLogout}
              >
                <LogoutOutlined className="mr-2" />
                退出登录
              </button>
             
            </div>
          )}
        </div>
      </div>
      {contextHolder}

    </div>
  )
}