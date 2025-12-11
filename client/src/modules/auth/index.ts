/**
 * Auth 模块导出
 */

// Store
export { useAuthStore, authSelectors } from './store';

// Hooks
export {
  useAuth,
  useUser,
  useIsAuthenticated,
  useAuthLoading,
  useAuthError,
  useAuthInitializer,
  useLogin,
  useRegister,
  useLogout,
} from './hooks';

// Types
export type {
  User,
  AuthState,
  AuthActions,
  AuthStore,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
} from './types';

// Services (仅导出必要的)
export { loginWithGitHub } from './services';
