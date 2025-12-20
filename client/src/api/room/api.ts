// Room API 接口
// 所有房间相关的 HTTP 请求

import { api } from '@/utils/axios';
import type {
  Room,
  RoomMember,
  CreateRoomRequest,
  UpdateRoomRequest,
  UpdateMemberRoleRequest,
  ApiResponse,
  UserRoomsResponse,
  RoomDetailResponse,
} from './types';

// ==================== 房间操作 ====================

// 创建房间
export async function createRoom(data: CreateRoomRequest): Promise<Room> {
  const response = await api.post<ApiResponse<Room>>('/room', data);
  return response.data.data!;
}

// 获取用户的所有房间
export async function getUserRooms(): Promise<UserRoomsResponse> {
  const response = await api.get<ApiResponse<UserRoomsResponse>>('/room');
  return response.data.data!;
}

// 获取房间详情 (包含成员列表)
export async function getRoomDetail(roomId: string): Promise<RoomDetailResponse> {
  const response = await api.get<ApiResponse<RoomDetailResponse>>(`/room/${roomId}`);
  return response.data.data!;
}

// 更新房间信息 (仅 owner)
export async function updateRoom(roomId: string, data: UpdateRoomRequest): Promise<Room> {
  const response = await api.patch<ApiResponse<Room>>(`/room/${roomId}`, data);
  return response.data.data!;
}

// 删除房间 (仅 owner)
export async function deleteRoom(roomId: string): Promise<void> {
  await api.delete<ApiResponse>(`/room/${roomId}`);
}

// ==================== 成员操作 ====================

// 加入房间
export async function joinRoom(roomId: string): Promise<RoomMember> {
  const response = await api.post<ApiResponse<RoomMember>>(`/room/${roomId}/join`);
  return response.data.data!;
}

// 离开房间
export async function leaveRoom(roomId: string): Promise<void> {
  await api.post<ApiResponse>(`/room/${roomId}/leave`);
}

// 获取房间成员列表
export async function getRoomMembers(roomId: string): Promise<RoomMember[]> {
  const response = await api.get<ApiResponse<RoomMember[]>>(`/room/${roomId}/members`);
  return response.data.data!;
}

// 更新成员角色 (仅 owner)
export async function updateMemberRole(
  roomId: string,
  userId: string,
  data: UpdateMemberRoleRequest
): Promise<RoomMember> {
  const response = await api.patch<ApiResponse<RoomMember>>(
    `/room/${roomId}/members/${userId}`,
    data
  );
  return response.data.data!;
}

// 移除成员 (仅 owner)
export async function removeMember(roomId: string, userId: string): Promise<void> {
  await api.delete<ApiResponse>(`/room/${roomId}/members/${userId}`);
}

// 转让房间所有权 (仅 owner)
export async function transferOwnership(roomId: string, newOwnerId: string): Promise<void> {
  await api.post<ApiResponse>(`/room/${roomId}/transfer/${newOwnerId}`);
}

// ==================== 统一导出 ====================

export const roomApi = {
  // 房间操作
  createRoom,
  getUserRooms,
  getRoomDetail,
  updateRoom,
  deleteRoom,
  // 成员操作
  joinRoom,
  leaveRoom,
  getRoomMembers,
  updateMemberRole,
  removeMember,
  transferOwnership,
};
