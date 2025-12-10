# 🔄 双 Token 无感刷新策略说明

## 📋 实现概述

已在前端预留了双 Token（accessToken + refreshToken）无感刷新策略的完整实现框架。

## 🎯 核心功能

### 1. Token 管理工具 (`mannegerToken.ts`)

已添加的方法：
- ✅ `setRefreshToken(refreshToken)` - 保存 refreshToken
- ✅ `getRefreshToken()` - 获取 refreshToken
- ✅ `removeRefreshToken()` - 移除 refreshToken
- ✅ `hasRefreshToken()` - 检查是否有 refreshToken
- ✅ `setAuth(token, user, refreshToken?)` - 一次性保存所有认证信息
- ✅ `clearAuth()` - 清除所有认证信息（包括 refreshToken）

### 2. Axios 拦截器 (`axios.ts`)

已实现的逻辑：
- ✅ **请求拦截器**：自动添加 accessToken 到请求头
- ✅ **响应拦截器**：检测 401 错误，自动刷新 token
- ✅ **请求队列**：防止并发请求时多次刷新
- ✅ **自动重试**：刷新成功后自动重试失败的请求

## 🔄 工作流程

```
1. 用户发起请求
   ↓
2. 请求拦截器添加 accessToken
   ↓
3. 服务器返回 401（token 过期）
   ↓
4. 响应拦截器检测到 401
   ↓
5. 检查是否有 refreshToken
   ├─ 有 → 调用刷新接口获取新 token
   │        ├─ 成功 → 保存新 token，重试原请求
   │        └─ 失败 → 清除认证信息，跳转登录
   └─ 无 → 清除认证信息，跳转登录
```

## 📝 待实现部分（后端）

### 刷新 Token 接口

**接口地址**: `POST /auth/refresh`

**请求参数**:
```typescript
{
  refreshToken: string;
}
```

**成功响应**:
```typescript
{
  accessToken: string;
  refreshToken?: string; // 可选，如果后端支持 refreshToken 轮换
  user?: {
    id: string;
    email: string;
    username: string;
    githubNickname?: string | null;
    githubAvatar?: string | null;
  };
}
```

**错误响应**:
- **401**: refreshToken 无效或过期
- **400**: 参数错误

### 代码位置

在 `client/src/utils/axios.ts` 的 `refreshAccessToken` 函数中：

```typescript
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  
  if (!refreshToken) {
    clearAuth();
    window.location.href = '/login';
    return null;
  }

  try {
    // TODO: 取消注释并实现以下代码
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken: refreshToken
    });
    
    const { accessToken, refreshToken: newRefreshToken } = response.data;
    
    // 保存新的 token
    setToken(accessToken);
    if (newRefreshToken) {
      setRefreshToken(newRefreshToken);
    }
    
    return accessToken;
  } catch (error) {
    clearAuth();
    window.location.href = '/login';
    return null;
  }
}
```

## 🎯 使用示例

### 登录成功后保存 Token

```typescript
import { setAuth } from '@/utils/mannegerToken';

// 登录成功后
const response = await loginApi({ email, password });
setAuth(
  response.accessToken,
  response.user,
  response.refreshToken // 如果有的话
);
```

### 检查是否已登录

```typescript
import { isAuthenticated, hasRefreshToken } from '@/utils/mannegerToken';

if (isAuthenticated()) {
  // 已登录
}

if (hasRefreshToken()) {
  // 有 refreshToken，可以自动刷新
}
```

### 退出登录

```typescript
import { clearAuth } from '@/utils/mannegerToken';

clearAuth(); // 清除所有认证信息
```

## ⚠️ 注意事项

1. **并发请求处理**：已实现请求队列，防止多个请求同时触发刷新
2. **错误处理**：刷新失败会自动清除认证信息并跳转登录
3. **Token 存储**：使用 localStorage，注意 XSS 防护
4. **后端实现**：需要实现 `/auth/refresh` 接口

## 🔐 安全建议

1. **refreshToken 过期时间**：建议设置为 7-30 天
2. **accessToken 过期时间**：建议设置为 15 分钟
3. **Token 轮换**：后端可以实现 refreshToken 轮换机制
4. **HTTPS**：生产环境必须使用 HTTPS

---

**文档版本**: v1.0  
**状态**: 前端框架已完成，等待后端实现刷新接口

<!-- 在axios里面判断 if (originalRequest.url?.includes('/auth/me')) {
      return Promise.reject(error);
    } -->

    作用：
    ┌─────────────────────────────────────────────────────────────────┐
│                    用户打开网页                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              AuthContext 初始化 (useEffect)                      │
│  检查 localStorage 是否有 token、user、refreshToken              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
              ┌───────────────┴───────────────┐
              ↓                               ↓
    ┌─────────────────┐             ┌─────────────────┐
    │ 没有 token/user │             │ 有 token/user   │
    │ → 清除认证      │             │ → 调用 /auth/me │
    │ → 跳转登录页    │             │   验证 token    │
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
                                    └─────────────────┘             │ → 跳转登录页     │
                                              ↓                     └─────────────────┘
                              ┌───────────────┴───────────────┐
                              ↓                               ↓
                    ┌─────────────────┐             ┌─────────────────┐
                    │ 刷新成功        │             │ 刷新失败        │
                    │ → 保存新 token  │             │ refreshToken过期│
                    │ → 设置已认证    │             │ → 清除认证      │
                    │ → 显示主页      │             │ → 跳转登录页    │
                    └─────────────────┘             └─────────────────┘

                    用户打开网页
    ↓
AuthContext 初始化，发现 localStorage 有 token
    ↓
调用 /auth/me 验证 token
    ↓
后端返回 401（accessToken 过期了）
    ↓
axios 拦截器捕获 401
    ↓
检测到是 /auth/me 请求
    ↓
直接抛出错误，不刷新 token ← 关键！
    ↓
AuthContext 的 catch 块捕获错误
    ↓
AuthContext 可以：
  - 尝试用 refreshToken 刷新（可控）
  - 或者直接清除认证，跳转登录
  - 显示友好的提示信息