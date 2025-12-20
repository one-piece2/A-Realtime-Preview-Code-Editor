import { io, Socket } from "socket.io-client";
import { getToken } from "@/utils/mannegerToken";

// Socket 单例实例
let socketInstance: Socket | null = null;

// 获取后端 URL
const getBackendUrl = () => import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// 获取带认证的 Socket 实例（单例模式）
export const getAuthenticatedSocket = (): Socket | null => {
  const token = getToken();
  if (!token) return null;

  // 如果已有实例且连接正常，直接返回
  if (socketInstance && !socketInstance.disconnected) {
    return socketInstance;
  }

  // 创建新实例
  socketInstance = io(getBackendUrl(), {
    auth: { token },
    withCredentials: true,
    transports: ['websocket', 'polling'],
    autoConnect: false,
    reconnectionAttempts: 5,
    reconnectionDelay: 100,
    reconnectionDelayMax: 500,
    timeout: 5000,
  });

  return socketInstance;
};

// 断开并清理 Socket 实例
export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

// 获取当前 Socket 实例 不创建新的
export const getCurrentSocket = (): Socket | null => socketInstance;

// 兼容旧的 initSocket（已废弃，建议使用 getAuthenticatedSocket）
/** @deprecated 使用 getAuthenticatedSocket 代替 */
export const initSocket = async (): Promise<Socket | null> => {
  return getAuthenticatedSocket();
};
