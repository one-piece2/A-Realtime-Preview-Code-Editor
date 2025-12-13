// Auth API 接口
// 所有认证相关的 HTTP 请求

import axios from 'axios';
import { api } from '@/utils/axios';
import type { LoginRequest, RegisterRequest, AuthResponse, User } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// 登录
export async function login(data: LoginRequest): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/login/local', data);
  return response.data;
}

// 注册
export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/register/local', data);
  return response.data;
}

// 验证 Token 有效性 后端自动处理
export async function verifyToken(): Promise<User> {
  const response = await api.get<User>('/auth/me');
  return response.data;
}

// GitHub 登录
export function loginWithGitHub(): void {
  window.location.href = `${API_BASE_URL}/auth/github`;
}

// 刷新 Token（使用原生 axios，不走拦截器，避免循环调用）
export async function refreshToken(refreshTokenValue: string): Promise<AuthResponse> {
  const response = await axios.post<AuthResponse>(`${API_BASE_URL}/auth/refresh`, {
    refreshToken: refreshTokenValue,
  });
  return response.data;
}

// 统一导出
export const authApi = {
  login,
  register,
  verifyToken,
  loginWithGitHub,
  refreshToken,
};