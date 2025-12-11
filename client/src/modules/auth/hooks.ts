
  //Auth 模块 Hooks
 //UI 层通过这些 hooks 获取状态，禁止直接操作 store
 

import { useEffect } from 'react';
import { useAuthStore, authSelectors } from './store';
//useShallow  用于浅比较，避免不必要的重新渲染 即比较对象的属性值是否发生变化
import { useShallow } from 'zustand/react/shallow';


 //全部的Auth store里面的内容
export function useAuth() {
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    authError,
    login,
    register,
    logout,
    setAuthState,
    clearAuthError,
  } = useAuthStore(
    useShallow((state) => ({
      user: state.user,
      token: state.token,
      isAuthenticated: state.isAuthenticated,
      isLoading: state.isLoading,
      authError: state.authError,
      login: state.login,
      register: state.register,
      logout: state.logout,
      setAuthState: state.setAuthState,
      clearAuthError: state.clearAuthError,
    }))
  );

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    authError,
    login,
    register,
    logout,
    setAuthState,
    clearAuthError,
  };
}


 // 仅获取用户信息
 
export function useUser() {
  return useAuthStore(authSelectors.user);
}

//仅获取认证状态
export function useIsAuthenticated() {
  return useAuthStore(authSelectors.isAuthenticated);
}

//仅获取加载状态
export function useAuthLoading() {
  return useAuthStore(authSelectors.isLoading);
}

//仅获取认证错误
export function useAuthError() {
  const authError = useAuthStore(authSelectors.authError);
  const clearAuthError = useAuthStore((state) => state.clearAuthError);
  return { authError, clearAuthError };
}

//初始化认证状态的 Hook
// 应在 App 根组件中使用
export function useAuthInitializer() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const isLoading = useAuthStore(authSelectors.isLoading);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return { isLoading };
}

//登录操作 Hook
export function useLogin() {
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore(authSelectors.isLoading);
  const authError = useAuthStore(authSelectors.authError);
  const clearAuthError = useAuthStore((state) => state.clearAuthError);

  return { login, isLoading, authError, clearAuthError };
}

//注册操作 Hook
export function useRegister() {
  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore(authSelectors.isLoading);
  const authError = useAuthStore(authSelectors.authError);
  const clearAuthError = useAuthStore((state) => state.clearAuthError);

  return { register, isLoading, authError, clearAuthError };
}

//登出操作 Hook
export function useLogout() {
  return useAuthStore((state) => state.logout);
}
