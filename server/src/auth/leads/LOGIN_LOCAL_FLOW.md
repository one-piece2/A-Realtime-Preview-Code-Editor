# 🔐 本地登录流程详解（POST /auth/login/local）

## 📋 完整执行步骤

### 步骤 1️⃣：前端发送请求

**前端代码示例：**
```typescript
// 前端发送 POST 请求
const response = await fetch('http://localhost:3000/auth/login/local', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: '123456'
  })
});
```

**请求信息：**
- **URL**: `POST http://localhost:3000/auth/login/local`
- **Headers**: `Content-Type: application/json`
- **Body**: 
  ```json
  {
    "email": "user@example.com",
    "password": "123456"
  }
  ```

---

### 步骤 2️⃣：NestJS 路由匹配

**文件：`server/src/auth/auth.controller.ts`**

```typescript
@Controller('auth')  // 路由前缀：/auth
export class AuthController {
  @Post('login/local')  // 匹配：POST /auth/login/local
  @UseGuards(AuthGuard('local'))  // 🔒 使用 Local 认证守卫
  async loginLocal(@Body() loginDto: LoginDto, @Req() req: Request) {
    // ...
  }
}
```

**执行：**
- NestJS 框架接收到请求
- 匹配到 `@Post('login/local')` 路由
- 准备执行 `loginLocal()` 方法

---

### 步骤 3️⃣：数据验证（DTO Validation）

**文件：`server/src/dto/login.user.dto.ts`**

```typescript
export class LoginDto {
  @IsEmail()        // 验证：必须是有效的邮箱格式
  email: string;
  
  @IsString()       // 验证：必须是字符串
  @MinLength(6)    // 验证：密码至少 6 个字符
  password: string;
}
```

**执行：**
- NestJS 自动验证请求体（Body）是否符合 `LoginDto` 规则
- 如果验证失败，返回 400 Bad Request
- 如果验证通过，`loginDto` 包含验证后的数据

**验证规则：**
- ✅ `email` 必须是有效邮箱格式
- ✅ `password` 必须是字符串，且长度 ≥ 6

---

### 步骤 4️⃣：AuthGuard('local') 拦截

**文件：`server/src/auth/auth.controller.ts`**

```typescript
@UseGuards(AuthGuard('local'))  // 🔒 认证守卫拦截
```

**执行：**
- `AuthGuard('local')` 被触发
- Passport 查找名为 `'local'` 的策略
- 找到 `LocalStrategy`（在 `auth.module.ts` 中注册）
- **暂停执行 `loginLocal()` 方法**
- 先执行 `LocalStrategy.validate()` 进行认证

---

### 步骤 5️⃣：LocalStrategy.validate() 执行

**文件：`server/src/auth/strategies/local.startegy.ts`**

```typescript
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',  // 告诉 Passport：使用 'email' 字段作为用户名
    });
  }

  async validate(email: string, password: string): Promise<User> {
    // 📥 接收参数：
    // - email: 从请求体中的 'email' 字段提取
    // - password: 从请求体中的 'password' 字段提取
    
    // 🔍 调用 AuthService 验证用户
    const user = await this.authService.validateLocalUser(email, password);
    
    // ✅ 验证成功，返回 User 对象
    // ⚠️ 重要：返回的 user 会自动附加到 req.user
    return user!;
  }
}
```

**执行流程：**
1. Passport 从请求体中提取 `email` 和 `password`
2. 调用 `LocalStrategy.validate(email, password)`
3. 内部调用 `authService.validateLocalUser(email, password)`

---

### 步骤 6️⃣：AuthService.validateLocalUser() 验证

**文件：`server/src/auth/auth.service.ts`**

```typescript
async validateLocalUser(email: string, password: string): Promise<User | null> {
  // 1️⃣ 根据邮箱查找用户
  const user = await this.userService.findByEmail(email);
  
  // 2️⃣ 检查用户是否存在
  if (!user) {
    throw new UnauthorizedException('Invalid credentials');
  }
  
  // 3️⃣ 验证密码（⚠️ 注意：这里直接比较，生产环境应该使用 bcrypt）
  if (user.password !== password) {
    throw new UnauthorizedException('Invalid credentials');
  }
  
  // 4️⃣ 验证成功，返回 User 对象
  return user;
}
```

**执行流程：**
1. 调用 `userService.findByEmail(email)` 查询数据库
2. 如果用户不存在 → 抛出 `UnauthorizedException`
3. 如果密码不匹配 → 抛出 `UnauthorizedException`
4. 如果验证通过 → 返回 `User` 对象

---

### 步骤 7️⃣：UserService.findByEmail() 查询数据库

**文件：`server/src/user/user.service.ts`**

```typescript
async findByEmail(email: string): Promise<User | null> {
  // 使用 TypeORM 查询数据库
  return await this.userRepository.findOne({ where: { email } });
}
```

**执行：**
- TypeORM 执行 SQL 查询：`SELECT * FROM users WHERE email = ?`
- 返回匹配的用户记录，或 `null`

---

### 步骤 8️⃣：返回 User 对象到 LocalStrategy

**执行流程（回溯）：**
```
UserService.findByEmail() 
  → 返回 User | null
  → AuthService.validateLocalUser() 
  → 返回 User
  → LocalStrategy.validate()
  → 返回 User
  → Passport 自动将 User 附加到 req.user ✅
```

**重要：** Passport 会将 `LocalStrategy.validate()` 返回的 `User` 对象自动附加到 `req.user`

---

### 步骤 9️⃣：继续执行 loginLocal() 方法

**文件：`server/src/auth/auth.controller.ts`**

```typescript
async loginLocal(@Body() loginDto: LoginDto, @Req() req: Request) {
  // ✅ 此时 req.user 已经有 User 对象了（由 LocalStrategy 注入）
  
  // 🎫 生成 JWT Token
  const tokens = await this.authService.generateTokens(req.user!);
  
  // 📤 返回 Token 和用户信息
  return tokens;
}
```

**执行：**
- `req.user` 已经包含验证通过的 `User` 对象
- 调用 `authService.generateTokens(req.user!)` 生成 Token

---

### 步骤 🔟：AuthService.generateTokens() 生成 JWT

**文件：`server/src/auth/auth.service.ts`**

```typescript
async generateTokens(user: User): Promise<AuthResponse> {
  // 1️⃣ 构建 JWT Payload（Token 中存储的信息）
  const payload: JwtPayload = {
    sub: user.id,              // 用户 ID
    email: user.email,         // 邮箱
    username: user.username,   // 用户名
    githubNickname: user.githubNickname || undefined,
    githubAvatar: user.githubAvatar || undefined,
  };
  
  // 2️⃣ 使用 JwtService 签名生成 Access Token
  const accessToken = this.jwtService.sign(payload);
  
  // 3️⃣ 返回 Token 和用户信息
  return {
    accessToken,  // JWT Token
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      githubNickname: user.githubNickname || undefined,
      githubAvatar: user.githubAvatar || undefined,
    },
  };
}
```

**执行：**
- 构建 JWT Payload（包含用户信息）
- 使用 `JWT_SECRET` 签名生成 Token
- 返回 `AuthResponse` 对象

---

### 步骤 1️⃣1️⃣：返回响应给前端

**响应格式：**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-1234-5678",
    "email": "user@example.com",
    "username": "username",
    "githubNickname": null,
    "githubAvatar": null
  }
}
```

**HTTP 状态码：** `200 OK`

---

## 📊 完整流程图

```
前端请求
  ↓
POST /auth/login/local
  ↓
NestJS 路由匹配 (@Post('login/local'))
  ↓
DTO 验证 (LoginDto)
  ↓
AuthGuard('local') 拦截
  ↓
LocalStrategy.validate(email, password)
  ↓
AuthService.validateLocalUser(email, password)
  ↓
UserService.findByEmail(email) → 查询数据库
  ↓
验证密码
  ↓
返回 User 对象
  ↓
Passport 将 User 附加到 req.user
  ↓
继续执行 loginLocal() 方法
  ↓
AuthService.generateTokens(req.user)
  ↓
生成 JWT Token
  ↓
返回响应给前端
```

---

## ⚠️ 错误处理

### 情况 1：DTO 验证失败
```json
// 响应：400 Bad Request
{
  "statusCode": 400,
  "message": ["email must be an email", "password must be longer than or equal to 6 characters"],
  "error": "Bad Request"
}
```

### 情况 2：用户不存在或密码错误
```json
// 响应：401 Unauthorized
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

---

## 🔑 关键点总结

1. **认证守卫执行顺序**：`AuthGuard('local')` 会在控制器方法执行**之前**运行
2. **req.user 的注入**：`LocalStrategy.validate()` 返回的 `User` 会自动附加到 `req.user`
3. **密码验证**：当前是明文比较，生产环境应使用 `bcrypt` 加密
4. **Token 生成时机**：在用户验证通过后立即生成

---

## 🛠️ 改进建议

### 1. 密码加密（重要！）

**当前代码（不安全）：**
```typescript
if (user.password !== password) {
  throw new UnauthorizedException('Invalid credentials');
}
```

**建议改为：**
```typescript
import * as bcrypt from 'bcrypt';

async validateLocalUser(email: string, password: string): Promise<User | null> {
  const user = await this.userService.findByEmail(email);
  if (!user || !user.password) {
    throw new UnauthorizedException('Invalid credentials');
  }
  
  // 使用 bcrypt 比较加密后的密码
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedException('Invalid credentials');
  }
  
  return user;
}
```

### 2. 添加 Refresh Token

在 `generateTokens()` 方法中添加 Refresh Token 生成逻辑。

---

**希望这个流程梳理对你有帮助！** 🚀

