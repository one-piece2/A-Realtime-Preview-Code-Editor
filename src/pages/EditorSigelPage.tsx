
import Editor from '@/components/Editor';
import Slider from '@/components/Slider';
import { type Clienttype } from '@/types/types';
import HeaderLC from '@/components/Header';
import LeetCode from '@/components/LeetCode';
import { Allotment } from "allotment";
import 'allotment/dist/style.css';
export default function EditorPage() {

  //mock clients
  const clients: Clienttype[] = [
    { socketid: '1', username: 'user1' },
    { socketid: '2', username: 'user2' },
    { socketid: '3', username: 'user3' },
  ];
  //mock copyRoomId
  const copyRoomId = () => {
    console.log('copyRoomId');
  };
  //mock leaveRoom
  const leaveRoom = () => {
    console.log('leaveRoom');
  };
  //mock file lyy.tsx
  const file = {
    name: 'lyy.tsx',
    value: 'import lodash from "lodash";\n\nconst a = <div>lyy</div>',
    language: 'typescript'
  }
  //mock onChange
  const onChange = () => {
    console.log('hhhh');
  }
  return (
    <div className="flex h-screen w-full bg-[#f5f5f5]">
      {/* Slider组件 - 设置与主内容相同的高度和背景色 */}
      <div className="h-full">
        <Slider clients={clients} copyRoomId={copyRoomId} leaveRoom={leaveRoom} />
      </div>
      
      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col h-full min-h-0">
        {/* HeaderLC组件 - 移除固定高度，让组件自然高度，添加明显的底部边框 */}
        <div className="bg-[#f5f5f5] dark:border-gray-700 ">
          <HeaderLC word='LeetCode Together' photoUrl='/image.png' />
        </div>
        
        {/* 内容区域 - 占据剩余空间 */}
        <Allotment className="flex-1 h-full" defaultSizes={[100, 100]}>
          <Allotment.Pane minSize={0}>
            <LeetCode />
          </Allotment.Pane>
          <Allotment.Pane minSize={800}>
            <Editor file={file} onChange={onChange} />
          </Allotment.Pane>
        </Allotment>
      
      </div>

    </div>
  )
}