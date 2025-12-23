import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useRoomActions } from '@/modules/room/hooks';

interface JoinRoomDialogProps {
  trigger?: React.ReactNode;
}

export function JoinRoomDialog({ trigger }: JoinRoomDialogProps) {
  const navigate = useNavigate();
  const { joinRoom, isLoading, error, clearError } = useRoomActions();

  const [open, setOpen] = useState(false);
  const [roomId, setRoomId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim()) return;

    try {
      await joinRoom(roomId.trim());
      setOpen(false);
      setRoomId('');
      navigate(`/room/${roomId.trim()}`);
    } catch {
      // 错误已在 store 中处理
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setRoomId('');
      clearError();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {/* trigger 为自定义触发按钮 用户传进来 如果没传就默认为按钮 */}
        {trigger || (
          <Button variant="outline">
            <Users className="w-4 h-4" />
            加入房间
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>加入房间</DialogTitle>
            <DialogDescription>
              输入房间 ID 加入已有的协作房间
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roomId">房间 ID</Label>
              <Input
                id="roomId"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="例如: abc-123-xyz"
                autoFocus
              />
            </div>
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={isLoading || !roomId.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  加入中...
                </>
              ) : (
                '加入房间'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
