import Client from '@/components/Client';
import Editor from '@/components/Editor';
export interface Client {
    socketid: string;
    username: string;
  }
export default function EditorPage() {
  
  //mock clients
  const clients: Client[] = [
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
  return (
    <div className="flex h-screen">
      <div className="bg-[#1c1e29] p-4 text-white w-[240px] flex flex-col">
        <div className="flex-1">
          <div className="border-b border-[#424242] pb-2 mb-3">
            <img src="/onepiece.png" alt="one-piece-logo" className="h-[100px] ml-6" width={120} ></img>
          </div>
          <h3 className="mb-4  font-bold text-center  text-xl"> Connected Users</h3>
          <div className="flex items-center flex-wrap gap-5">
            {clients.map((client) => (
              <Client key={client.socketid + client.username} username={client.username} />
            ))}
          </div>
        </div>
        <button 
          className="border-none bg-white p-3 rounded-md text-base font-bold cursor-pointer transition-all duration-300  text-black mb-3 hover:bg-[#2b824c] focus:outline-none"
          onClick={copyRoomId} 
        >
          Copy ROOM ID
        </button>
        <button 
          className="border-none p-3 rounded-md text-base font-bold cursor-pointer transition-all duration-300 bg-[#4aed88] text-black w-full hover:bg-[#2b824c] focus:outline-none"
          onClick={leaveRoom} 
        >
          Leave
        </button>
      </div>
      <div className="flex-1 bg-[#f5f5f5]">
        <Editor />
      </div>
    </div>
  )
}