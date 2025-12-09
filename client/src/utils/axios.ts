import axios, { AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { 
  getToken, 
  getRefreshToken, 
  setToken, // 在 refreshAccessToken 的 TODO 中使用（后端实现后启用）
  setRefreshToken, // 在 refreshAccessToken 的 TODO 中使用（后端实现后启用）
  removeToken, // 在 clearAuth 中使用
  removeRefreshToken, // 在 clearAuth 中使用
  clearAuth 
} from '@/utils/mannegerToken';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 标记是否正在刷新 token，防止并发请求时多次刷新
let isRefreshing = false;
// 存储待重试的请求队列
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

/**
 * 处理队列中的请求
 * @param error - 错误对象
 * @param token - 新的 accessToken
 */
const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * 刷新 Token
 * @returns 新的 accessToken 或 null
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  
  if (!refreshToken) {
    // 没有 refreshToken，清除所有认证信息并跳转登录
    clearAuth();
    window.location.href = '/login';
    return null;
  }

  try {
    // TODO: 调用刷新 token 接口
    // const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
    //   refreshToken: refreshToken
    // });
    // 
    // const { accessToken, refreshToken: newRefreshToken } = response.data;
    // 
    // // 保存新的 token
    // setToken(accessToken);
    // if (newRefreshToken) {
    //   setRefreshToken(newRefreshToken);
    // }
    // 
    // return accessToken;

    // 临时返回 null，等待后端实现
    console.warn('Token refresh not implemented yet');
    return null;
  } catch (error) {
    // 刷新失败，清除所有认证信息并跳转登录
    clearAuth();
    window.location.href = '/login';
    return null;
  }
}

// 请求拦截器：自动添加 Token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器：处理 Token 过期和自动刷新
api.interceptors.response.use(
  // 处理响应数据
  (response: AxiosResponse) => response,
  // 处理错误
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 如果是 401 错误且不是刷新 token 的请求
    if (error.response?.status === 401 && !originalRequest._retry) {
      // 如果正在刷新 token，将当前请求加入队列
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            // 使用新的 token 重试请求
            if (originalRequest.headers && token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      // 标记正在刷新
      originalRequest._retry = true;
      isRefreshing = true;

      // 尝试刷新 token
      const newToken = await refreshAccessToken();

      // 处理队列中的请求
      processQueue(null, newToken);
      isRefreshing = false;

      if (newToken) {
        // 使用新的 token 重试原始请求
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return api(originalRequest);
      } else {
        // 刷新失败，清除认证信息并跳转登录
        clearAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    // 其他错误直接返回
    return Promise.reject(error);
  }
);