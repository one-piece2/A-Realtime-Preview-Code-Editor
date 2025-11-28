
import Editor from '@/components/Editor';
import Slider from '@/components/Slider';
import { type Clienttype } from '@/types/types';
import HeaderLC from '@/components/Header';
import LeetCode from '@/components/LeetCode';
import OutputBox from '@/components/OutputBox';
import { Allotment } from "allotment";
import 'allotment/dist/style.css';
import { PlaygroundContext } from '@/Context/playgroundcontent';
import { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate ,useLocation,useParams, Navigate } from 'react-router-dom';
import copy from 'copy-to-clipboard'
import { message } from 'antd'
import { initSocket } from '@/socket';
import type { Socket } from 'socket.io-client';
import { ACTIONS } from '@/action';

export default function EditorPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const { theme, setLeetCodes } = useContext(PlaygroundContext);
  const navigate = useNavigate();
  const location = useLocation();
const { roomId } = useParams();
const [clients, setClients] = useState<Clienttype[]>([]);
  const socketRef = useRef<Socket | null>(null);
useEffect(() => {
    if (!location.state) return;
    const init = async () => {
      socketRef.current = await initSocket();
      // 连接错误处理
      socketRef.current.on('connect_error', (err) => {
        handleErrors(err);
      });
      socketRef.current.on('connect_failed', (err) => {
        handleErrors(err);
      });
       // emit是发送事件:JOIN
      socketRef.current.emit(ACTIONS.JOIN, {
        username: location.state?.username,
        roomId,
      });

      socketRef.current.on('connect', () => {
        console.log('socket connected');
      });


      
      socketRef.current.on(ACTIONS.JOINED, ({ clients, username, socketId }) => {
       if(username!==location.state?.username){
         messageApi.open({
                type: 'success',
                content: `${username} joined the room`,
            });
       }
         setClients(clients);
      });

      // 监听DISCONNECTED事件
      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketid, username }) => {
        setClients((prev) => prev.filter((client) => client.socketid !== socketid));
        messageApi.open({
          type: 'info',
          content: `${username} left the room`,
        });
      });
    }
 init()


  }, []);
  //mock clients
  // const clients: Clienttype[] = [
  //   { socketid: '1', username: 'user1' },
  //   { socketid: '2', username: 'user2' },
  //   { socketid: '3', username: 'user3' },
  // ];
  const handleErrors = (err: any) => {
    console.log('socket error', err);
    messageApi.error(err.message);
    navigate('/');
  }
  const copyRoomId = () => {
    copy(window.location.href.split('/').pop() || '');
    messageApi.success('房间id复制成功');
  };

  const leaveRoom = () => {
    navigate('/');
  };

  const file = {
    name: 'lyy.js',
    value: 'console.log("Hello World!");',
    language: 'javascript'
  }

  const onChange = (value: string | undefined) => {
    setLeetCodes(value)
  }
  //路由守卫 如果没有username 则跳转到首页
  if (!location.state) {
    return <Navigate to="/" />;
  }

  return (
    <div className="flex h-screen w-full bg-[#f5f5f5]">
      {/* Slider组件 - 设置与主内容相同的高度和背景色 */}
      <div className="h-full">

        <Slider clients={clients} copyRoomId={copyRoomId} leaveRoom={leaveRoom} />
      </div>
      {contextHolder}
      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col h-full min-h-0">
        {/* HeaderLC组件 - 移除固定高度，让组件自然高度，添加明显的底部边框 */}
        <div className="bg-[#f5f5f5] dark:border-gray-700 z-9999">
          <HeaderLC word='LeetCode Together' photoUrl='/image.png' />
        </div>

        {/* 内容区域 - 占据剩余空间 */}
        <Allotment className="flex-1 h-full" vertical defaultSizes={[1, 1]}>
          <Allotment.Pane minSize={100}>
            <Allotment className="h-full" defaultSizes={[100, 100]}>
              <Allotment.Pane minSize={0}>
                <LeetCode />
              </Allotment.Pane>
              <Allotment.Pane minSize={800}>
                <Editor options={{ theme: `vs-${theme}` }} file={file} onChange={onChange} />
              </Allotment.Pane>
            </Allotment>
          </Allotment.Pane>
          <Allotment.Pane minSize={100} maxSize={400} >
            <OutputBox
              // 模拟输出内容


              onRefresh={() => console.log('刷新输出')}
              onClear={() => console.log('清除输出')}
            />
          </Allotment.Pane>
        </Allotment>

      </div>

    </div>
  )
}
