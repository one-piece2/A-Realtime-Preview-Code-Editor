# 双 Token 认证系统完整文档

## 一、系统概述

### 1.1 什么是双 Token 认证？

| Token 类型 | 用途 | 有效期 | 存储位置 |
|-----------|------|--------|----------|
| **Access Token** | 访问受保护的 API | 短（如 15分钟~1小时） | localStorage |
| **Refresh Token** | 刷新 Access Token | 长（如 7天~30天） | localStorage |

### 1.2 为什么需要双 Token？

- **安全性**：Access Token 有效期短，即使泄露影响有限
- **用户体验**：Refresh Token 有效期长，用户无需频繁登录
- **灵活性**：可以随时撤销 Refresh Token 强制用户重新登录

---

## 二、技术架构

### 2.1 后端（NestJS）

```
server/src/auth/
├── auth.controller.ts   # 认证路由（登录、注册、刷新、GitHub OAuth）
├── auth.service.ts      # 认证逻辑（生成 Token、验证 Token）
└── strategies/          # Passport 策略
```

### 2.2 前端（React + TypeScript）

```
client/src/
├── api/auth/auth.ts              # API 调用函数
├── Context/AuthContext/          # 认证状态管理
│   ├── AuthContext.tsx           # Context Provider
│   └── useAuth.ts                # 自定义 Hook
├── utils/
│   ├── axios.ts                  # Axios 实例 + 拦截器
│   └── mannegerToken.ts          # Token 存储管理
└── pages/
    ├── Login.tsx                 # 登录页
    └── AuthCallback.tsx          # OAuth 回调页
```

---

## 三、核心代码实现

### 3.1 后端：生成双 Token

**文件**：`server/src/auth/auth.service.ts`

```typescript
async generateTokens(user: User): Promise<AuthResponse> {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    username: user.username,
    githubNickname: user.githubNickname || undefined,
    githubAvatar: user.githubAvatar || undefined,
  };

  // Access Token：使用默认 secret 和较短有效期
  const accessToken = this.jwtService.sign(payload);

  // Refresh Token：使用独立 secret 和较长有效期
  const refreshToken = this.jwtService.sign(payload, {
    secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
    expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
  });

  return { accessToken, refreshToken, user: { ... } };
}
```

### 3.2 后端：刷新 Token 接口

**文件**：`server/src/auth/auth.controller.ts`

```typescript
@Public()
@Post('refresh')
async refresh(@Body('refreshToken') refreshToken: string) {
  return this.authService.refreshToken(refreshToken);
}
```

**文件**：`server/src/auth/auth.service.ts`

```typescript
async refreshToken(refreshToken: string): Promise<AuthResponse> {
  try {
    // 使用 Refresh Token 专用的 secret 验证
    const payload = this.jwtService.verify(refreshToken, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
    }) as JwtPayload;

    const user = await this.userService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');

    // 生成新的 Token 对
    return await this.generateTokens(user);
  } catch (error) {
    throw new UnauthorizedException('Invalid refresh token');
  }
}
```

### 3.3 前端：Token 存储管理

**文件**：`client/src/utils/mannegerToken.ts`

```typescript
const TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const removeToken = () => localStorage.removeItem(TOKEN_KEY);

export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);
export const setRefreshToken = (token: string) => localStorage.setItem(REFRESH_TOKEN_KEY, token);
export const removeRefreshToken = () => localStorage.removeItem(REFRESH_TOKEN_KEY);

export const getUser = () => { ... };
export const setUser = (user: User) => { ... };
export const removeUser = () => localStorage.removeItem(USER_KEY);

// 一次性设置所有认证信息
export const setAuth = (token: string, user: User, refreshToken: string) => {
  setToken(token);
  setRefreshToken(refreshToken);
  setUser(user);
};

// 一次性清除所有认证信息
export const clearAuth = () => {
  removeToken();
  removeRefreshToken();
  removeUser();
};
```

### 3.4 前端：Axios 拦截器

**文件**：`client/src/utils/axios.ts`

```typescript
// 请求拦截器：自动添加 Token
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：处理 401 错误和自动刷新
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // ⚠️ 关键：/auth/me 请求不触发刷新逻辑
    if (originalRequest.url?.includes('/auth/me')) {
      return Promise.reject(error);
    }

    // 401 错误且未重试过
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      isRefreshing = true;

      const newToken = await refreshAccessToken();
      processQueue(null, newToken);
      isRefreshing = false;

      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } else {
        clearAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);
```

### 3.5 前端：AuthContext 初始化

**文件**：`client/src/Context/AuthContext/AuthContext.tsx`

```typescript
useEffect(() => {
  const initializeAuth = async () => {
    const token = getToken();
    const user = getUser();
    const refreshTokenValue = getRefreshToken();

    // 情况1：没有 token，直接设为未认证
    if (!token || !user) {
      clearAuth();
      setState({ ...未认证状态 });
      return;
    }

    // 情况2：有 token，验证是否有效
    try {
      const verifiedUser = await verifyToken(); // 调用 /auth/me
      setState({ ...已认证状态 });
    } catch (error) {
      // Access Token 过期，尝试刷新
      if (refreshTokenValue) {
        try {
          const response = await refreshTokenApi(refreshTokenValue);
          // 保存新 token，设为已认证
          setToken(response.accessToken);
          setRefreshToken(response.refreshToken);
          setState({ ...已认证状态 });
        } catch {
          // Refresh Token 也过期
          clearAuth();
          setState({ ...未认证状态, authError: '登录已过期，请重新登录' });
        }
      } else {
        clearAuth();
        setState({ ...未认证状态, authError: '登录状态无效，请重新登录' });
      }
    }
  };

  initializeAuth();
}, []);
```

---

## 四、完整流程图

### 4.1 用户打开网页（已登录状态）

```
┌─────────────────────────────────────────────────────────────────┐
│                    用户打开网页                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              AuthContext 初始化 (useEffect)                      │
│  从 localStorage 读取 token、user、refreshToken                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
              ┌───────────────┴───────────────┐
              ↓                               ↓
    ┌─────────────────┐             ┌─────────────────┐
    │ 没有 token/user │             │ 有 token/user   │
    │ → 清除认证      │             │ → 调用 /auth/me │
    │ → 显示登录页    │             │   验证 token    │
    └─────────────────┘             └─────────────────┘
                                              ↓
                              ┌───────────────┴───────────────┐
                              ↓                               ↓
                    ┌─────────────────┐             ┌─────────────────┐
                    │ 验证成功 (200)  │             │ 验证失败 (401)  │
                    │ → 设置已认证    │             │ accessToken过期 │
                    │ → 显示主页      │             └─────────────────┘
                    └─────────────────┘                       ↓
                                              ┌───────────────┴───────────────┐
                                              ↓                               ↓
                                    ┌─────────────────┐             ┌─────────────────┐
                                    │ 有 refreshToken │             │ 没有 refreshToken│
                                    │ → 调用 /refresh │             │ → 清除认证       │
                                    └─────────────────┘             │ → 显示登录页     │
                                              ↓                     │ → 显示错误提示   │
                              ┌───────────────┴───────────────┐     └─────────────────┘
                              ↓                               ↓
                    ┌─────────────────┐             ┌─────────────────┐
                    │ 刷新成功        │             │ 刷新失败        │
                    │ → 保存新 token  │             │ refreshToken过期│
                    │ → 设置已认证    │             │ → 清除认证      │
                    │ → 显示主页      │             │ → 显示登录页    │
                    └─────────────────┘             │ → 显示错误提示  │
                                                    └─────────────────┘
```

### 4.2 普通 API 请求（Token 过期）

```
发起 API 请求（如获取项目列表）
    ↓
请求拦截器自动添加 Authorization: Bearer <accessToken>
    ↓
后端返回 401（accessToken 过期）
    ↓
响应拦截器捕获 401
    ↓
调用 refreshAccessToken() 刷新
    ↓
┌─────────────────┬─────────────────┐
↓                 ↓                 ↓
刷新成功          刷新失败          没有 refreshToken
↓                 ↓                 ↓
保存新 token      clearAuth()       clearAuth()
↓                 ↓                 ↓
重试原请求        跳转登录页        跳转登录页
```

---

## 五、遇到的问题与解决方案

### 5.1 问题：无限循环刷新

**现象**：`/auth/me` 返回 401 时，触发刷新逻辑，刷新后又调用 `/auth/me`，循环往复。

**原因**：axios 拦截器对所有 401 错误都尝试刷新 token。

**解决方案**：在拦截器中排除 `/auth/me` 请求：

```typescript
// 对于 /auth/me 验证请求，直接抛出错误，让调用方（AuthContext）处理
if (originalRequest.url?.includes('/auth/me')) {
  return Promise.reject(error);
}
```

### 5.2 问题：重复重定向到登录页

**现象**：Token 过期时，页面跳转两次到登录页。

**原因**：
1. `refreshAccessToken()` 函数里有 `window.location.href = '/login'`
2. 拦截器里也有 `window.location.href = '/login'`
3. AuthContext 里可能也有跳转逻辑

**解决方案**：
- `refreshAccessToken()` 只返回 `null`，不做跳转
- 跳转逻辑统一在拦截器的最终处理处

```typescript
// refreshAccessToken 只负责刷新，不负责跳转
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;  // 不跳转

  try {
    const response = await axios.post(...);
    return response.data.accessToken;
  } catch {
    return null;  // 不跳转
  }
}
```

### 5.3 问题：刷新接口触发拦截器

**现象**：AuthContext 调用 `refreshTokenApi()` 时，如果 refreshToken 过期，会触发拦截器的刷新逻辑，导致混乱。

**原因**：`refreshTokenApi()` 使用了带拦截器的 `api` 实例。

**解决方案**：刷新接口使用原生 axios，不走拦截器：

```typescript
// 刷新 Token（使用原生 axios，不走拦截器，避免循环调用）
export async function refreshToken(refreshTokenValue: string): Promise<AuthResponse> {
  const response = await axios.post<AuthResponse>(`${API_BASE_URL}/auth/refresh`, { 
    refreshToken: refreshTokenValue 
  });
  return response.data;
}
```

### 5.4 问题：错误提示被覆盖

**现象**：设置了 `authError` 但用户看不到提示。

**原因**：`window.location.href = '/login'` 会刷新页面，导致 React 状态丢失。

**解决方案**：
1. 在 AuthContext 中设置 `authError` 状态
2. 由路由守卫（PrivateRoute）处理跳转，不使用 `window.location`
3. 登录页从 AuthContext 读取 `authError` 并显示

```typescript
// AuthContext
setState({
  ...未认证状态,
  authError: '登录已过期，请重新登录',
});

// Login.tsx
const { authError, clearAuthError } = useAuth();

{authError && (
  <div className="alert">
    {authError}
    <button onClick={clearAuthError}>×</button>
  </div>
)}
```

---

## 六、环境变量配置

### 6.1 后端 `.env`

```env
# JWT 配置
JWT_SECRET=your-access-token-secret
JWT_EXPIRES_IN=1h

# Refresh Token 配置（独立的 secret）
JWT_REFRESH_SECRET=your-refresh-token-secret-different-from-access
JWT_REFRESH_EXPIRES_IN=7d
```

### 6.2 前端 `.env`

```env
VITE_API_BASE_URL=http://localhost:3000
```

---

## 七、安全建议

1. **Access Token 和 Refresh Token 使用不同的 Secret**
2. **Refresh Token 有效期不宜过长**（建议 7-30 天）
3. **考虑实现 Refresh Token 轮换**（每次刷新后旧 token 失效）
4. **敏感操作要求重新验证**（如修改密码、删除账户）
5. **生产环境使用 HTTPS**
6. **考虑使用 HttpOnly Cookie 存储 Refresh Token**（更安全）

---

## 八、文件清单

| 文件路径 | 作用 |
|---------|------|
| `server/src/auth/auth.service.ts` | 生成双 Token、刷新 Token |
| `server/src/auth/auth.controller.ts` | `/auth/refresh` 接口 |
| `client/src/utils/axios.ts` | Axios 拦截器、自动刷新 |
| `client/src/utils/mannegerToken.ts` | Token 存储管理 |
| `client/src/api/auth/auth.ts` | API 调用函数 |
| `client/src/Context/AuthContext/AuthContext.tsx` | 认证状态管理 |
| `client/src/pages/Login.tsx` | 登录页、显示错误提示 |
| `client/src/pages/AuthCallback.tsx` | OAuth 回调处理 |

---

**文档版本**: v2.0  
**最后更新**: 2025-12-10  
**状态**: ✅ 已完成并测试
