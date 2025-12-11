/**
 * 兼容层 - 提供与旧 AuthContext 相同的接口
 * 用于渐进式迁移，迁移完成后可删除此文件
 */

import { useAuthStore } from './store';
import { useShallow } from 'zustand/react/shallow';

/**
 * 兼容旧的 AuthContext 接口
 * 用于快速迁移，后续应逐步替换为更细粒度的 hooks
 */
export function useAuthCompat() {
  return useAuthStore(
    useShallow((state) => ({
      // State
      user: state.user,
      token: state.token,
      isAuthenticated: state.isAuthenticated,
      isLoading: state.isLoading,
      authError: state.authError,
      
      // Actions
      login: state.login,
      register: state.register,
      logout: state.logout,
      setUser: state.setUser,
      setToken: state.setToken,
      setAuthState: state.setAuthState,
      clearAuthError: state.clearAuthError,
    }))
  );
}
