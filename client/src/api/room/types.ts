// 房间相关类型定义

// 角色类型
export type RoomRole = 'owner' | 'editor' | 'viewer';

// 房间状态
export type RoomStatus = 'active' | 'archived' | 'deleted';

// 房间信息
export interface Room {
  id: string;
  roomId: string;           // 用户可见的房间号 (如: abc-123-xyz)
  name: string;
  description?: string;
  ownerId: string;
  isPublic: boolean;
  status: RoomStatus;
  maxMembers: number;
  defaultRole: 'editor' | 'viewer';
  createdAt: string;
  updatedAt: string;
  owner?: User;
}

// 用户信息 (简化版)
export interface User {
  id: string;
  username: string;
  email: string;
  githubAvatar?: string;
}

// 房间成员
export interface RoomMember {
  id: string;
  roomId: string;
  userId: string;
  role: RoomRole;
  invitedBy?: string;
  joinedAt: string;
  lastActiveAt?: string;
  user: User;
}

// ==================== 请求参数 ====================

// 创建房间
export interface CreateRoomRequest {
  name: string;
  description?: string;
  isPublic?: boolean;
  defaultRole?: 'editor' | 'viewer';
}

// 更新房间
export interface UpdateRoomRequest {
  name?: string;
  description?: string;
  isPublic?: boolean;
  defaultRole?: 'editor' | 'viewer';
}

// 更新成员角色
export interface UpdateMemberRoleRequest {
  role: 'editor' | 'viewer';
}

// ==================== 响应类型 ====================

// 通用响应
export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  message?: string;
}

// 获取用户房间列表响应
export interface UserRoomsResponse {
  owned: Room[];
  joined: Room[];
}

// 获取房间详情响应
export interface RoomDetailResponse {
  room: Room;
  members: RoomMember[];
  myRole: RoomRole | null;
}
