export interface LoginRequest {
    email: string;
    password: string;
  }
  
  export interface RegisterRequest {
    email: string;
    username: string;
    password: string;
  }
  
  export interface User {
    id: string;
    email: string;
    username: string;
    githubNickname?: string | null;
    githubAvatar?: string | null;
  }
  
  export interface AuthResponse {
    refreshToken: string;
    accessToken: string;
    user: User;
  }