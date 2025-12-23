import { Link, useNavigate } from 'react-router-dom';
import { Plus, Crown, Users, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RoomCard } from '@/components/room/RoomCard';
import { JoinRoomDialog } from '@/components/room/JoinRoomDialog';
import { useMyRooms } from '@/modules/room/hooks';

export function RoomsPage() {
  const navigate = useNavigate();
  const { ownedRooms, joinedRooms, isLoading, error, refresh } = useMyRooms();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={refresh}>重试</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回首页
          </Button>
          <h1 className="text-2xl font-bold">我的房间</h1>
        </div>
        <div className="flex gap-3">
          <JoinRoomDialog />
          <Button asChild>
            <Link to="/rooms/create">
              <Plus className="w-4 h-4" />
              创建房间
            </Link>
          </Button>
        </div>
      </div>

      {/* 我创建的房间 */}
      <section className="mb-10">
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
          <Crown className="w-5 h-5 text-yellow-500" />
          我创建的房间 ({ownedRooms.length})
        </h2>
        {ownedRooms.length === 0 ? (
          <div className="text-center py-8 bg-muted/50 rounded-lg">
            <p className="text-muted-foreground">还没有创建任何房间</p>
            <Button variant="link" asChild className="mt-2">
              <Link to="/rooms/create">创建第一个房间</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ownedRooms.map((room) => (
              <RoomCard key={room.id} room={room} role="owner" />
            ))}
          </div>
        )}
      </section>

      {/* 我加入的房间 */}
      <section>
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
          <Users className="w-5 h-5 text-primary" />
          我加入的房间 ({joinedRooms.length})
        </h2>
        {joinedRooms.length === 0 ? (
          <div className="text-center py-8 bg-muted/50 rounded-lg">
            <p className="text-muted-foreground">还没有加入任何房间</p>
            <JoinRoomDialog
              trigger={
                <Button variant="link" className="mt-2">
                  加入一个房间
                </Button>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {joinedRooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
