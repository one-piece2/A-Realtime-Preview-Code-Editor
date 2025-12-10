
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
import { initSocket, } from '@/api/socket';
import type { Socket } from 'socket.io-client';
import { ACTIONS } from '@/action';
import getDogAvatarUrl from '@/utils/dogAvataUrl';

export default function EditorPage() {

  const [messageApi, contextHolder] = message.useMessage();
  const { theme} = useContext(PlaygroundContext);
  const navigate = useNavigate();
  const location = useLocation();
const { roomId } = useParams();
const [clients, setClients] = useState<Clienttype[]>([]);
const [avatarUrl, setAvatarUrl] = useState<string>('');
const awarenessUsersRef = useRef<Map<number, { name: string; avatarUrl: string; color: string }>>(new Map());
  useEffect(() => {
  
    let active = true;
    const init = async () => {
      try {
        const url = await getDogAvatarUrl();
        if (active && url) {
          setAvatarUrl(url);
        }
      } catch (error) {
        console.error('获取头像失败', error);
      }
    }
    init();
    return () => {
      active = false;
    }
  }, []);

  const socketRef = useRef<Socket | null>(null);

const codeRef = useRef<string>('');
useEffect(() => {
  
  
    if (!location.state) {
 
       // 如果 location.state 不存在，断开连接
      if (socketRef.current?.connected) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    };

    const init = async () => {
    
      // 检查是否已经连接
      if (socketRef.current?.connected) {
        socketRef.current.emit(ACTIONS.JOIN, {
          username: location.state?.username,
          roomId,
          
          initialCode: file.value,
        });
        return;
      }

    if (!socketRef.current) {
  socketRef.current = await initSocket();
}
      
      // 移除之前的监听器再添加新的，防止重复
      socketRef.current.off('connect_error');
      socketRef.current.off('connect_failed');
      socketRef.current.off('connect');
      socketRef.current.off(ACTIONS.JOINED);
      socketRef.current.off(ACTIONS.DISCONNECTED);

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
        // 首次创建房间时用于初始化 Yjs 文档的模板代码
        initialCode: file.value,
      });

      socketRef.current.on('connect', () => {
        console.log('socket connected');
      });

      socketRef.current.on(ACTIONS.JOINED, ({ clients, username, socketId }) => {
       // 只有当加入的用户不是自己时，才显示提示
       if(username !== location.state?.username){
         messageApi.open({
                type: 'success',
                content: `${username} joined the room`,
            });
       }
       // 合并 awareness 用户信息到客户端列表
       const enrichedClients = clients.map((client: Clienttype) => {
         // 从 awareness 中查找匹配的用户信息
         for (const [_, userInfo] of awarenessUsersRef.current) {
           if (userInfo.name === client.username) {
             return {
               ...client,
               avatarUrl: userInfo.avatarUrl,
               color: userInfo.color,
             };
           }
         }
         return client;
       });
       setClients(enrichedClients);
       //已迁移至yjs
      //  socketRef.current?.emit(ACTIONS.SYNC_CODE, {
      //    code: codeRef.current,
      //    socketId,
      //  });
      });

      // 监听DISCONNECTED事件
      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        console.log('DISCONNECTED', socketId, username);
        //@ts-ignore
        setClients((prev) => prev.filter((client) => client.socketId !== socketId));
        messageApi.open({
          type: 'info',
          content: `${username} left the room`,
        });
      });
    }
 init()

  return () => {

    // 组件卸载时只移除该页面的事件监听器，不断开连接
    // 这样可以在页面间切换时保持连接
    if (socketRef.current) {
      socketRef.current.off(ACTIONS.JOINED);
      socketRef.current.off(ACTIONS.DISCONNECTED);
      socketRef.current.off('connect_error');
      socketRef.current.off('connect_failed');
      socketRef.current.off('connect');
    }
  }

  }, [location.state]);
  //mock clients
  // const clients: Cl[] = [
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

    // 主动通知服务器离开房间
    if (socketRef.current?.connected) {
      socketRef.current.emit(ACTIONS.LEAVE, {
        roomId,
      });
    }
     setTimeout(() => {
      navigate('/');
    }, 100);
  };

  const file = {
    name: 'lyy.js',
    value: 'console.log("Hello World!");',
    language: 'javascript'
  }

  // const onChange = (value: string | undefined) => {
  //   setLeetCodes(value)
  //   // socket事件发送逻辑已移至Editor组件内部处理
  // }
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
                <Editor
                  options={{ theme: `vs-${theme}` }}
                  file={file}
                  socketRef={socketRef}
                  roomId={roomId}
                  username={location.state?.username}
                  avatarUrl={avatarUrl}
                  onchange={(code) => { codeRef.current = code; }}
                  onUsersChange={(usersMap) => {
                    awarenessUsersRef.current = usersMap;
                    // 更新客户端列表，合并用户信息
                    setClients((prevClients) => {
                      return prevClients.map((client) => {
                        for (const [_, userInfo] of usersMap) {
                          if (userInfo.name === client.username) {
                            return {
                              ...client,
                              avatarUrl: userInfo.avatarUrl,
                              color: userInfo.color,
                            };
                          }
                        }
                        return client;
                      });
                    });
                  }}
                />
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
