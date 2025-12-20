# 协同编辑权限体系技术方案 - Part 5: 前端 UI 与权限控制

## 目录
- [1. 组件结构](#1-组件结构)
- [2. Editor 组件改造](#2-editor-组件改造)
- [3. 房间管理页面](#3-房间管理页面)
- [4. 成员管理组件](#4-成员管理组件)
- [5. 权限提示组件](#5-权限提示组件)
- [6. 路由与权限守卫](#6-路由与权限守卫)

---

## 1. 组件结构

```
client/src/
├── pages/
│   ├── RoomsPage.tsx           # 房间列表页
│   ├── RoomDetailPage.tsx      # 房间详情/编辑页
│   └── CreateRoomPage.tsx      # 创建房间页
├── components/
│   ├── room/
│   │   ├── RoomCard.tsx        # 房间卡片
│   │   ├── RoomList.tsx        # 房间列表
│   │   ├── CreateRoomForm.tsx  # 创建房间表单
│   │   └── JoinRoomDialog.tsx  # 加入房间对话框
│   ├── member/
│   │   ├── MemberList.tsx      # 成员列表
│   │   ├── MemberItem.tsx      # 成员项
│   │   └── RoleSelector.tsx    # 角色选择器
│   ├── permission/
│   │   ├── ReadOnlyBanner.tsx  # 只读提示横幅
│   │   └── PermissionGuard.tsx # 权限守卫组件
│   └── Editor.tsx              # 改造: 添加只读支持
└── guards/
    └── AuthGuard.tsx           # 认证守卫
```

---

## 2. Editor 组件改造

### 2.1 核心改造点

**关键原则**: 在编辑器输入层拦截，而非 Yjs 层

```typescript
// client/src/components/Editor.tsx
import React, { useEffect, useRef, useMemo } from 'react';
import * as monaco from 'monaco-editor';
import { MonacoBinding } from 'y-monaco';
import { useCollaborationStore, collaborationSelectors } from '@/modules/collaboration/store';
import { useRoomStore, roomSelectors } from '@/modules/room/store';
import { ReadOnlyBanner } from './permission/ReadOnlyBanner';

interface EditorProps {
  language?: string;
  theme?: string;
  className?: string;
}

export const Editor: React.FC<EditorProps> = ({
  language = 'javascript',
  theme = 'vs-dark',
  className = '',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);

  // 从 Store 获取状态
  const provider = useCollaborationStore(collaborationSelectors.provider);
  const ydoc = useCollaborationStore(collaborationSelectors.ydoc);
  const role = useCollaborationStore(collaborationSelectors.role);
  const canEdit = useCollaborationStore(collaborationSelectors.canEdit);

  // 计算编辑器选项
  const editorOptions = useMemo<monaco.editor.IStandaloneEditorConstructionOptions>(() => ({
    language,
    theme,
    automaticLayout: true,
    minimap: { enabled: true },
    fontSize: 14,
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    // 核心: 根据角色设置只读
    readOnly: !canEdit,
    // 只读时的额外样式
    ...(canEdit ? {} : {
      cursorStyle: 'line',
      cursorBlinking: 'solid',
    }),
  }), [language, theme, canEdit]);

  // 初始化编辑器
  useEffect(() => {
    if (!editorRef.current) return;

    const editor = monaco.editor.create(editorRef.current, editorOptions);
    monacoEditorRef.current = editor;

    return () => {
      editor.dispose();
      monacoEditorRef.current = null;
    };
  }, []);

  // 更新编辑器只读状态 (当角色变化时)
  useEffect(() => {
    const editor = monacoEditorRef.current;
    if (!editor) return;

    editor.updateOptions({ readOnly: !canEdit });
  }, [canEdit]);

  // 绑定 Yjs
  useEffect(() => {
    const editor = monacoEditorRef.current;
    if (!editor || !ydoc || !provider) return;

    const yText = ydoc.getText('monaco');
    const awareness = provider.awareness;

    // 创建 MonacoBinding
    const binding = new MonacoBinding(
      yText,
      editor.getModel()!,
      new Set([editor]),
      awareness
    );
    bindingRef.current = binding;

    return () => {
      binding.destroy();
      bindingRef.current = null;
    };
  }, [ydoc, provider]);

  return (
    <div className={`relative h-full ${className}`}>
      {/* 只读提示横幅 */}
      {!canEdit && <ReadOnlyBanner role={role} />}
      
      {/* 编辑器容器 */}
      <div 
        ref={editorRef} 
        className={`h-full w-full ${!canEdit ? 'opacity-95' : ''}`}
      />
    </div>
  );
};
```

### 2.2 只读提示横幅

**文件路径**: `client/src/components/permission/ReadOnlyBanner.tsx`

```typescript
import React from 'react';
import { Eye, Lock } from 'lucide-react';
import type { RoomRole } from '@/modules/room/types';

interface ReadOnlyBannerProps {
  role: RoomRole | null;
}

export const ReadOnlyBanner: React.FC<ReadOnlyBannerProps> = ({ role }) => {
  if (role !== 'viewer') return null;

  return (
    <div className="absolute top-0 left-0 right-0 z-10 bg-yellow-500/90 text-yellow-900 px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium">
      <Eye className="w-4 h-4" />
      <span>只读模式 - 您没有编辑权限</span>
      <Lock className="w-4 h-4" />
    </div>
  );
};
```

---

## 3. 房间管理页面

### 3.1 房间列表页

**文件路径**: `client/src/pages/RoomsPage.tsx`

```typescript
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Users, Clock, Crown } from 'lucide-react';
import { useMyRooms } from '@/modules/room/hooks';
import { RoomCard } from '@/components/room/RoomCard';

export const RoomsPage: React.FC = () => {
  const { ownedRooms, joinedRooms, isLoading, error, refresh } = useMyRooms();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          onClick={refresh}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          我的房间
        </h1>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/rooms/join')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            <Users className="w-4 h-4" />
            加入房间
          </button>
          <Link
            to="/rooms/create"
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Plus className="w-4 h-4" />
            创建房间
          </Link>
        </div>
      </div>

      {/* 我创建的房间 */}
      <section className="mb-10">
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
          <Crown className="w-5 h-5 text-yellow-500" />
          我创建的房间 ({ownedRooms.length})
        </h2>
        {ownedRooms.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-gray-500">还没有创建任何房间</p>
            <Link 
              to="/rooms/create"
              className="text-blue-500 hover:underline mt-2 inline-block"
            >
              创建第一个房间
            </Link>
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
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
          <Users className="w-5 h-5 text-blue-500" />
          我加入的房间 ({joinedRooms.length})
        </h2>
        {joinedRooms.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-gray-500">还没有加入任何房间</p>
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
};
```

### 3.2 房间卡片组件

**文件路径**: `client/src/components/room/RoomCard.tsx`

```typescript
import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Lock, Globe, Crown, Edit, Eye } from 'lucide-react';
import type { Room, RoomRole } from '@/modules/room/types';

interface RoomCardProps {
  room: Room;
  role?: RoomRole;
}

const roleIcons = {
  owner: <Crown className="w-4 h-4 text-yellow-500" />,
  editor: <Edit className="w-4 h-4 text-green-500" />,
  viewer: <Eye className="w-4 h-4 text-gray-500" />,
};

const roleLabels = {
  owner: '房主',
  editor: '编辑者',
  viewer: '观看者',
};

export const RoomCard: React.FC<RoomCardProps> = ({ room, role }) => {
  return (
    <Link
      to={`/editor/${room.roomId}`}
      className="block p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
    >
      {/* 头部 */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900 dark:text-white truncate flex-1">
          {room.name}
        </h3>
        {room.isPublic ? (
          <Globe className="w-4 h-4 text-green-500 flex-shrink-0" />
        ) : (
          <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </div>

      {/* 描述 */}
      {room.description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
          {room.description}
        </p>
      )}

      {/* 底部信息 */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span className="font-mono">{room.roomId}</span>
        {role && (
          <div className="flex items-center gap-1">
            {roleIcons[role]}
            <span>{roleLabels[role]}</span>
          </div>
        )}
      </div>
    </Link>
  );
};
```

### 3.3 创建房间表单

**文件路径**: `client/src/components/room/CreateRoomForm.tsx`

```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoomStore } from '@/modules/room/store';
import { Globe, Lock, Edit, Eye } from 'lucide-react';

export const CreateRoomForm: React.FC = () => {
  const navigate = useNavigate();
  const createRoom = useRoomStore((s) => s.createRoom);
  const isLoading = useRoomStore((s) => s.isLoading);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: false,
    defaultRole: 'viewer' as 'editor' | 'viewer',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const room = await createRoom(formData);
      navigate(`/editor/${room.roomId}`);
    } catch (error) {
      // 错误已在 store 中处理
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto">
      {/* 房间名称 */}
      <div>
        <label className="block text-sm font-medium mb-2">
          房间名称 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="输入房间名称"
          required
          maxLength={255}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
        />
      </div>

      {/* 房间描述 */}
      <div>
        <label className="block text-sm font-medium mb-2">描述</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="可选: 描述这个房间的用途"
          rows={3}
          maxLength={1000}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
        />
      </div>

      {/* 公开性 */}
      <div>
        <label className="block text-sm font-medium mb-2">房间类型</label>
        <div className="flex gap-4">
          <label className={`flex-1 p-4 border rounded-lg cursor-pointer transition-colors ${
            !formData.isPublic ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'
          }`}>
            <input
              type="radio"
              name="isPublic"
              checked={!formData.isPublic}
              onChange={() => setFormData({ ...formData, isPublic: false })}
              className="sr-only"
            />
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4" />
              <span className="font-medium">私有房间</span>
            </div>
            <p className="text-xs text-gray-500">只有被邀请的人才能加入</p>
          </label>

          <label className={`flex-1 p-4 border rounded-lg cursor-pointer transition-colors ${
            formData.isPublic ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'
          }`}>
            <input
              type="radio"
              name="isPublic"
              checked={formData.isPublic}
              onChange={() => setFormData({ ...formData, isPublic: true })}
              className="sr-only"
            />
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-4 h-4" />
              <span className="font-medium">公开房间</span>
            </div>
            <p className="text-xs text-gray-500">任何人都可以加入</p>
          </label>
        </div>
      </div>

      {/* 默认角色 */}
      <div>
        <label className="block text-sm font-medium mb-2">新成员默认角色</label>
        <div className="flex gap-4">
          <label className={`flex-1 p-4 border rounded-lg cursor-pointer transition-colors ${
            formData.defaultRole === 'editor' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'
          }`}>
            <input
              type="radio"
              name="defaultRole"
              checked={formData.defaultRole === 'editor'}
              onChange={() => setFormData({ ...formData, defaultRole: 'editor' })}
              className="sr-only"
            />
            <div className="flex items-center gap-2 mb-1">
              <Edit className="w-4 h-4 text-green-500" />
              <span className="font-medium">编辑者</span>
            </div>
            <p className="text-xs text-gray-500">可以编辑文档内容</p>
          </label>

          <label className={`flex-1 p-4 border rounded-lg cursor-pointer transition-colors ${
            formData.defaultRole === 'viewer' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'
          }`}>
            <input
              type="radio"
              name="defaultRole"
              checked={formData.defaultRole === 'viewer'}
              onChange={() => setFormData({ ...formData, defaultRole: 'viewer' })}
              className="sr-only"
            />
            <div className="flex items-center gap-2 mb-1">
              <Eye className="w-4 h-4 text-gray-500" />
              <span className="font-medium">观看者</span>
            </div>
            <p className="text-xs text-gray-500">只能查看，不能编辑</p>
          </label>
        </div>
      </div>

      {/* 提交按钮 */}
      <button
        type="submit"
        disabled={isLoading || !formData.name.trim()}
        className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '创建中...' : '创建房间'}
      </button>
    </form>
  );
};
```

---

## 4. 成员管理组件

### 4.1 成员列表

**文件路径**: `client/src/components/member/MemberList.tsx`

```typescript
import React from 'react';
import { useCurrentRoom, useMemberActions } from '@/modules/room/hooks';
import { MemberItem } from './MemberItem';

export const MemberList: React.FC = () => {
  const { members, myRole, currentRoom } = useCurrentRoom();
  const { updateMemberRole, removeMember, canManageMembers } = useMemberActions();

  if (!currentRoom) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold">成员 ({members.length})</h3>
      </div>
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {members.map((member) => (
          <MemberItem
            key={member.id}
            member={member}
            canManage={canManageMembers && member.role !== 'owner'}
            onRoleChange={(role) => updateMemberRole(currentRoom.roomId, member.userId, role)}
            onRemove={() => removeMember(currentRoom.roomId, member.userId)}
          />
        ))}
      </ul>
    </div>
  );
};
```

### 4.2 成员项

**文件路径**: `client/src/components/member/MemberItem.tsx`

```typescript
import React, { useState } from 'react';
import { Crown, Edit, Eye, MoreVertical, UserMinus } from 'lucide-react';
import type { RoomMember, RoomRole } from '@/modules/room/types';

interface MemberItemProps {
  member: RoomMember;
  canManage: boolean;
  onRoleChange: (role: 'editor' | 'viewer') => void;
  onRemove: () => void;
}

const roleConfig = {
  owner: { icon: Crown, color: 'text-yellow-500', label: '房主' },
  editor: { icon: Edit, color: 'text-green-500', label: '编辑者' },
  viewer: { icon: Eye, color: 'text-gray-500', label: '观看者' },
};

export const MemberItem: React.FC<MemberItemProps> = ({
  member,
  canManage,
  onRoleChange,
  onRemove,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const config = roleConfig[member.role];
  const RoleIcon = config.icon;

  return (
    <li className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
      <div className="flex items-center gap-3">
        {/* 头像 */}
        <img
          src={member.user.githubAvatar || '/default-avatar.png'}
          alt={member.user.username}
          className="w-8 h-8 rounded-full"
        />
        
        {/* 用户信息 */}
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {member.user.username}
          </div>
          <div className="text-xs text-gray-500">{member.user.email}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* 角色标签 */}
        <span className={`flex items-center gap-1 text-sm ${config.color}`}>
          <RoleIcon className="w-4 h-4" />
          {config.label}
        </span>

        {/* 管理菜单 */}
        {canManage && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowMenu(false)} 
                />
                <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                  {member.role !== 'editor' && (
                    <button
                      onClick={() => { onRoleChange('editor'); setShowMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4 text-green-500" />
                      设为编辑者
                    </button>
                  )}
                  {member.role !== 'viewer' && (
                    <button
                      onClick={() => { onRoleChange('viewer'); setShowMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4 text-gray-500" />
                      设为观看者
                    </button>
                  )}
                  <hr className="my-1 border-gray-200 dark:border-gray-700" />
                  <button
                    onClick={() => { onRemove(); setShowMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <UserMinus className="w-4 h-4" />
                    移出房间
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </li>
  );
};
```

---

## 5. 权限提示组件

### 5.1 权限守卫组件

**文件路径**: `client/src/components/permission/PermissionGuard.tsx`

```typescript
import React from 'react';
import { useCurrentRoom } from '@/modules/room/hooks';
import type { RoomRole } from '@/modules/room/types';

interface PermissionGuardProps {
  requiredRoles: RoomRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  requiredRoles,
  children,
  fallback = null,
}) => {
  const { myRole } = useCurrentRoom();

  if (!myRole || !requiredRoles.includes(myRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// 便捷组件
export const OwnerOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback,
}) => (
  <PermissionGuard requiredRoles={['owner']} fallback={fallback}>
    {children}
  </PermissionGuard>
);

export const EditorOrOwner: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback,
}) => (
  <PermissionGuard requiredRoles={['owner', 'editor']} fallback={fallback}>
    {children}
  </PermissionGuard>
);
```

### 5.2 角色变更通知

**文件路径**: `client/src/components/permission/RoleChangeNotification.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { useCollaborationStore } from '@/modules/collaboration/store';
import { Crown, Edit, Eye, X } from 'lucide-react';
import type { RoomRole } from '@/modules/room/types';

const roleConfig = {
  owner: { icon: Crown, color: 'bg-yellow-500', label: '房主' },
  editor: { icon: Edit, color: 'bg-green-500', label: '编辑者' },
  viewer: { icon: Eye, color: 'bg-gray-500', label: '观看者' },
};

export const RoleChangeNotification: React.FC = () => {
  const [notification, setNotification] = useState<{
    show: boolean;
    role: RoomRole;
    prevRole: RoomRole;
  } | null>(null);

  const role = useCollaborationStore((s) => s.role);
  const [prevRole, setPrevRole] = useState<RoomRole | null>(role);

  useEffect(() => {
    if (role && prevRole && role !== prevRole) {
      setNotification({ show: true, role, prevRole });
      
      // 5秒后自动隐藏
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
    setPrevRole(role);
  }, [role, prevRole]);

  if (!notification?.show) return null;

  const config = roleConfig[notification.role];
  const Icon = config.icon;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className={`${config.color} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3`}>
        <Icon className="w-5 h-5" />
        <div>
          <div className="font-medium">角色已变更</div>
          <div className="text-sm opacity-90">
            您现在是 {config.label}
            {notification.role === 'viewer' && ' (只读)'}
          </div>
        </div>
        <button
          onClick={() => setNotification(null)}
          className="p-1 hover:bg-white/20 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
```

---

## 6. 路由与权限守卫

### 6.1 认证守卫

**文件路径**: `client/src/guards/AuthGuard.tsx`

```typescript
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const location = useLocation();
  const token = localStorage.getItem('accessToken');

  if (!token) {
    // 保存当前路径，登录后跳转回来
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
```

### 6.2 路由配置示例

**文件路径**: `client/src/router/index.tsx`

```typescript
import { createBrowserRouter } from 'react-router-dom';
import { AuthGuard } from '@/guards/AuthGuard';
import { RoomsPage } from '@/pages/RoomsPage';
import { CreateRoomPage } from '@/pages/CreateRoomPage';
import { EditorPage } from '@/pages/EditorPage';
import { LoginPage } from '@/pages/LoginPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/rooms',
    element: (
      <AuthGuard>
        <RoomsPage />
      </AuthGuard>
    ),
  },
  {
    path: '/rooms/create',
    element: (
      <AuthGuard>
        <CreateRoomPage />
      </AuthGuard>
    ),
  },
  {
    path: '/editor/:roomId',
    element: (
      <AuthGuard>
        <EditorPage />
      </AuthGuard>
    ),
  },
  {
    path: '/',
    element: <Navigate to="/rooms" replace />,
  },
]);
```

### 6.3 编辑器页面

**文件路径**: `client/src/pages/EditorPage.tsx`

```typescript
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEnterRoom, useCurrentRoom } from '@/modules/room/hooks';
import { useInitCollaboration, useCollaboration } from '@/modules/collaboration/hooks';
import { Editor } from '@/components/Editor';
import { MemberList } from '@/components/member/MemberList';
import { RoleChangeNotification } from '@/components/permission/RoleChangeNotification';
import { Loader2 } from 'lucide-react';

export const EditorPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  
  // 获取房间信息
  const { isLoading: roomLoading, error: roomError } = useEnterRoom(roomId || null);
  const { currentRoom, myRole } = useCurrentRoom();
  
  // 初始化协作 (需要从用户 store 获取用户信息)
  const user = { username: 'User', avatarUrl: '/default.png' }; // 从 auth store 获取
  useInitCollaboration(roomId || null, user);
  
  const { connectionStatus } = useCollaboration();

  // 错误处理
  useEffect(() => {
    if (roomError) {
      // 可以显示 toast 或跳转
      console.error(roomError);
    }
  }, [roomError]);

  if (roomLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2">加载房间信息...</span>
      </div>
    );
  }

  if (!currentRoom) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-red-500 mb-4">房间不存在或您没有权限访问</p>
        <button
          onClick={() => navigate('/rooms')}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          返回房间列表
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* 顶部栏 */}
      <header className="h-14 border-b flex items-center justify-between px-4 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-4">
          <h1 className="font-semibold">{currentRoom.name}</h1>
          <span className="text-sm text-gray-500">{currentRoom.roomId}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            connectionStatus === 'online' ? 'bg-green-500' :
            connectionStatus === 'syncing' ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          <span className="text-sm text-gray-500">
            {connectionStatus === 'online' ? '已连接' :
             connectionStatus === 'syncing' ? '同步中' : '离线'}
          </span>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 编辑器 */}
        <main className="flex-1">
          <Editor />
        </main>

        {/* 侧边栏 - 成员列表 */}
        <aside className="w-64 border-l overflow-y-auto">
          <MemberList />
        </aside>
      </div>

      {/* 角色变更通知 */}
      <RoleChangeNotification />
    </div>
  );
};
```

---

## 下一步

请继续阅读 **Part 6: 测试方案** (`PART6_TESTING.md`)
