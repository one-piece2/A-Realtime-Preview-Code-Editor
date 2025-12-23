import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Lock, Edit, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRoomActions } from '@/modules/room/hooks';
import type { CreateRoomParams } from '@/modules/room/types';

export function CreateRoomForm() {
  const navigate = useNavigate();
  const { createRoom, isLoading, error } = useRoomActions();

  const [formData, setFormData] = useState<CreateRoomParams>({
    name: '',
    description: '',
    isPublic: false,
    defaultRole: 'viewer',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const room = await createRoom(formData);
      navigate(`/room/${room.roomId}`);
    } catch {
      // 错误已在 store 中处理
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto">
      {/* 房间名称 */}
      <div className="space-y-2">
        <Label htmlFor="name">
          房间名称 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="输入房间名称"
          required
          maxLength={255}
        />
      </div>

      {/* 房间描述 */}
      <div className="space-y-2">
        <Label htmlFor="description">描述</Label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="可选: 描述这个房间的用途"
          rows={3}
          maxLength={1000}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* 公开性 */}
      <div className="space-y-2">
        <Label>房间类型</Label>
        <div className="grid grid-cols-2 gap-4">
          <Card
            className={`cursor-pointer transition-colors ${
              !formData.isPublic ? 'border-primary bg-primary/5' : ''
            }`}
            onClick={() => setFormData({ ...formData, isPublic: false })}
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <CardTitle className="text-sm">私有房间</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <CardDescription className="text-xs">
                只有被邀请的人才能加入
              </CardDescription>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-colors ${
              formData.isPublic ? 'border-primary bg-primary/5' : ''
            }`}
            onClick={() => setFormData({ ...formData, isPublic: true })}
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <CardTitle className="text-sm">公开房间</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <CardDescription className="text-xs">
                任何人都可以加入
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 默认角色 */}
      <div className="space-y-2">
        <Label>新成员默认角色</Label>
        <div className="grid grid-cols-2 gap-4">
          <Card
            className={`cursor-pointer transition-colors ${
              formData.defaultRole === 'editor' ? 'border-primary bg-primary/5' : ''
            }`}
            onClick={() => setFormData({ ...formData, defaultRole: 'editor' })}
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-green-500" />
                <CardTitle className="text-sm">编辑者</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <CardDescription className="text-xs">
                可以编辑文档内容
              </CardDescription>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-colors ${
              formData.defaultRole === 'viewer' ? 'border-primary bg-primary/5' : ''
            }`}
            onClick={() => setFormData({ ...formData, defaultRole: 'viewer' })}
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-sm">观看者</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <CardDescription className="text-xs">
                只能查看，不能编辑
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-md">
          {error}
        </div>
      )}

      {/* 提交按钮 */}
      <Button
        type="submit"
        disabled={isLoading || !formData.name.trim()}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            创建中...
          </>
        ) : (
          '创建房间'
        )}
      </Button>
    </form>
  );
}
