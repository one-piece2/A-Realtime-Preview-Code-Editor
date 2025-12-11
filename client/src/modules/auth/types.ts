
 //Auth 模块类型定义


export interface User {
  id: string;
  email: string;
  username: string;
  githubNickname?: string | null;
  githubAvatar?: string | null;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
}

export interface AuthActions {
  // 认证操作
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  
  // 状态设置
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setAuthState: (token: string, user: User, refreshToken: string) => void;
  
  // 错误处理
  clearAuthError: () => void;
  setAuthError: (error: string | null) => void;
  
  // 初始化
  initializeAuth: () => Promise<void>;
  
  // 内部方法
  _setLoading: (loading: boolean) => void;
}

export type AuthStore = AuthState & AuthActions;

// API 请求类型
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}
