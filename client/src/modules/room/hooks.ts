import { useEffect, useCallback } from 'react';
import { useRoomStore, roomSelectors } from './store';
import { useCollaborationStore } from '@/modules/collaboration/store';
import { ACTIONS } from '@/action';
import { toast } from 'sonner';
import type { RoomRole, RoomMember } from './types';


// 获取当前房间信息
export function useCurrentRoom() {
  const currentRoom = useRoomStore(roomSelectors.currentRoom);
  const myRole = useRoomStore(roomSelectors.myRole);
  const members = useRoomStore(roomSelectors.members);
  const canEdit = useRoomStore(roomSelectors.canEdit);
  const isOwner = useRoomStore(roomSelectors.isOwner);

  return { currentRoom, myRole, members, canEdit, isOwner };
  
}
// 房间操作 Hook
export function useRoomActions() {
  const createRoom = useRoomStore((s) => s.createRoom);
  const fetchRoom = useRoomStore((s) => s.fetchRoom);
  const updateRoom = useRoomStore((s) => s.updateRoom);
  const deleteRoom = useRoomStore((s) => s.deleteRoom);
  const joinRoom = useRoomStore((s) => s.joinRoom);
  const leaveRoom = useRoomStore((s) => s.leaveRoom);
  const isLoading = useRoomStore(roomSelectors.isLoading);
  const error = useRoomStore(roomSelectors.error);
  const clearError = useRoomStore((s) => s.clearError);

  return { createRoom, fetchRoom, updateRoom, deleteRoom, joinRoom, leaveRoom, isLoading, error, clearError };
}

// 成员管理 Hook
// 成员列表实时同步 Hook
export function useMemberSync() {
  const addMember = useRoomStore((s) => s.addMember);
  const removeMemberById = useRoomStore((s) => s.removeMemberById);
  const provider = useCollaborationStore((s) => s.provider);
  const currentRoom = useRoomStore(roomSelectors.currentRoom);

  useEffect(() => {
    if (!provider || !currentRoom) return;

    const socket = provider.socket;
    if (!socket) return;

    // 成员加入处理
    const handleMemberJoined = (payload: {
      userId: string;
      username: string;
      avatarUrl?: string;
      role: RoomRole;
    }) => {
      toast.success(`${payload.username} 加入了房间`);
      
      // 添加到成员列表
      const newMember: RoomMember = {
        id: `${currentRoom.roomId}-${payload.userId}`,
        roomId: currentRoom.roomId,
        userId: payload.userId,
        role: payload.role || 'viewer',
        joinedAt: new Date().toISOString(),
        user: {
          id: payload.userId,
          username: payload.username,
          email: '',
          githubAvatar: payload.avatarUrl,
        },
      };
      addMember(newMember);
    };

    // 成员离开处理
    const handleMemberLeft = (payload: { userId: string; username: string }) => {
      toast.info(`${payload.username} 离开了房间`);
      removeMemberById(payload.userId);
    };

    socket.on(ACTIONS.MEMBER_JOINED, handleMemberJoined);
    socket.on(ACTIONS.MEMBER_LEFT, handleMemberLeft);

    return () => {
      socket.off(ACTIONS.MEMBER_JOINED, handleMemberJoined);
      socket.off(ACTIONS.MEMBER_LEFT, handleMemberLeft);
    };
  }, [provider, currentRoom, addMember, removeMemberById]);
}

export function useMemberActions() {
  const updateMemberRole = useRoomStore((s) => s.updateMemberRole);
  const removeMember = useRoomStore((s) => s.removeMember);
  const isOwner = useRoomStore(roomSelectors.isOwner);

  return { updateMemberRole, removeMember, canManageMembers: isOwner };
}

// 我的房间列表 Hook
export function useMyRooms() {
  const ownedRooms = useRoomStore(roomSelectors.ownedRooms);
  const joinedRooms = useRoomStore(roomSelectors.joinedRooms);
  const isLoading = useRoomStore(roomSelectors.isLoading);
  const error = useRoomStore(roomSelectors.error);
  const fetchMyRooms = useRoomStore((s) => s.fetchMyRooms);

  useEffect(() => {
    fetchMyRooms();
  }, [fetchMyRooms]);

  return { ownedRooms, joinedRooms, isLoading, error, refresh: fetchMyRooms };
}

// 进入房间 Hook (结合 Room 和 Collaboration)
export function useEnterRoom(roomId: string | null) {
  const fetchRoom = useRoomStore((s) => s.fetchRoom);
  const setCurrentRoom = useRoomStore((s) => s.setCurrentRoom);
  const isLoading = useRoomStore(roomSelectors.isLoading);
  const error = useRoomStore(roomSelectors.error);

  useEffect(() => {
    //进入房间自动加载房间
    if (roomId) {
      fetchRoom(roomId).catch(console.error);
    } else {
        //离开房间清除
      setCurrentRoom(null, null);
    }
  }, [roomId, fetchRoom, setCurrentRoom]);

  return { isLoading, error };
}