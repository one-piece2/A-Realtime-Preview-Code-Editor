// 角色类型
export type RoomRole = 'owner' | 'editor' | 'viewer';

// 房间信息
export interface Room {
  id: string;
  roomId: string;        // 用户可见的房间号 (如: abc-123-xyz)
  name: string;
  description?: string;
  ownerId: string;
  isPublic: boolean;
  defaultRole: 'editor' | 'viewer';
  status: 'active' | 'archived' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

// 房间成员
export interface RoomMember {
  id: string;
  roomId: string;
  userId: string;
  role: RoomRole;
  joinedAt: string;
  user: {
    id: string;
    username: string;
    email: string;
    githubAvatar?: string;
  };
}

// 房间详情 (含成员)
export interface RoomDetail {
  room: Room;
  members: RoomMember[];
  myRole: RoomRole | null;
}

// 创建房间参数
export interface CreateRoomParams {
  name: string;
  description?: string;
  isPublic?: boolean;
  defaultRole?: 'editor' | 'viewer';
}

// 更新成员角色参数
export interface UpdateMemberRoleParams {
  role: 'editor' | 'viewer';
}

// Room Store 状态
export interface RoomState {
  // 当前房间
  currentRoom: Room | null;
  myRole: RoomRole | null;
  //该房间所有的成员信息
  members: RoomMember[];
  
  // 我的房间列表
  ownedRooms: Room[];
  joinedRooms: Room[];
  
  // 加载状态
  isLoading: boolean;
  error: string | null;
}

// Room Store 操作
export interface RoomActions {
  // 房间操作
  createRoom: (params: CreateRoomParams) => Promise<Room>;
  fetchRoom: (roomId: string) => Promise<RoomDetail>;
  updateRoom: (roomId: string, params: Partial<CreateRoomParams>) => Promise<Room>;
  deleteRoom: (roomId: string) => Promise<void>;
  
  // 成员操作
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: (roomId: string) => Promise<void>;
  updateMemberRole: (roomId: string, userId: string, role: 'editor' | 'viewer') => Promise<void>;
  removeMember: (roomId: string, userId: string) => Promise<void>;
  addMember: (member: RoomMember) => void;
  removeMemberById: (userId: string) => void;

  
  // 我的房间
  fetchMyRooms: () => Promise<void>;
  
  // 状态管理
  setCurrentRoom: (room: Room | null, role: RoomRole | null) => void;
  setMembers: (members: RoomMember[]) => void;
  updateMyRole: (role: RoomRole, userId?: string) => void;
  clearError: () => void;
  reset: () => void;
}

export type RoomStore = RoomState & RoomActions;