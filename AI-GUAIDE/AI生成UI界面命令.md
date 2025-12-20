# 🎨 AI 生成登录注册界面命令

## 📋 任务说明

请根据以下要求，为 React + TypeScript 项目生成**登录、注册、GitHub回调、404页面**的完整UI界面代码。

**重要**：
- ✅ 需要包含完整的UI界面代码
- ✅ 需要包含表单验证逻辑（前端验证）
- ✅ 需要包含路由跳转逻辑
- ❌ **不需要**实际的API接口调用实现（用注释标记接口调用位置即可）
- ❌ **不需要**状态管理实现（AuthContext等）

---

## 🎯 技术栈要求

- **框架**: React 19 + TypeScript
- **路由**: React Router v7
- **样式**: Tailwind CSS
- **UI组件库**: shadcn/ui（已有 Input、Button 组件）
- **图标**: lucide-react
- **Toast通知**: sonner（已有 Toaster 组件）

---

## 📁 需要生成的文件

1. `client/src/pages/Login.tsx` - 登录页面
2. `client/src/pages/Register.tsx` - 注册页面
3. `client/src/pages/AuthCallback.tsx` - GitHub 回调页面
4. `client/src/pages/NotFound.tsx` - 404 页面

---

## 📝 接口字段规范

### 1. 注册接口

**接口**: `POST /auth/register/local`

**请求字段**:
```typescript
{
  email: string;      // 邮箱，必填，邮箱格式验证
  username: string;  // 用户名，必填，2-50字符
  password: string;  // 密码，必填，6-100字符
}
```

**成功响应**:
```typescript
{
  accessToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    githubNickname: string | null;
    githubAvatar: string | null;
  }
}
```

**错误响应**:
- **400**: `{ statusCode: 400, message: ["邮箱格式不正确", "用户名至少需要2个字符"], error: "Bad Request" }`
- **409**: `{ statusCode: 409, message: "该邮箱已被注册", error: "Conflict" }`

### 2. 登录接口

**接口**: `POST /auth/login/local`

**请求字段**:
```typescript
{
  email: string;     // 邮箱，必填，邮箱格式验证
  password: string;   // 密码，必填，至少6字符
}
```

**成功响应**: 同注册接口

**错误响应**:
- **400**: `{ statusCode: 400, message: ["email must be an email", "password must be longer than or equal to 6 characters"], error: "Bad Request" }`
- **401**: `{ statusCode: 401, message: "Invalid credentials", error: "Unauthorized" }`

### 3. GitHub 登录

**跳转URL**: `http://localhost:3000/auth/github`

**回调URL**: `http://localhost:5173/auth/callback?token=<accessToken>&refresh=`

---

## 🎨 UI设计要求

### 整体风格
- 现代化、简洁的设计
- 支持深色/浅色主题（使用 Tailwind 的 dark 模式）
- 响应式设计，适配移动端和桌面端
- 使用渐变、阴影等视觉效果增强美观度

### 登录页面 (`Login.tsx`)

**布局要求**:
- 居中布局，最大宽度 400px
- 背景使用渐变或纯色，支持深色模式
- 卡片式设计，带圆角和阴影

**必含元素**:
1. **标题**: "登录" 或 "Welcome Back"
2. **邮箱输入框**:
   - 使用 `@/components/ui/input`
   - type="email"
   - placeholder="请输入邮箱"
   - 实时验证邮箱格式
   - 错误时显示红色边框和错误提示
3. **密码输入框**:
   - 使用 `@/components/ui/input`
   - type="password"
   - placeholder="请输入密码"
   - 显示/隐藏密码按钮（使用 Eye/EyeOff 图标）
   - 实时验证密码长度（至少6字符）
   - 错误时显示红色边框和错误提示
4. **登录按钮**:
   - 使用 `@/components/ui/button`
   - 全宽按钮
   - 加载状态显示 "登录中..."
   - 禁用状态（加载时）
5. **GitHub 登录按钮**:
   - 使用 `@/components/ui/button`，variant="outline"
   - 包含 GitHub 图标（使用 lucide-react 的 Github 图标）
   - 点击跳转到 `http://localhost:3000/auth/github`
   - 文字："使用 GitHub 登录"
6. **分隔线**: 登录按钮和 GitHub 按钮之间添加 "或" 分隔线
7. **跳转链接**: "没有账号？去注册" 链接，点击跳转到 `/register`
8. **错误提示区域**: 
   - 表单顶部显示全局错误（如 401、409）
   - 每个字段下方显示对应字段的错误

**验证规则**:
- 邮箱：必须符合邮箱格式（使用正则或 HTML5 验证）
- 密码：至少6个字符
- 实时验证：用户输入时清除错误提示

**路由跳转逻辑**:
```typescript
// 登录成功后
// TODO: 调用登录接口
// TODO: 保存 token: localStorage.setItem('accessToken', accessToken)
// TODO: 保存用户信息: localStorage.setItem('user', JSON.stringify(user))
// 跳转到首页
navigate('/', { replace: true });
```

### 注册页面 (`Register.tsx`)

**布局要求**: 同登录页面

**必含元素**:
1. **标题**: "注册" 或 "Create Account"
2. **邮箱输入框**: 同登录页面
3. **用户名输入框**:
   - 使用 `@/components/ui/input`
   - type="text"
   - placeholder="请输入用户名（2-50个字符）"
   - 实时验证长度（2-50字符）
   - 错误时显示红色边框和错误提示
4. **密码输入框**: 同登录页面
5. **确认密码输入框**:
   - 使用 `@/components/ui/input`
   - type="password"
   - placeholder="请再次输入密码"
   - 验证两次密码是否一致
   - 显示/隐藏密码按钮
6. **注册按钮**:
   - 使用 `@/components/ui/button`
   - 全宽按钮
   - 加载状态显示 "注册中..."
   - 禁用状态（加载时）
7. **GitHub 登录按钮**: 同登录页面
8. **分隔线**: 注册按钮和 GitHub 按钮之间添加 "或" 分隔线
9. **跳转链接**: "已有账号？去登录" 链接，点击跳转到 `/login`
10. **错误提示区域**: 同登录页面

**验证规则**:
- 邮箱：必须符合邮箱格式
- 用户名：2-50个字符
- 密码：6-100个字符
- 确认密码：必须与密码一致
- 实时验证：用户输入时清除错误提示

**路由跳转逻辑**:
```typescript
// 注册成功后
// TODO: 调用注册接口
// TODO: 保存 token: localStorage.setItem('accessToken', accessToken)
// TODO: 保存用户信息: localStorage.setItem('user', JSON.stringify(user))
// 跳转到首页
navigate('/', { replace: true });
```

### GitHub 回调页面 (`AuthCallback.tsx`)

**功能要求**:
1. 显示加载状态："正在登录..."
2. 从 URL 参数中提取 `token`
3. 保存 token 到 localStorage
4. 跳转到首页

**代码逻辑**:
```typescript
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      // TODO: 保存 token
      localStorage.setItem('accessToken', token);
      
      // TODO: 可能需要调用接口获取用户信息
      // 或者从 token 中解析用户信息
      
      // 跳转到首页
      navigate('/', { replace: true });
    } else {
      // 没有 token，跳转到登录页
      navigate('/login', { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-lg">正在登录...</p>
      </div>
    </div>
  );
}
```

### 404 页面 (`NotFound.tsx`)

**设计要求**:
- 居中布局
- 大号 404 文字
- "页面未找到" 提示
- 返回首页按钮

**代码要求**:
```typescript
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-9xl font-bold text-primary mb-4">404</h1>
      <p className="text-xl text-muted-foreground mb-8">页面未找到</p>
      <Button onClick={() => navigate('/')}>
        <Home className="w-4 h-4 mr-2" />
        返回首页
      </Button>
    </div>
  );
}
```

---

## 🔄 路由跳转逻辑

### 登录页面
- **成功登录后**: `navigate('/', { replace: true })`
- **跳转注册**: `navigate('/register')`
- **GitHub 登录**: `window.location.href = 'http://localhost:3000/auth/github'`

### 注册页面
- **成功注册后**: `navigate('/', { replace: true })`
- **跳转登录**: `navigate('/login')`
- **GitHub 登录**: `window.location.href = 'http://localhost:3000/auth/github'`

### GitHub 回调页面
- **有 token**: `navigate('/', { replace: true })`
- **无 token**: `navigate('/login', { replace: true })`

### 404 页面
- **返回首页**: `navigate('/')`

---

## ✅ 表单验证要求

### 前端验证规则

**登录表单**:
- 邮箱：必须符合邮箱格式（使用正则：`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`）
- 密码：至少6个字符

**注册表单**:
- 邮箱：必须符合邮箱格式
- 用户名：2-50个字符
- 密码：6-100个字符
- 确认密码：必须与密码一致

### 验证时机
- **实时验证**: 用户输入时清除该字段的错误提示
- **提交验证**: 提交时验证所有字段，显示所有错误
- **错误显示**: 
  - 字段下方显示红色文字错误提示
  - 错误字段的输入框显示红色边框

---

## 🎨 样式要求

### 颜色方案
- 使用 Tailwind CSS 的主题色变量：
  - `bg-background` - 背景色
  - `text-foreground` - 文字颜色
  - `bg-primary` - 主色
  - `text-primary` - 主色文字
  - `border-border` - 边框颜色
  - `text-muted-foreground` - 次要文字颜色

### 深色模式支持
- 所有颜色使用 Tailwind 的主题变量
- 自动适配 `dark:` 类名

### 响应式设计
- 移动端：全宽，适当的内边距
- 桌面端：最大宽度 400px，居中显示

---

## 📦 导入要求

### 必须使用的组件
```typescript
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useState, FormEvent } from 'react';
import { Eye, EyeOff, Github } from 'lucide-react';
```

### 可选使用的组件
```typescript
import { toast } from 'sonner'; // 如果需要显示 toast（但接口调用用注释）
```

---

## ⚠️ 重要提示

1. **接口调用位置**: 用 `// TODO: 调用登录接口` 这样的注释标记，不要实现实际调用
2. **Token 保存**: 用 `// TODO: 保存 token` 注释标记
3. **错误处理**: 需要处理各种错误情况，但接口调用部分用注释
4. **加载状态**: 按钮需要有加载状态（isLoading）
5. **表单验证**: 必须实现完整的前端验证逻辑
6. **路由跳转**: 必须实现所有路由跳转逻辑
7. **用户体验**: 友好的错误提示，清晰的视觉反馈

---

## 📋 代码结构示例

### Login.tsx 结构
```typescript
export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 验证函数
  const validateForm = () => { /* ... */ };

  // 提交处理
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // 验证
    // TODO: 调用登录接口
    // TODO: 保存 token
    // 跳转
  };

  // 输入处理
  const handleChange = (field: string, value: string) => { /* ... */ };

  // GitHub 登录
  const handleGitHubLogin = () => {
    window.location.href = 'http://localhost:3000/auth/github';
  };

  return (
    <div className="...">
      {/* UI 代码 */}
    </div>
  );
}
```

---

## 🎯 生成要求总结

请生成以下4个文件的完整代码：

1. ✅ `Login.tsx` - 完整的登录页面UI和验证逻辑
2. ✅ `Register.tsx` - 完整的注册页面UI和验证逻辑
3. ✅ `AuthCallback.tsx` - GitHub回调处理页面
4. ✅ `NotFound.tsx` - 404错误页面

**必须包含**:
- ✅ 完整的UI界面代码
- ✅ 表单验证逻辑
- ✅ 路由跳转逻辑
- ✅ 错误处理UI
- ✅ 加载状态UI
- ✅ 深色模式支持

**不需要包含**:
- ❌ 实际的API接口调用代码（用注释标记）
- ❌ AuthContext 或状态管理代码
- ❌ API服务层代码

---

**请根据以上要求生成完整的代码！** 🚀

