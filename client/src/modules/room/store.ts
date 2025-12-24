// Room 模块 Zustand Store
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { registerStore } from '@/core/store';
import { roomApi } from '@/api/room/api';
import type {
  Room,
  RoomMember,
  RoomRole,
  RoomState,
  CreateRoomParams,
  RoomStore,
} from './types';

// 初始状态
const initialState: RoomState = {
  currentRoom: null,
  myRole: null,
  members: [],
  ownedRooms: [],
  joinedRooms: [],
  isLoading: false,
  error: null,
};

// 创建 Room Store
export const useRoomStore = create<RoomStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // 创建房间
      createRoom: async (params: CreateRoomParams) => {
        set({ isLoading: true, error: null });
        try {
          const room = await roomApi.createRoom(params);
          // 创建成功后添加到 ownedRooms
          set((state) => ({
            ownedRooms: [room, ...state.ownedRooms],
            isLoading: false,
          }));
          return room;
        } catch (error: any) {
          const message = error.response?.data?.message || '创建房间失败';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      // 获取房间详情
      fetchRoom: async (roomId: string) => {
        set({ isLoading: true, error: null });
        try {
          const detail = await roomApi.getRoomDetail(roomId);
          set({
            currentRoom: detail.room,
            myRole: detail.myRole,
            members: detail.members,
            isLoading: false,
          });
          return detail;
        } catch (error: any) {
          const message = error.response?.data?.message || '获取房间详情失败';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      // 更新房间信息
      updateRoom: async (roomId: string, params: Partial<CreateRoomParams>) => {
        set({ isLoading: true, error: null });
        try {
          const room = await roomApi.updateRoom(roomId, params);
          // 更新当前房间
          if (get().currentRoom?.roomId === roomId) {
            set({ currentRoom: room });
          }
          // 更新 ownedRooms 列表
          set((state) => ({
            ownedRooms: state.ownedRooms.map((r) =>
              r.roomId === roomId ? room : r
            ),
            isLoading: false,
          }));
          return room;
        } catch (error: any) {
          const message = error.response?.data?.message || '更新房间失败';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      // 删除房间
      deleteRoom: async (roomId: string) => {
        set({ isLoading: true, error: null });
        try {
          await roomApi.deleteRoom(roomId);
          // 从 ownedRooms 移除
          set((state) => ({
            ownedRooms: state.ownedRooms.filter((r) => r.roomId !== roomId),
            // 如果删除的是当前房间，清空当前房间状态
            currentRoom: state.currentRoom?.roomId === roomId ? null : state.currentRoom,
            myRole: state.currentRoom?.roomId === roomId ? null : state.myRole,
            members: state.currentRoom?.roomId === roomId ? [] : state.members,
            isLoading: false,
          }));
        } catch (error: any) {
          const message = error.response?.data?.message || '删除房间失败';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      // 加入房间
      joinRoom: async (roomId: string) => {
        set({ isLoading: true, error: null });
        try {
          await roomApi.joinRoom(roomId);
          await get().fetchMyRooms();
          set({ isLoading: false });
        } catch (error: any) {
          const message = error.response?.data?.message || '加入房间失败';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      // 离开房间
      leaveRoom: async (roomId: string) => {
        set({ isLoading: true, error: null });
        try {
          await roomApi.leaveRoom(roomId);
          set((state) => ({
            joinedRooms: state.joinedRooms.filter((r) => r.roomId !== roomId),
            currentRoom: state.currentRoom?.roomId === roomId ? null : state.currentRoom,
            myRole: state.currentRoom?.roomId === roomId ? null : state.myRole,
            members: state.currentRoom?.roomId === roomId ? [] : state.members,
            isLoading: false,
          }));
        } catch (error: any) {
          const message = error.response?.data?.message || '离开房间失败';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      // 更新成员角色
      updateMemberRole: async (roomId: string, userId: string, role: 'editor' | 'viewer') => {
        set({ isLoading: true, error: null });
        try {
          const updatedMember = await roomApi.updateMemberRole(roomId, userId, { role });
          set((state) => ({
            members: state.members.map((m) =>
              m.userId === userId ? { ...m, role: updatedMember.role } : m
            ),
            isLoading: false,
          }));
        } catch (error: any) {
          const message = error.response?.data?.message || '更新成员角色失败';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      // 移除成员
      removeMember: async (roomId: string, userId: string) => {
        set({ isLoading: true, error: null });
        try {
          await roomApi.removeMember(roomId, userId);
          set((state) => ({
            members: state.members.filter((m) => m.userId !== userId),
            isLoading: false,
          }));
        } catch (error: any) {
          const message = error.response?.data?.message || '移除成员失败';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      // 获取我的所有房间
      fetchMyRooms: async () => {
        set({ isLoading: true, error: null });
        try {
          const { owned, joined } = await roomApi.getUserRooms();
          set({
            ownedRooms: owned,
            joinedRooms: joined,
            isLoading: false,
          });
        } catch (error: any) {
          const message = error.response?.data?.message || '获取房间列表失败';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      // 设置当前房间
      setCurrentRoom: (room: Room | null, role: RoomRole | null) => {
        set({ currentRoom: room, myRole: role });
      },

      // 设置成员列表
      setMembers: (members: RoomMember[]) => {
        set({ members });
      },

      // 添加成员（实时同步用）
      addMember: (member: RoomMember) => {
        set((state) => {
          const exists = state.members.some((m) => m.userId === member.userId);
          if (exists) return state;
          return { members: [...state.members, member] };
        });
      },

      // 移除成员（实时同步用）
      removeMemberById: (userId: string) => {
        set((state) => ({
          members: state.members.filter((m) => m.userId !== userId),
        }));
      },

      // 更新我的角色
      updateMyRole: (role: RoomRole, userId?: string) => {
        set((state) => ({
          myRole: role,
          // 如果提供了 userId，同时更新成员列表中该用户的角色
          members: userId 
            ? state.members.map((m) => m.userId === userId ? { ...m, role } : m)
            : state.members,
        }));
      },

      // 清除错误
      clearError: () => {
        set({ error: null });
      },

      // 重置状态
      reset: () => {
        set(initialState);
      },
    }),
    { name: 'room-store' }
  )
);

// 注册到全局 store registry
registerStore('room', useRoomStore);

// 导出选择器
export const roomSelectors = {
  currentRoom: (state: RoomStore) => state.currentRoom,
  myRole: (state: RoomStore) => state.myRole,
  members: (state: RoomStore) => state.members,
  ownedRooms: (state: RoomStore) => state.ownedRooms,
  joinedRooms: (state: RoomStore) => state.joinedRooms,
  isLoading: (state: RoomStore) => state.isLoading,
  error: (state: RoomStore) => state.error,
  canEdit: (state: RoomStore) => state.myRole === 'owner' || state.myRole === 'editor',
  isOwner: (state: RoomStore) => state.myRole === 'owner',
};