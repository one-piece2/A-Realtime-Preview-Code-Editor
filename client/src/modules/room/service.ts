// Room 模块业务服务
// 只包含纯函数和工具函数，不依赖 store
// store 操作由 hooks 层组合完成

import type { RoomRole, RoomMember } from './types';

// ==================== 事件 Payload 类型 ====================

export interface RoleChangedPayload {
  roomId: string;
  userId: string;
  newRole: RoomRole;
}

export interface MemberJoinedPayload {
  userId: string;
  username: string;
  socketId: string;
}

export interface MemberLeftPayload {
  userId: string;
  username: string;
  socketId: string;
}

export interface MemberRemovedPayload {
  roomId: string;
  userId: string;
  message: string;
}

export interface RoomUpdatedPayload {
  type: 'room_deleted' | 'room_updated';
  roomId: string;
  message: string;
}

// ==================== 权限判断 ====================

// 检查用户是否有编辑权限
export function canEdit(role: RoomRole | null): boolean {
  return role === 'owner' || role === 'editor';
}

// 检查用户是否是房主
export function isOwner(role: RoomRole | null): boolean {
  return role === 'owner';
}

// 获取角色显示名称
export function getRoleDisplayName(role: RoomRole): string {
  const roleNames: Record<RoomRole, string> = {
    owner: '房主',
    editor: '编辑者',
    viewer: '观察者',
  };
  return roleNames[role];
}

// 获取角色对应的颜色
export function getRoleColor(role: RoomRole): string {
  const roleColors: Record<RoomRole, string> = {
    owner: '#f59e0b',   // 金色
    editor: '#3b82f6',  // 蓝色
    viewer: '#6b7280',  // 灰色
  };
  return roleColors[role];
}

// 按角色排序成员列表 (owner > editor > viewer)
export function sortMembersByRole(members: RoomMember[]): RoomMember[] {
  const roleOrder: Record<RoomRole, number> = {
    owner: 0,
    editor: 1,
    viewer: 2,
  };
  return [...members].sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
}

// 生成房间分享链接
export function generateShareLink(roomId: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/room/${roomId}`;
}

// 复制文本到剪贴板
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('复制失败:', error);
    return false;
  }
}

// 格式化时间
export function formatJoinedTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 30) return `${days} 天前`;

  return date.toLocaleDateString('zh-CN');
}
