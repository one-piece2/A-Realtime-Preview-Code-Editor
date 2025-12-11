
//Auth 模块 Zustand Store
import { create } from 'zustand';
import { devtools,persist } from 'zustand/middleware';
import { registerStore } from '@/core/store';
import type { AuthStore, AuthState } from './types';
import {
  loginApi,
  registerApi,
  validateAndRestoreAuth,
  storageService,
} from './services';

// 初始状态
const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  authError: null,
};

// 创建 Auth Store
export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
    (set) => ({
      ...initialState,

    //  认证操作
      
      login: async (email: string, password: string) => {
        set({ isLoading: true, authError: null });
        try {
          const response = await loginApi({ email, password });
          storageService.setAuth(response.accessToken, response.user, response.refreshToken);
          set({
            user: response.user,
            token: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            authError: null,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            authError: error?.response?.data?.message || '登录失败',
          });
          throw error;
        }
      },

      register: async (email: string, username: string, password: string) => {
        set({ isLoading: true, authError: null });
        try {
          const response = await registerApi({ email, username, password });
          storageService.setAuth(response.accessToken, response.user, response.refreshToken);
          set({
            user: response.user,
            token: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            authError: null,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            authError: error?.response?.data?.message || '注册失败',
          });
          throw error;
        }
      },

      logout: () => {
        storageService.clearAuth();
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          authError: null,
        });
      },

      // 状态设置

      setUser: (user) => {
        if (user) {
          storageService.setUser(user);
        } else {
          storageService.removeUser();
        }
        set({ user });
      },

      setToken: (token) => {
        if (token) {
          storageService.setToken(token);
        } else {
          storageService.removeToken();
        }
        set({ token, isAuthenticated: !!token });
      },

      setAuthState: (token, user, refreshToken) => {
        storageService.setAuth(token, user, refreshToken);
        set({
          user,
          token,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
          authError: null,
        });
      },

      // 错误处理 

      clearAuthError: () => {
        set({ authError: null });
      },

      setAuthError: (error) => {
        set({ authError: error });
      },

      // 初始化
      initializeAuth: async () => {
        set({ isLoading: true });
        
        const result = await validateAndRestoreAuth();
        
        if (result.isValid) {
          set({
            user: result.user,
            token: result.token,
            isAuthenticated: true,
            isLoading: false,
            authError: null,
          });
        } else {
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            authError: result.error || null,
          });
        }
      },

      // 内部方法

      _setLoading: (loading) => {
        set({ isLoading: loading });
      },
    }),
    { name: 'auth-store' }
  )
)
);

// 注册到全局 store registry
registerStore('auth', useAuthStore);

// 导出选择器（用于避免不必要的重渲染）
export const authSelectors = {
  user: (state: AuthStore) => state.user,
  token: (state: AuthStore) => state.token,
  isAuthenticated: (state: AuthStore) => state.isAuthenticated,
  isLoading: (state: AuthStore) => state.isLoading,
  authError: (state: AuthStore) => state.authError,
};
