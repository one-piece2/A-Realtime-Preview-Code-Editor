import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Button, Typography } from 'antd';
import { HomeOutlined } from '@ant-design/icons';

const { Header, Content } = Layout;
const { Title, Paragraph } = Typography;

export default function Dashboard() {
    const navigate = useNavigate();
    const [activeButton, setActiveButton] = useState<string>('');

    const handleCodeEditorClick = () => {
        setActiveButton('codeEditor');
        // 导航到适当的页面，这里使用 home 作为示例
   
    };

    const handleEditorWithFriendsClick = () => {
        setActiveButton('editorWithFriends');
        // 导航到编辑器页面，这里使用 home 作为示例
        navigate('/home');
    };

    const handleHomeClick = () => {
        navigate('/');
    };

    return (
        <Layout className="h-screen bg-gray-100 text-white">
            {/* 顶部导航 */}
            <Header className="bg-gray-700 border-b border-gray-700 flex items-center justify-between p-4 h-auto py-3" style={{ height: '64px' ,background:'#1c1e29'}}>
                <div className="flex items-center gap-3">
                    <img
                        src="/onepiece.png"
                        alt="One Piece Logo"
                        className="h-15 w-15 rounded-md object-contain"
                    />
                    <h1 className="text-white m-0 font-bold text-lg !important">Code Editor Dashboard</h1>
                </div>
                <div className="flex items-center gap-4">
                     {/* GitHub Logo with customizable link */}
                     <a
                        href="https://github.com" // 这里可以修改为任何GitHub地址
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-10 w-10 flex items-center justify-center bg-white rounded-md hover:bg-gray-200 transition-colors"
                        
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-6 w-6" style={{ fill: 'white' }}> // 明确设置白色图标
                            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                        </svg>
                    </a>
                    {/* 随机头像 */}
                    <img
                        src={`https://picsum.photos/id/${Math.floor(Math.random() * 100)}/200/200`}
                        alt="Random Avatar"
                        className="h-7 w-7 rounded-full border-2 border-white"
                    />
                   
                </div>
                
              
            </Header>

            {/* 主要内容区域 */}
            <Content className="p-0 flex flex-1">
                <div className="flex h-full w-full">
                    {/* 左侧按钮区域 */}
                    <div className="bg-gray-700 p-6 rounded-r-none shadow-lg w-64 flex flex-col gap-4 border-r border-gray-700">
                        <h1 className="text-white mb-4 mx-auto text-2xl font-bold">Editor Options</h1>
                        <button
                            onClick={handleCodeEditorClick}
                            className={`h-16 text-base font-bold bg-blue-600 rounded-md transition-all duration-300 flex items-center justify-center cursor-pointer  text-gray-200 ${activeButton === 'codeEditor' ? 'bg-green-600 border border-green-600 text-white' : 'hover:bg-gray-600'}`}
                            style={{ border: 'none' }}
                        >
                            Code Editor
                        </button>
                        <button
                            onClick={handleEditorWithFriendsClick}
                            className={`h-16 text-base font-bold rounded-md transition-all duration-300 flex items-center justify-center cursor-pointer bg-blue-600 text-gray-200 ${activeButton === 'editorWithFriends' ? 'bg-green-600 border border-green-600 text-white' : 'hover:bg-blue-900'}`}
                            style={{ border: 'none' }}
                        >
                            Editor with Friends
                        </button>
                    </div>

                    {/* 右侧欢迎页面 */}
                    <div className="bg-gray-800 p-8 rounded-l-none flex-1 flex flex-col items-center justify-center">
                        <img
                            src="/logo.jpg"
                            alt="One Piece Logo"
                            className="h-80 w-200 rounded-lg object-contain mb-6"
                        />
                        <Title level={2} className="text-white mb-4 text-center">Welcome to Code Editor Dashboard</Title>
                        <Paragraph className="text-white text-center max-w-2xl font-bold" style={{ fontSize: '18px' }}>
                            Choose an editor option from the left panel to get started.
                            Create amazing code with our powerful editors or collaborate with friends in real-time.
                        </Paragraph>
                        <div className="mt-8 bg-gray-700 p-6 rounded-lg w-full max-w-2xl">
                            <Title level={2} className="text-white mb-2 text-2xl">Features</Title>
                            <ul className="list-disc pl-5 text-gray-300 space-y-2 text-lg">
                                <li>Real-time code editing</li>
                                <li>Collaborative editing with friends</li>
                                <li>Syntax highlighting for multiple languages</li>
                                <li>Auto-completion and suggestions</li>
                                <li>Instant preview of your code</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </Content>
        </Layout>
    );
}