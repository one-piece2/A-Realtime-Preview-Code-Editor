/**
 * Token 管理工具
 * 使用 localStorage 存储 accessToken、refreshToken 和用户信息
 * 支持双 Token 无感刷新策略 + 过期时间判断
 */
import { type User } from '@/types/users/type';
const TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';


export function setToken(token: string): void {
    if (!token) {
        console.warn('Token is empty, not saving');
        return;
    }
    localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}


export function removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
}

/**
 * 保存用户信息
 * @param user - 用户信息对象
 */
export function setUser(user: User): void {
    if (!user) {
        console.warn('User is empty, not saving');
        return;
    }

    localStorage.setItem(USER_KEY, JSON.stringify(user));
}


export function getUser(): User | null {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) {
        return null;
    }
    try {
        //把字符串转换为User类型
        return JSON.parse(userStr);
    } catch (error) {
        console.error('Failed to parse user data:', error);
        // 如果解析失败，清除无效数据
        removeUser();
        return null;
    }
}


export function removeUser(): void {
    localStorage.removeItem(USER_KEY);
}


export function isAuthenticated(): boolean {
    const token = getToken();
    return !!token;
}

/**
 * 保存 Refresh Token
 * @param refreshToken - JWT refreshToken
 */
export function setRefreshToken(refreshToken: string): void {
    if (!refreshToken) {
        console.warn('RefreshToken is empty, not saving');
        return;
    }
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

/**
 * 获取 Refresh Token
 * @returns refreshToken 或 null
 */
export function getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * 移除 Refresh Token
 */
export function removeRefreshToken(): void {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
}


 //清除所有认证信息（AccessToken + RefreshToken + 用户信息）
 
export function clearAuth(): void {
    removeToken();
    removeRefreshToken();
    removeUser();
}


 //保存认证信息（AccessToken + RefreshToken + 用户信息）
export function setAuth(token: string, user: User, refreshToken: string): void {
    setToken(token);
    if (refreshToken) {
        setRefreshToken(refreshToken);
    }
    setUser(user);
}


 //检查是否有 Refresh Token

export function hasRefreshToken(): boolean {
    const refreshToken = getRefreshToken();
    return !!refreshToken;
}