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

  // 如果已有实例，更新 token 并返回
  if (socketInstance) {
    // 更新 auth token（重要：确保 token 始终是最新的）
    socketInstance.auth = { token };
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

