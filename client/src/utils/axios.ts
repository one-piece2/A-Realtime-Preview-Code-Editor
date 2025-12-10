import axios, { AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { 
  getToken, 
  getRefreshToken, 
  setToken, 
  setRefreshToken, 
  
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

 //处理队列中的请求
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


 //刷新 Token（只负责刷新，不负责跳转）
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  
  if (!refreshToken) {
    // 没有 refreshToken，返回 null，让调用方处理
    return null;
  }

  try {
    // 调用刷新 token 接口
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken
    });
    
    const { accessToken, refreshToken: newRefreshToken } = response.data;
    
    // 保存新的 token
    setToken(accessToken);
    if (newRefreshToken) {
      setRefreshToken(newRefreshToken);
    }
    
    return accessToken;
  } catch (error) {
    // 刷新失败，返回 null，让调用方处理
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
    //原来的请求对象  给他添加一个 _retry 属性，用于记录是否重试过
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 对于 /auth/me 验证请求，直接抛出错误，让调用方（AuthContext）处理
    // 不触发 token 刷新逻辑，避免无限循环
    if (originalRequest.url?.includes('/auth/me')) {
      return Promise.reject(error);
    }

    // 如果是 401 错误且不是刷新 token 的请求,且没有重试过
    if (error.response?.status === 401 && !originalRequest._retry) {
      // 如果正在刷新 token，将当前请求加入队列,等待刷新成功后重试
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
    //重新发起第一个失败的请求
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