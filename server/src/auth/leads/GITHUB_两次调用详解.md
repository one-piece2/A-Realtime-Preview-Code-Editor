# 🔄 GitHub 策略两次调用详解

## 📋 为什么会有两次调用？

GitHub OAuth 2.0 流程需要**两次 HTTP 请求**才能完成认证：

1. **第一次：** 用户点击登录 → 重定向到 GitHub
2. **第二次：** GitHub 回调 → 获取用户信息并验证

---

## 🔍 第一次调用：`GET /auth/github`

### 触发时机
用户点击 "使用 GitHub 登录" 按钮，访问：`GET http://localhost:3000/auth/github`

### 执行流程

```typescript
@Get('github')
@UseGuards(AuthGuard('github'))  // 🔒 触发 GitHub Strategy
async githubAuth() {
  // ⚠️ 这个方法实际上不会被执行！
  // Passport 会在执行这个方法之前就重定向了
}
```

### Passport 内部做了什么？

1. **AuthGuard('github') 拦截请求**
   - 检测到这是 OAuth 流程的**第一步**
   - 发现请求中没有 `code` 参数（授权码）

2. **Passport 自动构建授权 URL**
   ```
   https://github.com/login/oauth/authorize?
     client_id=你的_CLIENT_ID
     &redirect_uri=http://localhost:3000/auth/github/callback
     &scope=public_profile
     &state=随机字符串（防CSRF）
   ```

3. **自动重定向到 GitHub**
   - 浏览器跳转到 GitHub 授权页面
   - `githubAuth()` 方法**不会被执行**

### ⚠️ 重要：`validate()` 方法**不会**被调用

**原因：** 此时还没有用户信息，GitHub 还没有授权，所以无法调用 `validate()`。

---

## 🔍 第二次调用：`GET /auth/github/callback`

### 触发时机
用户在 GitHub 页面点击 "Authorize" 后，GitHub 重定向回：
```
GET http://localhost:3000/auth/github/callback?code=xxx&state=xxx
```

### 执行流程

```typescript
@Get('github/callback')
@UseGuards(AuthGuard('github'))  // 🔒 再次触发 GitHub Strategy
async githubCallback(@Req() req: Request, @Res() res: Response) {
  // ✅ 这个方法会执行
  // 此时 req.user 已经有用户信息了
}
```

### Passport 内部做了什么？

1. **AuthGuard('github') 拦截请求**
   - 检测到这是 OAuth 流程的**第二步**
   - 发现 URL 中有 `code` 参数（授权码）

2. **Passport 自动用 code 换取 access token**
   ```
   POST https://github.com/login/oauth/access_token
   Body: {
     client_id: 你的_CLIENT_ID,
     client_secret: 你的_CLIENT_SECRET,
     code: xxx  // 从 URL 参数中获取
   }
   ```
   返回：`access_token`

3. **Passport 自动用 access token 获取用户信息**
   ```
   GET https://api.github.com/user
   Headers: {
     Authorization: Bearer access_token
   }
   ```
   返回：`profile`（用户信息）

4. **调用 `GithubStrategy.validate()`** ✅
   ```typescript
   async validate(accessToken: string, refreshToken: string, profile: Profile) {
     // ✅ 这里才会被执行！
     // Passport 自动传入：
     // - accessToken: GitHub 的访问令牌
     // - refreshToken: GitHub 的刷新令牌（如果有）
     // - profile: GitHub 返回的用户信息
     
     const user = await this.authService.validateOAuthUser(profile);
     return user; // 自动附加到 req.user
   }
   ```

5. **继续执行 `githubCallback()` 方法**
   - 此时 `req.user` 已经有用户信息了
   - 生成 JWT Token
   - 重定向到前端

---

## 📊 两次调用对比表

| 特性 | 第一次调用 | 第二次调用 |
|------|----------|----------|
| **路由** | `GET /auth/github` | `GET /auth/github/callback` |
| **触发时机** | 用户点击登录按钮 | GitHub 授权后回调 |
| **URL 参数** | 无 | `?code=xxx&state=xxx` |
| **Passport 行为** | 构建授权 URL，重定向到 GitHub | 用 code 换 token，获取用户信息 |
| **`validate()` 是否执行** | ❌ **不执行** | ✅ **执行** |
| **控制器方法是否执行** | ❌ **不执行**（重定向了） | ✅ **执行** |
| **req.user** | 无 | ✅ 有用户信息 |

---

## 🔄 完整流程图

```
┌─────────────────────────────────────────────────────────┐
│  第一次调用：GET /auth/github                            │
├─────────────────────────────────────────────────────────┤
│ 1. AuthGuard('github') 拦截                              │
│ 2. 检测：没有 code 参数 → 这是第一步                     │
│ 3. Passport 构建授权 URL                                │
│ 4. 自动重定向到 GitHub                                   │
│ 5. ❌ validate() 不执行                                 │
│ 6. ❌ githubAuth() 不执行                               │
└─────────────────────────────────────────────────────────┘
                        ↓
              [用户在 GitHub 授权]
                        ↓
┌─────────────────────────────────────────────────────────┐
│  第二次调用：GET /auth/github/callback?code=xxx          │
├─────────────────────────────────────────────────────────┤
│ 1. AuthGuard('github') 拦截                              │
│ 2. 检测：有 code 参数 → 这是第二步                      │
│ 3. Passport 用 code 换取 access_token                   │
│ 4. Passport 用 access_token 获取 profile                │
│ 5. ✅ 调用 validate(accessToken, refreshToken, profile)  │
│ 6. ✅ validate() 返回 User → 附加到 req.user            │
│ 7. ✅ githubCallback() 执行                             │
│ 8. 生成 Token，重定向到前端                              │
└─────────────────────────────────────────────────────────┘
```

---

## 💡 关键理解

### 为什么第一次不执行 `validate()`？

**原因：** 此时还没有用户信息！

- 用户只是点击了登录按钮
- 还没有在 GitHub 授权
- GitHub 还没有返回用户信息
- 所以无法验证用户

### 为什么第二次才执行 `validate()`？

**原因：** 此时已经有完整的用户信息了！

- GitHub 已经授权
- Passport 已经用 code 换取了 access_token
- Passport 已经用 access_token 获取了 profile
- 现在可以验证并创建/查找用户了

---

## 🔍 代码执行顺序（第二次调用）

```
1. GET /auth/github/callback?code=xxx
   ↓
2. AuthGuard('github') 拦截
   ↓
3. Passport 检测到 code 参数
   ↓
4. Passport 用 code 换取 access_token（内部自动完成）
   ↓
5. Passport 用 access_token 获取 profile（内部自动完成）
   ↓
6. ✅ GithubStrategy.validate(accessToken, refreshToken, profile)
   ↓
7. validate() 调用 authService.validateOAuthUser(profile)
   ↓
8. validateOAuthUser() 调用 userService.findOrCreate()
   ↓
9. findOrCreate() 返回 User
   ↓
10. validate() 返回 User → Passport 附加到 req.user
   ↓
11. ✅ githubCallback() 方法执行
   ↓
12. 生成 Token，重定向到前端
```

---

## 📝 总结

### 第一次调用（`/auth/github`）
- **目的：** 启动 OAuth 流程，重定向到 GitHub
- **执行：** Passport 自动处理，不执行任何控制器方法
- **validate()：** ❌ 不执行（没有用户信息）

### 第二次调用（`/auth/github/callback`）
- **目的：** 处理 GitHub 回调，验证用户，生成 Token
- **执行：** Passport 获取用户信息后，执行控制器方法
- **validate()：** ✅ 执行（有完整的用户信息）

---

## 🎯 类比理解

可以把这个流程类比为：

1. **第一次：** 敲门（告诉 GitHub："我要登录"）
   - GitHub 说："请到我的授权页面确认"
   - 你跳转到 GitHub 页面

2. **第二次：** 带着授权书回来（GitHub 给你 code）
   - 后端用 code 换取"通行证"（access_token）
   - 用通行证获取你的身份信息（profile）
   - 验证身份，创建/查找用户（validate）
   - 给你系统内的 Token

---

**这就是 OAuth 2.0 的标准流程！** 🚀

