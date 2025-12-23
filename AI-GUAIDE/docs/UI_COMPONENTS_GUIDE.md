# 房间与协作 UI 组件说明文档

## 目录

- [1. 组件结构总览](#1-组件结构总览)
- [2. 组件关系图](#2-组件关系图)
- [3. Room 组件详解](#3-room-组件详解)
- [4. Member 组件详解](#4-member-组件详解)
- [5. Permission 组件详解](#5-permission-组件详解)
- [6. 页面组件详解](#6-页面组件详解)
- [7. 数据流与状态管理](#7-数据流与状态管理)
- [8. 使用示例](#8-使用示例)

---

## 1. 组件结构总览

```
client/src/
├── components/
│   ├── room/                      # 房间相关组件
│   │   ├── RoomCard.tsx           # 房间卡片
│   │   ├── CreateRoomForm.tsx     # 创建房间表单
│   │   ├── JoinRoomDialog.tsx     # 加入房间对话框
│   │   └── index.ts               # 统一导出
│   │
│   ├── member/                    # 成员管理组件
│   │   ├── MemberList.tsx         # 成员列表容器
│   │   ├── MemberItem.tsx         # 单个成员项
│   │   └── index.ts               # 统一导出
│   │
│   ├── permission/                # 权限控制组件
│   │   ├── ReadOnlyBanner.tsx     # 只读模式提示
│   │   ├── PermissionGuard.tsx    # 权限守卫
│   │   ├── RoleChangeNotification.tsx  # 角色变更通知
│   │   └── index.ts               # 统一导出
│   │
│   └── ui/                        # 基础 UI 组件 (shadcn/ui)
│       ├── badge.tsx              # 徽章组件 (新增)
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       └── ...
│
├── pages/
│   ├── RoomsPage.tsx              # 房间列表页
│   ├── CreateRoomPage.tsx         # 创建房间页
│   └── RoomEditorPage.tsx         # 房间编辑器页
│
└── modules/
    ├── room/                      # 房间状态管理
    │   ├── store.ts               # Zustand Store
    │   ├── hooks.ts               # React Hooks
    │   └── service.ts             # 工具函数
    │
    └── collaboration/             # 协作状态管理
        ├── store.ts
        └── hooks.ts
```

---

## 2. 组件关系图

### 2.1 页面与组件关系

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              App.tsx (路由)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  /rooms ──────────────► RoomsPage                                           │
│                         ├── RoomCard (多个)                                  │
│                         └── JoinRoomDialog                                   │
│                                                                              │
│  /rooms/create ───────► CreateRoomPage                                      │
│                         └── CreateRoomForm                                   │
│                                                                              │
│  /room/:roomId ───────► RoomEditorPage                                      │
│                         ├── ReadOnlyBanner                                   │
│                         ├── MemberList                                       │
│                         │   └── MemberItem (多个)                            │
│                         ├── RoleChangeNotification                           │
│                         ├── OwnerOnly (权限守卫)                             │
│                         └── [Monaco Editor] (待集成)                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 组件与 Hooks 关系

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              组件层                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  RoomsPage ─────────────────► useMyRooms()                                  │
│                                ├── ownedRooms                               │
│                                ├── joinedRooms                              │
│                                └── refresh()                                │
│                                                                              │
│  RoomEditorPage ────────────► useEnterRoom(roomId)                          │
│                               useCurrentRoom()                               │
│                               useInitCollaboration()                         │
│                               useConnectionStatus()                          │
│                               useCanEdit()                                   │
│                                                                              │
│  MemberList ────────────────► useCurrentRoom()                              │
│                               useMemberActions()                             │
│                                                                              │
│  CreateRoomForm ────────────► useRoomStore().createRoom()                   │
│                                                                              │
│  JoinRoomDialog ────────────► useRoomStore().joinRoom()                     │
│                                                                              │
│  ReadOnlyBanner ────────────► (props: role)                                 │
│                                                                              │
│  PermissionGuard ───────────► useCurrentRoom().myRole                       │
│                                                                              │
│  RoleChangeNotification ────► useCollaborationStore().role                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Room 组件详解

### 3.1 RoomCard

**路径**: `components/room/RoomCard.tsx`

**作用**: 展示单个房间的卡片，用于房间列表页

**Props**:
```typescript
interface RoomCardProps {
  room: Room;           // 房间信息
  role?: RoomRole;      // 我在该房间的角色 (可选)
}
```

**功能**:
- 显示房间名称、描述、房间 ID
- 显示公开/私有状态图标
- 显示用户角色徽章 (房主/编辑者/观看者)
- 点击跳转到编辑器页面

**使用场景**:
```tsx
// 在 RoomsPage 中使用
{ownedRooms.map((room) => (
  <RoomCard key={room.id} room={room} role="owner" />
))}
```

---

### 3.2 CreateRoomForm

**路径**: `components/room/CreateRoomForm.tsx`

**作用**: 创建新房间的表单

**功能**:
- 输入房间名称 (必填)
- 输入房间描述 (可选)
- 选择房间类型 (公开/私有)
- 选择新成员默认角色 (编辑者/观看者)
- 提交后自动跳转到新房间

**状态管理**:
```typescript
// 内部使用 Room Store
const createRoom = useRoomStore((s) => s.createRoom);
const isLoading = useRoomStore((s) => s.isLoading);
const error = useRoomStore((s) => s.error);
```

---

### 3.3 JoinRoomDialog

**路径**: `components/room/JoinRoomDialog.tsx`

**作用**: 加入已有房间的对话框

**Props**:
```typescript
interface JoinRoomDialogProps {
  trigger?: React.ReactNode;  // 自定义触发按钮 (可选)
}
```

**功能**:
- 输入房间 ID
- 验证并加入房间
- 成功后跳转到编辑器页面
- 显示错误提示

**使用场景**:
```tsx
// 默认触发按钮
<JoinRoomDialog />

// 自定义触发按钮
<JoinRoomDialog trigger={<Button>加入</Button>} />
```

---

## 4. Member 组件详解

### 4.1 MemberList

**路径**: `components/member/MemberList.tsx`

**作用**: 显示当前房间的成员列表

**功能**:
- 显示成员总数
- 渲染所有成员项
- 使用 ScrollArea 支持滚动

**Hooks 依赖**:
```typescript
const { members, currentRoom } = useCurrentRoom();
const { updateMemberRole, removeMember, canManageMembers } = useMemberActions();
```

---

### 4.2 MemberItem

**路径**: `components/member/MemberItem.tsx`

**作用**: 显示单个成员信息和管理操作

**Props**:
```typescript
interface MemberItemProps {
  member: RoomMember;                           // 成员信息
  canManage: boolean;                           // 是否可管理
  onRoleChange: (role: 'editor' | 'viewer') => void;  // 角色变更回调
  onRemove: () => void;                         // 移除成员回调
}
```

**功能**:
- 显示成员头像、用户名、邮箱
- 显示角色标签 (房主/编辑者/观看者)
- 管理菜单 (仅房主可见):
  - 设为编辑者
  - 设为观看者
  - 移出房间

**权限控制**:
```typescript
// 只有房主可以管理非房主成员
canManage={canManageMembers && member.role !== 'owner'}
```

---

## 5. Permission 组件详解

### 5.1 ReadOnlyBanner

**路径**: `components/permission/ReadOnlyBanner.tsx`

**作用**: 在编辑器顶部显示只读模式提示

**Props**:
```typescript
interface ReadOnlyBannerProps {
  role: RoomRole | null;
}
```

**功能**:
- 仅当 `role === 'viewer'` 时显示
- 黄色背景横幅
- 显示 "只读模式 - 您没有编辑权限"

**使用场景**:
```tsx
<div className="relative">
  <ReadOnlyBanner role={myRole} />
  <MonacoEditor />
</div>
```

---

### 5.2 PermissionGuard

**路径**: `components/permission/PermissionGuard.tsx`

**作用**: 根据用户角色条件渲染子组件

**Props**:
```typescript
interface PermissionGuardProps {
  requiredRoles: RoomRole[];    // 允许的角色列表
  children: ReactNode;          // 有权限时渲染
  fallback?: ReactNode;         // 无权限时渲染 (可选)
}
```

**便捷组件**:
```typescript
// 仅房主可见
<OwnerOnly>
  <SettingsButton />
</OwnerOnly>

// 编辑者或房主可见
<EditorOrOwner>
  <SaveButton />
</EditorOrOwner>

// 带 fallback
<OwnerOnly fallback={<span>无权限</span>}>
  <DeleteButton />
</OwnerOnly>
```

---

### 5.3 RoleChangeNotification

**路径**: `components/permission/RoleChangeNotification.tsx`

**作用**: 当用户角色被修改时显示通知

**功能**:
- 监听 `collaborationStore.role` 变化
- 角色变更时显示浮动通知
- 5 秒后自动消失
- 可手动关闭

**样式**:
- 房主: 黄色背景
- 编辑者: 绿色背景
- 观看者: 灰色背景 + "(只读)" 提示

---

## 6. 页面组件详解

### 6.1 RoomsPage

**路径**: `pages/RoomsPage.tsx`

**路由**: `/rooms`

**作用**: 显示用户的所有房间

**结构**:
```
┌─────────────────────────────────────────────────────────────────┐
│  头部: 标题 + [加入房间] [创建房间]                               │
├─────────────────────────────────────────────────────────────────┤
│  我创建的房间 (N)                                                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                           │
│  │RoomCard │ │RoomCard │ │RoomCard │                           │
│  └─────────┘ └─────────┘ └─────────┘                           │
├─────────────────────────────────────────────────────────────────┤
│  我加入的房间 (N)                                                │
│  ┌─────────┐ ┌─────────┐                                        │
│  │RoomCard │ │RoomCard │                                        │
│  └─────────┘ └─────────┘                                        │
└─────────────────────────────────────────────────────────────────┘
```

**Hooks**:
```typescript
const { ownedRooms, joinedRooms, isLoading, error, refresh } = useMyRooms();
```

---

### 6.2 CreateRoomPage

**路径**: `pages/CreateRoomPage.tsx`

**路由**: `/rooms/create`

**作用**: 创建新房间的页面

**结构**:
```
┌─────────────────────────────────────────────────────────────────┐
│  ← 返回房间列表                                                  │
│                                                                  │
│  创建新房间                                                       │
│  创建一个协作房间，邀请他人一起编辑代码                            │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    CreateRoomForm                           ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

### 6.3 RoomEditorPage

**路径**: `pages/RoomEditorPage.tsx`

**路由**: `/room/:roomId`

**作用**: 房间编辑器主页面

**结构**:
```
┌─────────────────────────────────────────────────────────────────┐
│  ← │ 房间名称 │ abc-123 │ 编辑者 │     ● 已连接 │ 3人 │ 分享 │ ⚙ │
├─────────────────────────────────────────────────────────────────┤
│                                                    │            │
│  ┌─────────────────────────────────────────────┐  │ MemberList │
│  │  ReadOnlyBanner (仅 viewer 显示)             │  │            │
│  ├─────────────────────────────────────────────┤  │ ┌────────┐ │
│  │                                              │  │ │Member1 │ │
│  │              Monaco Editor                   │  │ ├────────┤ │
│  │              (待集成)                         │  │ │Member2 │ │
│  │                                              │  │ ├────────┤ │
│  │                                              │  │ │Member3 │ │
│  │                                              │  │ └────────┘ │
│  └─────────────────────────────────────────────┘  │            │
│                                                    │            │
└─────────────────────────────────────────────────────────────────┘
│                    RoleChangeNotification (浮动)                 │
└─────────────────────────────────────────────────────────────────┘
```

**Hooks 使用**:
```typescript
// 1. 进入房间，加载房间信息
const { isLoading, error } = useEnterRoom(roomId);
const { currentRoom, myRole, members } = useCurrentRoom();

// 2. 初始化协作 (Yjs + Socket)
useInitCollaboration(roomId, { username, avatarUrl });

// 3. 监听连接状态
const connectionStatus = useConnectionStatus();

// 4. 检查编辑权限
const canEdit = useCanEdit();
```

---

## 7. 数据流与状态管理

### 7.1 进入房间的数据流

```
用户访问 /room/:roomId
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│  RoomEditorPage                                                  │
│  │                                                               │
│  ├─► useEnterRoom(roomId)                                       │
│  │   └─► fetchRoom(roomId) ──► REST API ──► Room Store          │
│  │       ├── currentRoom                                         │
│  │       ├── myRole                                              │
│  │       └── members                                             │
│  │                                                               │
│  ├─► useInitCollaboration(roomId, { username, avatarUrl })      │
│  │   └─► 等待 myRole 获取完成                                    │
│  │       └─► initCollaboration() ──► Collaboration Store        │
│  │           ├── ydoc                                            │
│  │           ├── provider                                        │
│  │           └── role                                            │
│  │                                                               │
│  ├─► useConnectionStatus()                                       │
│  │   └─► 监听 provider 连接状态                                  │
│  │                                                               │
│  └─► useCanEdit()                                                │
│      └─► collabCanEdit && roomCanEdit                           │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 角色变更的数据流

```
房主修改成员角色 (REST API)
        │
        ▼
后端广播 ROLE_CHANGED 事件
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│  SocketIOProvider.handleRoleChanged()                            │
│  │                                                               │
│  └─► onRoleChanged(newRole)                                      │
│      │                                                           │
│      ├─► Collaboration Store                                     │
│      │   set({ role: newRole, canEdit: newRole !== 'viewer' })  │
│      │                                                           │
│      └─► Room Store                                              │
│          updateMyRole(newRole)                                   │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│  UI 自动响应                                                     │
│  │                                                               │
│  ├─► RoleChangeNotification 显示通知                             │
│  ├─► ReadOnlyBanner 显示/隐藏                                    │
│  ├─► Monaco Editor readOnly 属性变化                             │
│  └─► MemberItem 角色标签更新                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. 使用示例

### 8.1 在现有编辑器中集成权限控制

```tsx
import { useCanEdit } from '@/modules/collaboration/hooks';
import { useCurrentRoom } from '@/modules/room/hooks';
import { ReadOnlyBanner } from '@/components/permission/ReadOnlyBanner';

function MyEditor() {
  const { myRole } = useCurrentRoom();
  const canEdit = useCanEdit();

  return (
    <div className="relative h-full">
      <ReadOnlyBanner role={myRole} />
      <MonacoEditor
        options={{
          readOnly: !canEdit,
        }}
      />
    </div>
  );
}
```

### 8.2 条件渲染管理按钮

```tsx
import { OwnerOnly, EditorOrOwner } from '@/components/permission/PermissionGuard';

function Toolbar() {
  return (
    <div className="flex gap-2">
      {/* 所有人可见 */}
      <ShareButton />

      {/* 编辑者和房主可见 */}
      <EditorOrOwner>
        <SaveButton />
      </EditorOrOwner>

      {/* 仅房主可见 */}
      <OwnerOnly>
        <SettingsButton />
        <DeleteRoomButton />
      </OwnerOnly>
    </div>
  );
}
```

### 8.3 监听角色变更

```tsx
import { RoleChangeNotification } from '@/components/permission/RoleChangeNotification';

function App() {
  return (
    <div>
      {/* 页面内容 */}
      <MainContent />

      {/* 全局角色变更通知 */}
      <RoleChangeNotification />
    </div>
  );
}
```

---

## 附录: 组件依赖关系表

| 组件 | 依赖的 Hooks | 依赖的 Store | 依赖的组件 |
|------|-------------|-------------|-----------|
| RoomsPage | useMyRooms | - | RoomCard, JoinRoomDialog |
| CreateRoomPage | - | - | CreateRoomForm |
| RoomEditorPage | useEnterRoom, useCurrentRoom, useInitCollaboration, useConnectionStatus, useCanEdit | useAuthStore | MemberList, ReadOnlyBanner, RoleChangeNotification, OwnerOnly |
| RoomCard | - | - | Card, Badge |
| CreateRoomForm | - | useRoomStore | Card, Button, Input |
| JoinRoomDialog | - | useRoomStore | Dialog, Button, Input |
| MemberList | useCurrentRoom, useMemberActions | - | MemberItem, Card, ScrollArea |
| MemberItem | - | - | Avatar, DropdownMenu, Button |
| ReadOnlyBanner | - | - | - |
| PermissionGuard | useCurrentRoom | - | - |
| RoleChangeNotification | - | useCollaborationStore | - |

---

*文档版本: 1.0*  
*最后更新: 2024-12-21*
