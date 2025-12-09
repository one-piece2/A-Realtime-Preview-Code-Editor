# 🔐 认证接口文档

## 📋 基础信息

- **Base URL**: `http://localhost:3000`
- **API 前缀**: `/auth`
- **Content-Type**: `application/json`
- **认证方式**: JWT Bearer Token（部分接口需要）

---

## 📌 接口列表

### 1. 本地注册接口

**接口地址**: `POST /auth/register/local`

**接口描述**: 用户使用邮箱、用户名和密码进行注册，注册成功后自动登录并返回 JWT Token。

**请求头**:
```
Content-Type: application/json
```

**请求参数** (Body):

| 参数名 | 类型 | 必填 | 说明 | 验证规则 |
|--------|------|------|------|----------|
| email | string | 是 | 用户邮箱 | 必须是有效的邮箱格式 |
| username | string | 是 | 用户名 | 2-50个字符 |
| password | string | 是 | 密码 | 6-100个字符 |

**请求示例**:
```json
{
  "email": "user@example.com",
  "username": "testuser",
  "password": "123456"
}
```

**成功响应** (HTTP 201 Created):

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "testuser",
    "githubNickname": null,
    "githubAvatar": null
  }
}
```

**响应字段说明**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| accessToken | string | JWT 访问令牌，用于后续请求认证 |
| user | object | 用户信息对象 |
| user.id | string | 用户唯一标识（UUID） |
| user.email | string | 用户邮箱 |
| user.username | string | 用户名 |
| user.githubNickname | string \| null | GitHub 昵称（本地注册为 null） |
| user.githubAvatar | string \| null | GitHub 头像（本地注册为 null） |

**错误响应** (HTTP 400 Bad Request):

```json
{
  "statusCode": 400,
  "message": [
    "邮箱格式不正确",
    "用户名至少需要2个字符",
    "密码至少需要6个字符"
  ],
  "error": "Bad Request"
}
```

**错误响应** (HTTP 409 Conflict - 邮箱已存在):

```json
{
  "statusCode": 409,
  "message": "该邮箱已被注册",
  "error": "Conflict"
}
```

---

### 2. 本地登录接口

**接口地址**: `POST /auth/login/local`

**接口描述**: 用户使用邮箱和密码进行登录，登录成功后返回 JWT Token 和用户信息。

**请求头**:
```
Content-Type: application/json
```

**请求参数** (Body):

| 参数名 | 类型 | 必填 | 说明 | 验证规则 |
|--------|------|------|------|----------|
| email | string | 是 | 用户邮箱 | 必须是有效的邮箱格式 |
| password | string | 是 | 密码 | 至少6个字符 |

**请求示例**:
```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

**成功响应** (HTTP 200 OK):

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "testuser",
    "githubNickname": null,
    "githubAvatar": null
  }
}
```

**响应字段说明**: 同注册接口

**错误响应** (HTTP 400 Bad Request - 参数验证失败):

```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be longer than or equal to 6 characters"
  ],
  "error": "Bad Request"
}
```

**错误响应** (HTTP 401 Unauthorized - 邮箱或密码错误):

```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

---

### 3. GitHub 登录接口

**接口地址**: `GET /auth/github`

**接口描述**: 重定向到 GitHub 授权页面，用户授权后自动回调并完成登录/注册。

**请求方式**: 浏览器直接访问或前端重定向

**请求示例**:
```
GET http://localhost:3000/auth/github
```

**流程说明**:
1. 用户访问此接口
2. 后端自动重定向到 GitHub 授权页面
3. 用户在 GitHub 页面点击授权
4. GitHub 回调到 `/auth/github/callback`
5. 后端处理用户信息并重定向到前端，URL 中携带 Token

**GitHub 回调重定向** (自动处理):
```
GET /auth/github/callback?code=xxx&state=xxx
```

**前端接收回调**:
```
GET http://localhost:5173/auth/callback?token=xxx&refresh=
```

**URL 参数说明**:

| 参数名 | 类型 | 说明 |
|--------|------|------|
| token | string | JWT 访问令牌 |
| refresh | string | 刷新令牌（当前为空） |

**前端处理示例** (React):
```typescript
// 在 /auth/callback 页面
const params = new URLSearchParams(window.location.search);
const token = params.get('token');
if (token) {
  // 保存 token 到 localStorage
  localStorage.setItem('accessToken', token);
  // 跳转到首页
  window.location.href = '/';
}
```

**注意**: 
- 此接口不需要请求体
- 此接口会触发浏览器重定向
- 首次使用 GitHub 登录会自动注册账号
- 再次使用会直接登录

---

## 🔑 Token 使用说明

### Token 存储

登录成功后，前端需要保存 `accessToken`：

```typescript
// 保存到 localStorage
localStorage.setItem('accessToken', response.accessToken);
```

### Token 使用

后续需要认证的接口，需要在请求头中携带 Token：

```
Authorization: Bearer <accessToken>
```

**示例**:
```typescript
fetch('http://localhost:3000/api/protected', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    'Content-Type': 'application/json'
  }
})
```

### Token 过期

- Token 默认过期时间：15分钟（可在环境变量 `JWT_EXPIRES_IN` 中配置）
- Token 过期后，需要重新登录

---

## 📝 完整请求示例

### 注册示例 (JavaScript/TypeScript)

```typescript
async function register(email: string, username: string, password: string) {
  try {
    const response = await fetch('http://localhost:3000/auth/register/local', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        username,
        password,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '注册失败');
    }

    const data = await response.json();
    
    // 保存 token
    localStorage.setItem('accessToken', data.accessToken);
    
    // 保存用户信息
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  } catch (error) {
    console.error('注册失败:', error);
    throw error;
  }
}
```

### 登录示例 (JavaScript/TypeScript)

```typescript
async function login(email: string, password: string) {
  try {
    const response = await fetch('http://localhost:3000/auth/login/local', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '登录失败');
    }

    const data = await response.json();
    
    // 保存 token
    localStorage.setItem('accessToken', data.accessToken);
    
    // 保存用户信息
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  } catch (error) {
    console.error('登录失败:', error);
    throw error;
  }
}
```

### GitHub 登录示例 (React)

```typescript
// 跳转到 GitHub 登录
const handleGitHubLogin = () => {
  window.location.href = 'http://localhost:3000/auth/github';
};

// 在回调页面处理
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  
  if (token) {
    localStorage.setItem('accessToken', token);
    // 跳转到首页
    window.location.href = '/';
  }
}, []);
```

---

## ⚠️ 错误码说明

| HTTP 状态码 | 说明 | 处理建议 |
|------------|------|----------|
| 200 | 成功 | 正常处理响应数据 |
| 201 | 创建成功 | 注册成功，保存 token |
| 400 | 请求参数错误 | 检查请求参数格式和验证规则 |
| 401 | 未授权 | 邮箱或密码错误，提示用户重新输入 |
| 409 | 冲突 | 邮箱已存在，提示用户使用其他邮箱或直接登录 |

---

## 📋 表单验证规则总结

### 注册表单

| 字段 | 规则 | 错误提示 |
|------|------|----------|
| email | 必须是有效邮箱格式 | "邮箱格式不正确" |
| username | 2-50个字符 | "用户名至少需要2个字符" / "用户名不能超过50个字符" |
| password | 6-100个字符 | "密码至少需要6个字符" / "密码不能超过100个字符" |

### 登录表单

| 字段 | 规则 | 错误提示 |
|------|------|----------|
| email | 必须是有效邮箱格式 | "email must be an email" |
| password | 至少6个字符 | "password must be longer than or equal to 6 characters" |

---

## 🎨 UI 设计建议

### 注册页面

**必填字段**:
- 邮箱输入框（带邮箱格式验证）
- 用户名输入框（2-50字符）
- 密码输入框（6-100字符，建议显示密码强度）
- 注册按钮

**可选功能**:
- 密码确认输入框
- 显示/隐藏密码按钮
- 实时表单验证提示
- "已有账号？去登录" 链接

### 登录页面

**必填字段**:
- 邮箱输入框
- 密码输入框
- 登录按钮

**可选功能**:
- "记住我" 复选框
- "忘记密码" 链接
- "没有账号？去注册" 链接
- GitHub 登录按钮（跳转到 `/auth/github`）

### GitHub 登录按钮

```html
<a href="http://localhost:3000/auth/github">
  <button>使用 GitHub 登录</button>
</a>
```

或使用 JavaScript 跳转：
```javascript
window.location.href = 'http://localhost:3000/auth/github';
```

---

## 🔄 完整流程示例

### 注册流程

```
1. 用户填写注册表单
   ↓
2. 前端验证表单（邮箱格式、长度等）
   ↓
3. 发送 POST /auth/register/local
   ↓
4. 后端验证并创建用户
   ↓
5. 返回 accessToken 和用户信息
   ↓
6. 前端保存 token 到 localStorage
   ↓
7. 跳转到首页或仪表板
```

### 登录流程

```
1. 用户填写登录表单
   ↓
2. 前端验证表单（邮箱格式、密码长度）
   ↓
3. 发送 POST /auth/login/local
   ↓
4. 后端验证邮箱和密码
   ↓
5. 返回 accessToken 和用户信息
   ↓
6. 前端保存 token 到 localStorage
   ↓
7. 跳转到首页或仪表板
```

### GitHub 登录流程

```
1. 用户点击 "使用 GitHub 登录" 按钮
   ↓
2. 跳转到 GET /auth/github
   ↓
3. 后端重定向到 GitHub 授权页面
   ↓
4. 用户在 GitHub 页面点击授权
   ↓
5. GitHub 回调到 /auth/github/callback
   ↓
6. 后端处理用户信息（自动注册或登录）
   ↓
7. 重定向到前端 /auth/callback?token=xxx
   ↓
8. 前端提取 token 并保存
   ↓
9. 跳转到首页或仪表板
```

---

## 📌 注意事项

1. **CORS 配置**: 后端已配置 CORS，允许 `http://localhost:5173` 跨域请求
2. **Token 安全**: 
   - 不要将 token 存储在 cookie 中（除非设置了 HttpOnly）
   - 生产环境建议使用 HTTPS
   - Token 过期后需要重新登录
3. **错误处理**: 
   - 所有接口都可能返回错误，前端需要处理各种错误情况
   - 建议统一错误处理机制
4. **GitHub 登录**: 
   - 首次登录会自动注册账号
   - 需要用户在 GitHub 开发者设置中配置正确的回调 URL

---

## 🚀 快速开始

### 1. 测试注册接口

```bash
curl -X POST http://localhost:3000/auth/register/local \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "123456"
  }'
```

### 2. 测试登录接口

```bash
curl -X POST http://localhost:3000/auth/login/local \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "123456"
  }'
```

### 3. 测试 GitHub 登录

直接在浏览器访问：
```
http://localhost:3000/auth/github
```

---

## 📞 技术支持

如有问题，请检查：
1. 后端服务是否正常运行（默认端口 3000）
2. 数据库连接是否正常
3. 环境变量配置是否正确
4. CORS 配置是否允许前端域名

---

**文档版本**: v1.0  
**最后更新**: 2024

