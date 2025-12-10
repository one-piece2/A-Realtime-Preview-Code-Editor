import { createContext } from 'react';
import { type User } from '@/types/users/type';

import { useState, useEffect, type ReactNode } from 'react';
import { getToken, setToken, removeToken, getUser, setUser, removeUser, clearAuth } from '@/utils/mannegerToken';
  export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
  }
  export interface AuthContextType extends AuthState {
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, username: string, password: string) => Promise<void>;
    logout: () => void;
    setUser: (user: User | null) => void;
    setToken: (token: string | null) => void;
  }

  export const AuthContext = createContext<AuthContextType >({}as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AuthState>({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
    });


  // 初始化：从 localStorage 恢复状态
  useEffect(() => {
    const token = getToken();
    const user = getUser();
    
    if (token && user) {
      setState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      //如果token或user不存在，则清除认证信息
      clearAuth();
      setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
    
  }, []);
const login = async (email: string, password: string) => {}

const register = async (email: string, username: string, password: string) => {
    // 实现注册逻辑
  };

  const logout = () => {
    removeToken();
    removeUser();
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };
  //设置用户状态
  const setUserState = (user: User | null) => {
    if (user) {
        //在localStorage中保存用户信息
      setUser(user);
    } else {
      //在localStorage中删除用户信息
      removeUser();
    }
    setState(prev => ({ ...prev, user }));
  };
  const setTokenState = (token: string | null) => {
    if (token) {
      setToken(token);
    } else {
      removeToken();
    }
    setState(prev => ({ ...prev, token, isAuthenticated: !!token }));
  };

    return (
        
        <AuthContext.Provider value={{...state, login, register, logout, setUser: setUserState, setToken: setTokenState}}>
            {children}
        </AuthContext.Provider>
        
    )
  }