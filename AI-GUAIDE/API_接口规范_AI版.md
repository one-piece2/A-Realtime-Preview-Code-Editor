# 🔐 认证接口规范（AI 生成界面专用）

## 📋 接口基础信息

- **Base URL**: `http://localhost:3000`
- **API 前缀**: `/auth`
- **Content-Type**: `application/json`

---

## 1️⃣ 注册接口

### 接口信息
- **URL**: `POST /auth/register/local`
- **需要认证**: ❌ 否
- **状态码**: 201 Created

### 请求参数
```typescript
{
  email: string;      // 邮箱，必填，邮箱格式
  username: string;  // 用户名，必填，2-50字符
  password: string;  // 密码，必填，6-100字符
}
```

### 成功响应
```typescript
{
  accessToken: string;  // JWT Token
  user: {
    id: string;
    email: string;
    username: string;
    githubNickname: string | null;
    githubAvatar: string | null;
  }
}
```

### 错误响应
- **400**: 参数验证失败
  ```json
  {
    "statusCode": 400,
    "message": ["邮箱格式不正确", "用户名至少需要2个字符"],
    "error": "Bad Request"
  }
  ```
- **409**: 邮箱已存在
  ```json
  {
    "statusCode": 409,
    "message": "该邮箱已被注册",
    "error": "Conflict"
  }
  ```

---

## 2️⃣ 登录接口

### 接口信息
- **URL**: `POST /auth/login/local`
- **需要认证**: ❌ 否
- **状态码**: 200 OK

### 请求参数
```typescript
{
  email: string;     // 邮箱，必填，邮箱格式
  password: string;   // 密码，必填，至少6字符
}
```

### 成功响应
```typescript
{
  accessToken: string;  // JWT Token
  user: {
    id: string;
    email: string;
    username: string;
    githubNickname: string | null;
    githubAvatar: string | null;
  }
}
```

### 错误响应
- **400**: 参数验证失败
- **401**: 邮箱或密码错误
  ```json
  {
    "statusCode": 401,
    "message": "Invalid credentials",
    "error": "Unauthorized"
  }
  ```

---

## 3️⃣ GitHub 登录接口

### 接口信息
- **URL**: `GET /auth/github`
- **需要认证**: ❌ 否
- **说明**: 浏览器跳转，会重定向到 GitHub 授权页面

### 使用方式
```html
<a href="http://localhost:3000/auth/github">使用 GitHub 登录</a>
```

### 回调处理
GitHub 授权后会重定向到：
```
http://localhost:5173/auth/callback?token=<accessToken>&refresh=
```

前端需要：
1. 提取 URL 中的 `token` 参数
2. 保存到 `localStorage.setItem('accessToken', token)`
3. 跳转到首页

---

## 📝 表单字段规范

### 注册表单字段

| 字段名 | 类型 | 必填 | 验证规则 | 错误提示 |
|--------|------|------|----------|----------|
| email | email | ✅ | 邮箱格式 | "邮箱格式不正确" |
| username | text | ✅ | 2-50字符 | "用户名至少需要2个字符" / "用户名不能超过50个字符" |
| password | password | ✅ | 6-100字符 | "密码至少需要6个字符" / "密码不能超过100个字符" |

### 登录表单字段

| 字段名 | 类型 | 必填 | 验证规则 | 错误提示 |
|--------|------|------|----------|----------|
| email | email | ✅ | 邮箱格式 | "email must be an email" |
| password | password | ✅ | 至少6字符 | "password must be longer than or equal to 6 characters" |

---

## 🎨 UI 组件需求

### 注册页面组件
- ✅ 邮箱输入框（email 类型）
- ✅ 用户名输入框（text 类型）
- ✅ 密码输入框（password 类型，建议显示/隐藏功能）
- ✅ 注册按钮（提交表单）
- ✅ 错误提示区域（显示验证错误）
- ✅ "已有账号？去登录" 链接（可选）

### 登录页面组件
- ✅ 邮箱输入框（email 类型）
- ✅ 密码输入框（password 类型，建议显示/隐藏功能）
- ✅ 登录按钮（提交表单）
- ✅ 错误提示区域（显示验证错误）
- ✅ "没有账号？去注册" 链接（可选）
- ✅ GitHub 登录按钮（跳转到 `/auth/github`）

---

## 💾 Token 存储规范

### 保存 Token
```typescript
// 注册/登录成功后
localStorage.setItem('accessToken', response.accessToken);
localStorage.setItem('user', JSON.stringify(response.user));
```

### 使用 Token
```typescript
// 后续请求需要认证的接口
headers: {
  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
  'Content-Type': 'application/json'
}
```

---

## 🔄 完整交互流程

### 注册流程
```
用户填写表单 → 前端验证 → 发送请求 → 保存 Token → 跳转首页
```

### 登录流程
```
用户填写表单 → 前端验证 → 发送请求 → 保存 Token → 跳转首页
```

### GitHub 登录流程
```
点击按钮 → 跳转 GitHub → 授权 → 回调前端 → 提取 Token → 保存 → 跳转首页
```

---

## ⚠️ 错误处理规范

### 前端错误处理
1. **400 错误**: 显示表单验证错误信息
2. **401 错误**: 显示 "邮箱或密码错误"
3. **409 错误**: 显示 "该邮箱已被注册，请直接登录"
4. **网络错误**: 显示 "网络错误，请稍后重试"

### 错误提示位置
- 表单字段下方显示对应字段的错误
- 表单顶部显示全局错误（如 401、409）

---

## 📦 响应数据结构

### 成功响应结构
```typescript
interface AuthResponse {
  accessToken: string;
  user: {
    id: string;              // UUID
    email: string;
    username: string;
    githubNickname: string | null;
    githubAvatar: string | null;
  };
}
```

### 错误响应结构
```typescript
interface ErrorResponse {
  statusCode: number;
  message: string | string[];  // 单个错误或错误数组
  error: string;
}
```

---

## 🚀 快速实现示例

### React 注册组件示例
```typescript
const RegisterForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: ''
  });
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3000/auth/register/local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('accessToken', data.accessToken);
        // 跳转首页
      } else {
        setErrors(data.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* 表单字段 */}
    </form>
  );
};
```

---

## 📌 重要提示

1. **Base URL**: 开发环境使用 `http://localhost:3000`
2. **CORS**: 已配置允许 `http://localhost:5173` 跨域
3. **Token 过期**: 默认 15 分钟，过期后需重新登录
4. **GitHub 登录**: 首次登录自动注册，无需单独注册步骤

---

**文档版本**: v1.0  
**用途**: AI 生成登录注册界面

