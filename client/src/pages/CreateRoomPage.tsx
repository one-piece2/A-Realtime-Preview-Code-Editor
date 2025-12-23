import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateRoomForm } from '@/components/room/CreateRoomForm';

export function CreateRoomPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* 头部 */}
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/rooms">
            <ArrowLeft className="w-4 h-4" />
            返回房间列表
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">创建新房间</h1>
        <p className="text-muted-foreground mt-1">
          创建一个协作房间，邀请他人一起编辑代码
        </p>
      </div>

      {/* 表单 */}
      <CreateRoomForm />
    </div>
  );
}
