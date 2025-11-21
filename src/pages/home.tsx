import { useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
const Home = () => {
    const [messageApi, contextHolder] = message.useMessage();
    const [roomId, setRoomId] = useState<string>('');
    const [username, setUsername] = useState<string>('');
    const navigate = useNavigate();

    const createNewRoom = (e:React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        const id = uuidv4();
        console.log(id);
        setRoomId(id);
        messageApi.open({
            type: 'success',
            content: 'Created a new room',
        });
    }
    const joinRoom = () => {
        
        if (!roomId || !username) {
            messageApi.open({
                type: 'error',
                content: 'ROOM ID & uesrname is Required',
            });
            return;
        }
        navigate(`/editor/${roomId}`, {
            state: {
                username,
            },
        });
    }
    const handleInputEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.code === 'Enter') {
            joinRoom();
        }
    };

    return (
        <div className="flex flex-col items-center justify-center text-white h-screen bg-gray-900 p-4">
            <div className="text-4xl font-bold mb-6">Code with Friends</div>
           
            {contextHolder}
            <div className="bg-gray-800 p-5 rounded-lg w-120 max-w-[90%] shadow-lg">
                <img src="./onepiece.png" alt="one-piece-logo" className="h-40 w-40 mx-auto block" />
                <h4 className="text-xl font-bold mb-5 text-center">Paste invitation ROOM ID</h4>
                <div className="flex flex-col">
                    <input
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        type="text"
                        className="p-3 rounded-md border-none outline-none mb-4 bg-gray-200 text-gray-900 text-base font-bold placeholder-gray-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                        placeholder="ROOM ID"
                    />
                    <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        type="text"
                        className="p-3 rounded-md border-none outline-none mb-4 bg-gray-200 text-gray-900 text-base font-bold placeholder-gray-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                        placeholder="USERNAME"
                        onKeyUp={handleInputEnter}
                    />
                    <button
                        className="border-none p-2.5 rounded-md text-base font-bold cursor-pointer transition-all duration-300 bg-green-400 text-gray-900 w-[100px] ml-auto hover:bg-green-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800 focus:outline-none"
                        onClick={joinRoom}
                    >
                        Join
                    </button>
                    <span className="mt-4 text-center text-gray-300 block">
                        If you don't have an invite then create &nbsp;
                        <a
                            onClick={createNewRoom}
                            href=""
                            className="text-green-400 no-underline border-b border-green-400 transition-all duration-300 hover:text-green-600 hover:border-green-600"
                        >
                            new room
                        </a>
                    </span>
                </div>
            </div>

            <footer className="fixed bottom-0 text-center text-gray-400 p-4 w-full">
                <h4 className="text-sm">
                    Built with 💛 &nbsp; by &nbsp;
                    <a href="https://www.google.com/search?sca_esv=8994b4a378b58ce1&sxsrf=AE3TifOpUrVKyyzfATXIWXA-Pg69gXdp2g:1763540161843&udm=2&fbs=AIIjpHybaGNnaZw_4TckIDK59RtxzhN-zPLOQlOthwdFc1z8xdIAyg6_Ea865cNowKrZE6NSTLBfFrq-gxzZeTs5ToMTBmV283UPaENpTjrvARNPv_qIFy_HKftDQO2-rnZIb1uvjz_Z9RIhaM27HZ1aJ5uP1PPpyBDXTwbzjA7cqwe9SdD9AfKnweFdvW7s0EY4wdiSDRZSRUNgnXr3tAIcpgBJmbExeA&q=%E6%B5%B7%E8%B4%BC%E7%8E%8B%E5%90%A7&sa=X&ved=2ahUKEwj1_JKH4_2QAxWLs1YBHer2HYoQtKgLegQIFRAB&biw=1707&bih=825&dpr=2.25#vhid=8G4C5ZT15-KAnM&vssid=mosaic" className="text-green-400 hover:text-green-600">lyy</a>
                </h4>
            </footer>
        </div>
        
    );
};

export default Home;