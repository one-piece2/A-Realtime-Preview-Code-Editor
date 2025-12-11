// Auth 模块业务服务
// 封装所有认证相关的 API 调用和业务逻辑

import axios from "axios";
import { api } from "@/utils/axios";
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
} from "./types";
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
} from "@/utils/mannegerToken";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

//API 服务

// 用户登录

export async function loginApi(data: LoginRequest): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/auth/login/local", data);
  return response.data;
}

// 用户注册
export async function registerApi(
  data: RegisterRequest
): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/auth/register/local", data);
  return response.data;
}

//验证 Token 有效性

export async function verifyTokenApi(): Promise<User> {
  const response = await api.get<User>("/auth/me");
  return response.data;
}

// 刷新 Token（使用原生 axios，不走拦截器）
export async function refreshTokenApi(
  refreshTokenValue: string
): Promise<AuthResponse> {
  const response = await axios.post<AuthResponse>(
    `${API_BASE_URL}/auth/refresh`,
    {
      refreshToken: refreshTokenValue,
    }
  );
  return response.data;
}

// GitHub 登录
export function loginWithGitHub(): void {
  window.location.href = `${API_BASE_URL}/auth/github`;
}

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
    const response = await refreshTokenApi(refreshTokenValue);
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
    const verifiedUser = await verifyTokenApi();
    return { isValid: true, user: verifiedUser, token };
  } catch (error) {
    // accessToken 无效，尝试刷新
    if (refreshTokenValue) {
      try {
        const response = await refreshTokenApi(refreshTokenValue);
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
          error: "登录已过期，请重新登录",
        };
      }
    }

    clearAuth();
    return {
      isValid: false,
      user: null,
      token: null,
      error: "登录状态无效，请重新登录",
    };
  }
}
