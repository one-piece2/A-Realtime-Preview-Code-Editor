// Auth 模块业务服务
// 只包含业务逻辑，API 接口从 @/api/auth 导入

import { authApi } from '@/api/auth/auth';
import type { AuthResponse, User } from '@/api/auth/types';
import {
  getToken,
  getUser,
  getRefreshToken,
  clearAuth,
  setAuth,
  setToken as setStorageToken,
  setUser as setStorageUser,
  setRefreshToken as setStorageRefreshToken,
  removeToken,
  removeUser,
} from '@/utils/mannegerToken';

// 本地存储服务
export const storageService = {
  getToken,
  getUser,
  getRefreshToken,
  clearAuth,
  setAuth,
  setToken: setStorageToken,
  setUser: setStorageUser,
  setRefreshToken: setStorageRefreshToken,
  removeToken,
  removeUser,
};

// 业务逻辑服务

// 尝试刷新 Token 使用RefreshToken

export async function tryRefreshToken(): Promise<AuthResponse | null> {
  const refreshTokenValue = getRefreshToken();

  if (!refreshTokenValue) {
    return null;
  }

  try {
    const response = await authApi.refreshToken(refreshTokenValue);
    setStorageToken(response.accessToken);
    setStorageRefreshToken(response.refreshToken);
    setStorageUser(response.user);
    return response;
  } catch (error) {
    clearAuth();
    return null;
  }
}

// 验证并恢复认证状态
export async function validateAndRestoreAuth(): Promise<{
  isValid: boolean;
  user: User | null;
  token: string | null;
  error?: string;
}> {
  const token = getToken();
  const user = getUser();
  const refreshTokenValue = getRefreshToken();

  // 没有 token 或 user
  if (!token || !user) {
    clearAuth();
    return { isValid: false, user: null, token: null };
  }

  try {
    // 验证 accessToken
    const verifiedUser = await authApi.verifyToken();
    return { isValid: true, user: verifiedUser, token };
  } catch (error) {
    // accessToken 无效，尝试刷新
    if (refreshTokenValue) {
      try {
        const response = await authApi.refreshToken(refreshTokenValue);
        setStorageToken(response.accessToken);
        setStorageRefreshToken(response.refreshToken);
        setStorageUser(response.user);
        return {
          isValid: true,
          user: response.user,
          token: response.accessToken,
        };
      } catch (refreshError) {
        clearAuth();
        return {
          isValid: false,
          user: null,
          token: null,
          error: '登录已过期，请重新登录',
        };
      }
    }

    clearAuth();
    return {
      isValid: false,
      user: null,
      token: null,
      error: '登录状态无效，请重新登录',
    };
  }
}


