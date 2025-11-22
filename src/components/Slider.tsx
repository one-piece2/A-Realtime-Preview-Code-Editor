import Client from './Client';
import { type Clienttype } from '../types/types';
import { useContext } from 'react';
import { PlaygroundContext } from '../Context/playgroundcontent';

export default function Slider({clients,copyRoomId,leaveRoom}:{clients:Clienttype[],copyRoomId:()=>void,leaveRoom:()=>void}) { 
  const { theme } = useContext(PlaygroundContext);
  
 return (
    <div className={`h-full ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'} p-4 w-[240px] flex flex-col transition-colors duration-300`}>
            <div className="flex-1">
          <div className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} pb-2 mb-3`}>
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
                   className={`border-none ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-white hover:bg-gray-200 text-black'} p-3 rounded-md text-base font-bold cursor-pointer transition-all duration-300 mb-3 focus:outline-none`}
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
 )
 }