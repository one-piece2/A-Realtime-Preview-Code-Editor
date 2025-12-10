import { createContext } from 'react';
import { type User } from '@/types/users/type';
import { login as loginApi, register as registerApi, verifyToken, refreshToken as refreshTokenApi } from '@/api/auth/auth';
import { type LoginRequest, type RegisterRequest, type AuthResponse } from '@/api/auth/types';
import { useState, useEffect, type ReactNode } from 'react';
import { getToken, getUser, getRefreshToken, clearAuth, setAuth, setToken, setUser, setRefreshToken, removeToken, removeUser } from '@/utils/mannegerToken';

  export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    authError: string | null; // 认证错误信息，用于 UI 显示
  }
  export interface AuthContextType extends AuthState {
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, username: string, password: string) => Promise<void>;
    logout: () => void;
    setUser: (user: User | null) => void;
    setToken: (token: string | null) => void;
    setAuthState: (token: string, user: User, refreshToken: string) => void;
    clearAuthError: () => void; // 清除错误信息
  }

  export const AuthContext = createContext<AuthContextType >({}as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AuthState>({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      authError: null,
    });

  // 初始化：从 localStorage 恢复状态并验证 Token 有效性
  useEffect(() => {
    const initializeAuth = async () => {
      const token = getToken();
      const user = getUser();
      const refreshTokenValue = getRefreshToken();

      // 情况1：没有 token 或 user，直接清除并设为未认证
      if (!token || !user) {
        clearAuth();
        setState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          authError: null,
        });
        return;
      }

      // 情况2：有 token，尝试验证
      try {
        // 调用后端 /auth/me 验证 accessToken 是否有效
        // 注意：axios 拦截器不会对 /auth/me 的 401 错误自动刷新 token
        // 所以如果 accessToken 过期，会直接进入 catch 块
        const verifiedUser = await verifyToken();

        // accessToken 有效，更新状态
        setState({
          user: verifiedUser,
          token,
          isAuthenticated: true,
          isLoading: false,
          authError: null,
        });
      } catch (error) {
        // accessToken 无效或过期
        console.log('AccessToken 验证失败，尝试使用 RefreshToken 刷新...');

        // 情况2a：有 refreshToken，尝试刷新
        if (refreshTokenValue) {
          try {
            // 调用刷新接口获取新的 token
            const response = await refreshTokenApi(refreshTokenValue);

            // 刷新成功，保存新的 token 并更新状态
            setToken(response.accessToken);
            setRefreshToken(response.refreshToken);
            setUser(response.user);

            setState({
              user: response.user,
              token: response.accessToken,
              isAuthenticated: true,
              isLoading: false,
              authError: null,
            });
            console.log('Token 刷新成功！');
          } catch (refreshError) {
            // 情况2b：refreshToken 也过期了，清除所有认证信息
            console.log('RefreshToken 也过期了，需要重新登录');
            clearAuth();
            setState({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              authError: '登录已过期，请重新登录',
            });
          }
        } else {
          // 情况2c：没有 refreshToken，直接清除
          console.log('没有 RefreshToken，需要重新登录');
          clearAuth();
          setState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            authError: '登录状态无效，请重新登录',
          });
        }
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await loginApi({ email, password } as LoginRequest) as AuthResponse;
      setAuth(response.accessToken, response.user, response.refreshToken);
      setState({
        user: response.user,
        token: response.accessToken,
        isAuthenticated: true,
        isLoading: false,
        authError: null,
      });
    } catch (error) {
      throw error;
    }
  };

  const register = async (email: string, username: string, password: string) => {
    try {
      const response = await registerApi({ email, username, password } as RegisterRequest) as AuthResponse;
      setAuth(response.accessToken, response.user, response.refreshToken);
      setState({
        user: response.user,
        token: response.accessToken,
        isAuthenticated: true,
        isLoading: false,
        authError: null,
      });
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    clearAuth(); // 清除所有认证信息（包括 refreshToken）
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      authError: null,
    });
  };
  //设置用户状态：在localStorage中保存用户信息，在更新上下文状态时，更新用户状态
  const setUserState = (user: User | null) => {
    if (user) {
        //在localStorage中保存用户信息
      setUser(user);
    } else {
      //在localStorage中删除用户信息
      removeUser();
    }
    //在更新上下文状态时，更新用户状态
    setState(prev => ({ ...prev, user }));
  };
  //设置Token状态：在localStorage中保存Token，在更新上下文状态时，更新Token状态
  const setTokenState = (token: string | null) => {
    if (token) {
      setToken(token);
    } else {
      removeToken();
    }
    setState(prev => ({ ...prev, token, isAuthenticated: !!token }));
  };

  // OAuth 回调时直接设置认证状态（同时更新 localStorage 和 Context 状态）
  const setAuthState = (token: string, user: User, refreshToken: string) => {
    setAuth(token, user, refreshToken);
    setState({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
      authError: null,
    });
  };

  // 清除认证错误信息
  const clearAuthError = () => {
    setState(prev => ({ ...prev, authError: null }));
  };

    return (
        
        <AuthContext.Provider value={{...state, login, register, logout, setUser: setUserState, setToken: setTokenState, setAuthState, clearAuthError}}>
            {children}
        </AuthContext.Provider>
        
    )
  }