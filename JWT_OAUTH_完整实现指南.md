# 🚀 JWT + OAuth 认证完整实现指南（新手版）

> 本指南将一步步教你如何实现 JWT + OAuth 认证系统，适合初学者学习。

---

## 📋 目录

1. [准备工作](#1-准备工作)
2. [第一步：配置环境变量](#第一步配置环境变量)
3. [第二步：实现后端用户服务](#第二步实现后端用户服务)
4. [第三步：实现认证服务](#第三步实现认证服务)
5. [第四步：实现 OAuth 策略](#第四步实现-oauth-策略)
6. [第五步：实现 JWT 策略](#第五步实现-jwt-策略)
7. [第六步：实现认证控制器](#第六步实现认证控制器)
8. [第七步：配置认证模块](#第七步配置认证模块)
9. [第八步：实现前端认证](#第八步实现前端认证)
10. [第九步：测试认证流程](#第九步测试认证流程)
11. [常见问题排查](#常见问题排查)

---

## 1. 准备工作

### ✅ 检查已安装的依赖

你的项目已经安装了以下依赖（在 `server/package.json` 中）：

- ✅ `@nestjs/passport` - Passport 集成
- ✅ `@nestjs/jwt` - JWT 处理
- ✅ `@nestjs/config` - 配置管理
- ✅ `passport` - 认证中间件
- ✅ `passport-github2` - GitHub OAuth
- ✅ `passport-google-oauth20` - Google OAuth
- ✅ `passport-jwt` - JWT 验证
- ✅ `@nestjs/typeorm` + `typeorm` - 数据库 ORM
- ✅ `pg` - PostgreSQL 驱动

**如果缺少依赖，运行：**
```bash
cd server
npm install @nestjs/passport @nestjs/jwt @nestjs/config passport passport-github2 passport-google-oauth20 passport-jwt @nestjs/typeorm typeorm pg
npm install -D @types/passport-github2 @types/passport-google-oauth20 @types/passport-jwt
```

### ✅ 数据库已配置

你的数据库配置在 `server/src/ormcofig.ts`，用户表实体在 `server/src/user/entities/user.entitiey.ts`。

---

## 第一步：配置环境变量

### 📝 创建 `.env` 文件

在 `server` 目录下创建 `.env` 文件：

```env
# JWT 配置
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long-change-in-production
JWT_EXPIRES_IN=15m

JWT_REFRESH_SECRET=your-refresh-token-secret-minimum-32-characters-long
JWT_REFRESH_EXPIRES_IN=7d

# OAuth GitHub（稍后获取）
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

# OAuth Google（稍后获取）
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# 前端 URL
FRONTEND_URL=http://localhost:5173

# 服务器端口
PORT=3000
```

### 🔑 生成 JWT Secret

**Windows PowerShell：**
```powershell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString() + [System.Guid]::NewGuid().ToString()))
```

**Linux/Mac：**
```bash
openssl rand -base64 32
```

将生成的值分别填入 `JWT_SECRET` 和 `JWT_REFRESH_SECRET`。

---

## 第二步：实现后端用户服务

### 📁 文件：`server/src/user/user.service.ts`

**作用：** 处理用户的数据库操作（查找、创建、更新用户）

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entitiey';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * 根据 ID 查找用户
   */
  async findById(id: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { id } });
  }

  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  /**
   * 根据 provider 和 providerId 查找用户
   */
  async findByProvider(provider: string, providerId: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { provider, providerId },
    });
  }

  /**
   * 创建新用户
   */
  async create(userData: {
    email: string;
    username: string;
    password?: string;
    provider: string;
    providerId?: string;
    githubNickname?: string;
    githubAvatar?: string;
  }): Promise<User> {
    const user = this.userRepository.create(userData);
    return await this.userRepository.save(user);
  }

  /**
   * 更新用户信息
   */
   

  /**
   * 查找或创建用户（OAuth 登录时使用）
   */
  async findOrCreate(userData: {
    email: string;
    username: string;
    provider: string;
    providerId?: string;
    githubNickname?: string;
    githubAvatar?: string;
  }): Promise<User> {
    // 如果是 GitHub 登录，先通过 providerId 查找
    if (userData.provider === 'github' && userData.providerId) {
      let user = await this.findByProvider('github', userData.providerId);
      if (user) {
        // 更新用户信息（GitHub 昵称和头像可能会变化）
        user.githubNickname = userData.githubNickname || user.githubNickname;
        user.githubAvatar = userData.githubAvatar || user.githubAvatar;
        user.email = userData.email;
        user.username = userData.username;
        return await this.userRepository.save(user);
      }
    }

    // 如果不存在，创建新用户
    return await this.create(userData);
  }
}
```

---

## 第三步：实现认证服务

### 📁 文件：`server/src/auth/auth.service.ts`

**作用：** 处理 JWT Token 的生成、验证和 OAuth 用户验证

```typescript
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { User } from '../user/entities/user.entitiey';

// JWT Payload 接口（Token 中存储的用户信息）
export interface JwtPayload {
  sub: string; // 用户 ID
  email: string;
  username: string;
  githubNickname?: string;
  githubAvatar?: string;
}

// 认证响应接口
export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    username: string;
    githubNickname?: string;
    githubAvatar?: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UserService,
  ) {}

  /**
   * 验证 OAuth 用户（GitHub/Google 登录后调用）
   */
  async validateOAuthUser(profile: any, provider: string): Promise<User> {
    let email: string;
    let username: string;
    let githubNickname: string | undefined;
    let githubAvatar: string | undefined;
    let providerId: string | undefined;

    if (provider === 'github') {
      // GitHub 返回的用户信息
      email = profile.emails?.[0]?.value || profile._json?.email || `${profile.id}@github.com`;
      username = profile.username || profile.login || 'GitHub User';
      githubNickname = profile.displayName || profile._json?.name || profile.username || profile.login;
      githubAvatar = profile.photos?.[0]?.value || profile.avatar_url || profile._json?.avatar_url;
      providerId = profile.id.toString();
    } else if (provider === 'google') {
      // Google 返回的用户信息
      email = profile.emails?.[0]?.value || profile.email || `${profile.id}@google.com`;
      username = profile.displayName || profile.name?.givenName || 'Google User';
      githubAvatar = profile.photos?.[0]?.value || profile.picture;
      providerId = profile.id.toString();
    } else {
      // 其他提供商
      email = profile.emails?.[0]?.value || profile.email || `${profile.id}@${provider}.com`;
      username = profile.username || profile.displayName || 'User';
      githubAvatar = profile.photos?.[0]?.value || profile.avatar_url || profile.picture;
      providerId = profile.id.toString();
    }

    // 查找或创建用户
    return await this.usersService.findOrCreate({
      email,
      username,
      provider,
      providerId,
      githubNickname,
      githubAvatar,
    });
  }

  /**
   * 生成 JWT Token（Access Token 和 Refresh Token）
   */
  async generateTokens(user: User): Promise<AuthResponse> {
    // 构建 JWT Payload（Token 中存储的信息）
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      githubNickname: user.githubNickname || undefined,
      githubAvatar: user.githubAvatar || undefined,
    };

    // 生成 Access Token（短期有效，15分钟）
    const accessToken = this.jwtService.sign(payload);

    // 生成 Refresh Token（长期有效，7天）
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d') as any,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        githubNickname: user.githubNickname || undefined,
        githubAvatar: user.githubAvatar || undefined,
      },
    };
  }

  /**
   * 验证 JWT Payload 并返回用户信息
   */
  async validateUser(payload: JwtPayload): Promise<User | null> {
    return await this.usersService.findById(payload.sub);
  }

  /**
   * 刷新 Access Token（使用 Refresh Token）
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      // 验证 Refresh Token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      }) as JwtPayload;

      // 查找用户
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new Error('User not found');
      }

      // 生成新的 Token
      return this.generateTokens(user);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }
}
```

---

## 第四步：实现 OAuth 策略

### 📁 文件：`server/src/auth/strategies/github.strategy.ts`

**作用：** 配置 GitHub OAuth 登录策略

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID'),
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GITHUB_CALLBACK_URL'),
      scope: ['user:email'], // 请求访问用户邮箱的权限
    });
  }

  /**
   * GitHub 回调后，验证用户信息
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ) {
    // 调用 AuthService 验证并创建/更新用户
    const user = await this.authService.validateOAuthUser(profile, 'github');
    return user; // 返回的用户会被附加到 request.user
  }
}
```

### 📁 文件：`server/src/auth/strategies/google.strategy.ts`

**作用：** 配置 Google OAuth 登录策略

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'], // 请求访问邮箱和用户资料
    });
  }

  /**
   * Google 回调后，验证用户信息
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    // 调用 AuthService 验证并创建/更新用户
    const user = await this.authService.validateOAuthUser(profile, 'google');
    return user; // 返回的用户会被附加到 request.user
  }
}
```

---

## 第五步：实现 JWT 策略

### 📁 文件：`server/src/auth/strategies/jwt.strategy.ts`

**作用：** 验证请求中的 JWT Token

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, JwtPayload } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      // 从请求头中提取 JWT Token
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // 不忽略过期时间
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * 验证 JWT Payload 并返回用户信息
   */
  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUser(payload);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    return user; // 返回的用户会被附加到 request.user
  }
}
```

---

## 第六步：实现认证控制器

### 📁 文件：`server/src/auth/auth.controller.ts`

**作用：** 定义认证相关的 API 路由

```typescript
import { Controller, Get, Post, Req, Res, UseGuards, Body } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  /**
   * GitHub 登录入口
   * 访问：GET /auth/github
   * 会重定向到 GitHub 授权页面
   */
  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubAuth() {
    // Passport 会自动处理重定向
  }

  /**
   * GitHub 登录回调
   * GitHub 授权后会重定向到这里
   */
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    // req.user 是 GitHubStrategy.validate() 返回的用户
    const tokens = await this.authService.generateTokens(req.user);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    
    // 重定向到前端，携带 Token
    res.redirect(
      `${frontendUrl}/auth/callback?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`
    );
  }

  /**
   * Google 登录入口
   * 访问：GET /auth/google
   */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Passport 会自动处理重定向
  }

  /**
   * Google 登录回调
   */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const tokens = await this.authService.generateTokens(req.user);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    
    res.redirect(
      `${frontendUrl}/auth/callback?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`
    );
  }

  /**
   * 刷新 Access Token
   * 访问：POST /auth/refresh
   * Body: { refreshToken: "..." }
   */
  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  /**
   * 获取当前用户信息
   * 访问：GET /auth/me
   * 需要在请求头中携带：Authorization: Bearer <accessToken>
   */
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@CurrentUser() user: any) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      githubNickname: user.githubNickname,
      githubAvatar: user.githubAvatar,
      provider: user.provider,
    };
  }
}
```

### 📁 文件：`server/src/auth/decorators/current-user.decorator.ts`

**作用：** 自定义装饰器，方便获取当前登录用户

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // JWT Strategy 验证后会将用户信息附加到 request.user
  },
);
```

---

## 第七步：配置认证模块

### 📁 文件：`server/src/auth/auth.module.ts`

**作用：** 配置认证模块，注册所有策略和服务

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    // 注册 Passport 模块，默认策略为 'jwt'
    PassportModule.register({ defaultStrategy: 'jwt' }),
    
    // 配置 JWT 模块
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET is not defined in environment variables');
        }
        return {
          secret,
          signOptions: {
            expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m') as any,
          },
        };
      },
      inject: [ConfigService],
    }),
    
    // 导入 UserModule 以使用 UserService
    UserModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,      // JWT 验证策略
    GithubStrategy,   // GitHub OAuth 策略
    GoogleStrategy,   // Google OAuth 策略
  ],
  exports: [AuthService], // 导出 AuthService，供其他模块使用
})
export class AuthModule {}
```

### 📁 文件：`server/src/user/user.module.ts`

**确保 UserModule 导出 UserService：**

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entitiey';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService], // 重要：导出 UserService 供 AuthModule 使用
})
export class UserModule {}
```

---

## 第八步：获取 OAuth 凭证

### 🔵 GitHub OAuth App

1. 访问：https://github.com/settings/developers
2. 点击 **"New OAuth App"**
3. 填写信息：
   - **Application name**: `Code Editor`（你的应用名称）
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:3000/auth/github/callback`
4. 点击 **"Register application"**
5. 复制 **Client ID** 和 **Client Secret**
6. 填入 `.env` 文件：
   ```env
   GITHUB_CLIENT_ID=你的_Client_ID
   GITHUB_CLIENT_SECRET=你的_Client_Secret
   ```

### 🔴 Google OAuth

1. 访问：https://console.cloud.google.com/
2. 创建新项目或选择现有项目
3. 进入 **"APIs & Services"** → **"Credentials"**
4. 点击 **"Create Credentials"** → **"OAuth client ID"**
5. 配置 OAuth 同意屏幕（首次需要）
6. 选择应用类型：**"Web application"**
7. 填写信息：
   - **Name**: `Code Editor`
   - **Authorized redirect URIs**: `http://localhost:3000/auth/google/callback`
8. 点击 **"Create"**
9. 复制 **Client ID** 和 **Client Secret**
10. 填入 `.env` 文件：
    ```env
    GOOGLE_CLIENT_ID=你的_Client_ID
    GOOGLE_CLIENT_SECRET=你的_Client_Secret
    ```

---

## 第九步：测试后端 API

### 🚀 启动服务器

```bash
cd server
npm run start:dev
```

### ✅ 测试端点

1. **GitHub 登录入口**
   - 访问：http://localhost:3000/auth/github
   - 应该重定向到 GitHub 授权页面

2. **获取当前用户（需要 Token）**
   - 使用 Postman 或 curl：
   ```bash
   curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" http://localhost:3000/auth/me
   ```

3. **刷新 Token**
   ```bash
   curl -X POST http://localhost:3000/auth/refresh \
     -H "Content-Type: application/json" \
     -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'
   ```

---

## 第十步：实现前端认证

### 📦 安装前端依赖

```bash
cd client
npm install axios js-cookie
npm install -D @types/js-cookie
```

### 📁 文件：`client/src/services/auth.service.ts`

**作用：** 前端认证服务，处理 Token 存储和 API 调用

```typescript
import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface User {
  id: string;
  email: string;
  username: string;
  githubNickname?: string;
  githubAvatar?: string;
  provider: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

class AuthService {
  /**
   * 获取 Access Token
   */
  private getAccessToken(): string | null {
    return Cookies.get('accessToken') || null;
  }

  /**
   * 获取 Refresh Token
   */
  private getRefreshToken(): string | null {
    return Cookies.get('refreshToken') || null;
  }

  /**
   * 保存 Token 到 Cookie
   */
  setTokens(tokens: AuthTokens) {
    Cookies.set('accessToken', tokens.accessToken, { expires: 1 }); // 1天
    if (tokens.refreshToken) {
      Cookies.set('refreshToken', tokens.refreshToken, { expires: 7 }); // 7天
    }
  }

  /**
   * 清除 Token
   */
  clearTokens() {
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const token = this.getAccessToken();
      if (!token) return null;

      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * 刷新 Access Token
   */
  async refreshAccessToken(): Promise<string | null> {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) return null;

      const response = await axios.post(`${API_URL}/auth/refresh`, {
        refreshToken,
      });
      
      this.setTokens({
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
      });
      
      return response.data.accessToken;
    } catch (error) {
      this.clearTokens();
      return null;
    }
  }

  /**
   * 获取认证请求头
   */
  getAuthHeaders() {
    const token = this.getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * GitHub 登录
   */
  loginWithGitHub() {
    window.location.href = `${API_URL}/auth/github`;
  }

  /**
   * Google 登录
   */
  loginWithGoogle() {
    window.location.href = `${API_URL}/auth/google`;
  }

  /**
   * 登出
   */
  logout() {
    this.clearTokens();
    window.location.href = '/';
  }
}

export const authService = new AuthService();
```

### 📁 文件：`client/src/Context/AuthContext.tsx`

**作用：** 认证上下文，管理全局用户状态

```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService, User } from '../services/auth.service';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGitHub: () => void;
  loginWithGoogle: () => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
  };

  useEffect(() => {
    const initAuth = async () => {
      // 检查 URL 中是否有 token（OAuth 回调）
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const refresh = urlParams.get('refresh');

      if (token) {
        // 保存 Token
        authService.setTokens({
          accessToken: token,
          refreshToken: refresh || undefined,
        });
        // 清除 URL 参数
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      // 获取当前用户
      await refreshUser();
      setLoading(false);
    };

    initAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithGitHub: authService.loginWithGitHub,
        loginWithGoogle: authService.loginWithGoogle,
        logout: authService.logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### 📁 文件：`client/src/pages/Login.tsx`

**作用：** 登录页面

```typescript
import { useAuth } from '../Context/AuthContext';

export default function Login() {
  const { loginWithGitHub, loginWithGoogle } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">登录到 Code Editor</h1>
        
        <div className="space-y-4">
          <button
            onClick={loginWithGitHub}
            className="w-full flex items-center justify-center gap-3 bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23 1.957-.538 4.04-.538 6.1-.538 2.06 0 4.143 0 6.1.538 2.292-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span>使用 GitHub 登录</span>
          </button>

          <button
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>使用 Google 登录</span>
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 📁 文件：`client/src/components/ProtectedRoute.tsx`

**作用：** 路由守卫，保护需要登录的页面

```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">加载中...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

### 📁 文件：`client/src/pages/AuthCallback.tsx`

**作用：** OAuth 回调页面，处理 Token

```typescript
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      // Token 已经在 AuthContext 中处理了
      await refreshUser();
      navigate('/');
    };

    handleCallback();
  }, [navigate, refreshUser]);

  return <div className="flex items-center justify-center min-h-screen">登录中...</div>;
}
```

### 📁 更新 `client/src/main.tsx`

**在 App 外层包裹 AuthProvider：**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './Context/AuthContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
```

### 📁 更新路由配置（根据你的路由文件）

**示例：`client/src/App.tsx` 或路由文件**

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

---

## 第十一步：配置 Axios 拦截器（可选但推荐）

### 📁 文件：`client/src/utils/axios.ts`

**作用：** 自动在请求中添加 Token，处理 Token 过期

```typescript
import axios from 'axios';
import { authService } from '../services/auth.service';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

// 请求拦截器：自动添加 Token
api.interceptors.request.use(
  (config) => {
    const headers = authService.getAuthHeaders();
    config.headers = { ...config.headers, ...headers };
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器：处理 Token 过期
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 如果是 401 错误且未重试过
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // 尝试刷新 Token
      const newToken = await authService.refreshAccessToken();
      if (newToken) {
        // 使用新 Token 重试请求
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } else {
        // 刷新失败，跳转到登录页
        authService.logout();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

**使用示例：**

```typescript
import api from './utils/axios';

// 所有请求都会自动携带 Token
const response = await api.get('/some-protected-endpoint');
```

---

## 常见问题排查

### ❌ 问题 1：数据库表未创建

**解决方案：**
1. 检查 `server/src/ormcofig.ts` 中 `synchronize: true`
2. 重启服务器：`npm run start:dev`
3. 查看服务器日志，应该看到 `CREATE TABLE` 语句
4. 在 pgAdmin 中刷新数据库

### ❌ 问题 2：OAuth 回调失败

**检查：**
1. `.env` 文件中的 `GITHUB_CALLBACK_URL` 和 `GOOGLE_CALLBACK_URL` 是否正确
2. OAuth App 配置中的回调 URL 是否与 `.env` 中的一致
3. 服务器是否在运行（端口 3000）

### ❌ 问题 3：JWT 验证失败

**检查：**
1. `.env` 文件中的 `JWT_SECRET` 是否设置
2. 请求头格式：`Authorization: Bearer <token>`
3. Token 是否过期（Access Token 默认 15 分钟）

### ❌ 问题 4：CORS 错误

**检查：**
1. `server/src/main.ts` 中的 CORS 配置
2. `.env` 文件中的 `FRONTEND_URL` 是否正确
3. 前端请求的 URL 是否正确

### ❌ 问题 5：GitHub 昵称和头像未保存

**检查：**
1. `github.strategy.ts` 中是否正确提取了 `profile._json.name` 和 `profile._json.avatar_url`
2. `auth.service.ts` 中的 `validateOAuthUser` 方法是否正确处理 GitHub 数据
3. 数据库表字段是否正确（`githubNickname`, `githubAvatar`）

---

## 🎉 完成！

现在你的 JWT + OAuth 认证系统已经完成！你可以：

1. ✅ 使用 GitHub 登录
2. ✅ 使用 Google 登录
3. ✅ 获取和刷新 JWT Token
4. ✅ 保护需要登录的页面
5. ✅ 在前端显示用户信息（GitHub 昵称和头像）

**下一步建议：**
- 添加本地注册/登录功能
- 实现用户资料编辑
- 添加头像上传功能
- 实现权限管理（RBAC）

---

## 📚 学习资源

- [NestJS 官方文档 - Authentication](https://docs.nestjs.com/security/authentication)
- [Passport.js 文档](http://www.passportjs.org/)
- [JWT 介绍](https://jwt.io/introduction)

---

**祝你学习愉快！如有问题，随时提问。** 🚀

