

import { Avatar } from 'antd';
const Client = ({ username }: { username: string }) => {
    return (
        <div className="flex items-center flex-col font-bold p-1">
            <Avatar style={{ backgroundColor: '#00a2ae', verticalAlign: 'middle' }} size="large">
                {username.charAt(0).toUpperCase()}
            </Avatar>
            <span className="mt-2.5 text-sm">{username}</span>
        </div>
    );
};

export default Client;