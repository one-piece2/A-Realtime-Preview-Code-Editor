# 🔒 全局 JWT Guard 使用说明

## ✅ 已完成的工作

### 1. **实现 JwtAuthGuard**
- 文件：`server/src/auth/guards/jwt-auth.guard.ts`
- 功能：检查路由是否标记为公开，如果不是则验证 JWT Token

### 2. **创建 Public 装饰器**
- 文件：`server/src/auth/decorators/public.decorator.ts`
- 功能：标记不需要 JWT 认证的公开路由

### 3. **注册为全局 Guard**
- 文件：`server/src/auth/auth.module.ts`
- 使用 `APP_GUARD` provider 注册为全局 Guard

### 4. **标记公开路由**
- 已为所有认证相关的路由添加 `@Public()` 装饰器：
  - `POST /auth/login/local` - 本地登录
  - `POST /auth/register/local` - 本地注册
  - `GET /auth/github` - GitHub 登录入口
  - `GET /auth/github/callback` - GitHub 回调

---

## 🎯 工作原理

### 全局 Guard 执行流程

```
所有请求
  ↓
JwtAuthGuard.canActivate() 拦截
  ↓
检查路由是否标记为 @Public()
  ├─ 是 → 跳过 JWT 验证 ✅
  └─ 否 → 执行 JWT 验证
      ├─ Token 有效 → 继续执行路由 ✅
      └─ Token 无效/缺失 → 返回 401 Unauthorized ❌
```

---

## 📝 使用方法

### 1. 需要认证的路由（默认）

**不需要做任何操作！** 全局 Guard 会自动保护所有路由。

```typescript
@Controller('api')
export class ApiController {
  // ✅ 这个路由自动需要 JWT 认证
  @Get('protected')
  async protectedEndpoint(@CurrentUser() user: User) {
    return { message: 'This requires authentication', user };
  }
}
```

### 2. 公开路由（不需要认证）

使用 `@Public()` 装饰器标记：

```typescript
import { Public } from '../auth/decorators/public.decorator';

@Controller('api')
export class ApiController {
  // ✅ 标记为公开，不需要 JWT 认证
  @Public()
  @Get('public')
  async publicEndpoint() {
    return { message: 'This is public' };
  }

  // ✅ 这个路由需要 JWT 认证（默认）
  @Get('protected')
  async protectedEndpoint(@CurrentUser() user: User) {
    return { message: 'This requires authentication', user };
  }
}
```

### 3. 整个控制器标记为公开

```typescript
@Public() // 整个控制器的所有路由都是公开的
@Controller('public')
export class PublicController {
  @Get('info')
  async getInfo() {
    return { message: 'All routes in this controller are public' };
  }
}
```

---

## 🔍 当前已标记的公开路由

在 `auth.controller.ts` 中：

```typescript
@Public()
@Post('login/local')        // 本地登录

@Public()
@Post('register/local')     // 本地注册

@Public()
@Get('github')              // GitHub 登录入口

@Public()
@Get('github/callback')     // GitHub 回调
```

---

## ⚠️ 注意事项

### 1. **需要认证的路由**

如果路由需要认证，**不需要**添加 `@UseGuards(JwtAuthGuard)`，全局 Guard 会自动处理。

**之前（不需要了）：**
```typescript
@Get('me')
@UseGuards(AuthGuard('jwt'))  // ❌ 不需要了
async getProfile(@CurrentUser() user: User) {
  return user;
}
```

**现在（自动保护）：**
```typescript
@Get('me')
// ✅ 不需要 @UseGuards，全局 Guard 自动保护
async getProfile(@CurrentUser() user: User) {
  return user;
}
```

### 2. **公开路由必须标记**

如果路由不需要认证，**必须**添加 `@Public()` 装饰器，否则会被全局 Guard 拦截。

### 3. **其他 Guard 可以叠加**

如果需要同时使用其他 Guard（如 `AuthGuard('local')`），可以正常使用：

```typescript
@Public()  // 不需要 JWT 认证
@UseGuards(AuthGuard('local'))  // 但需要本地认证
@Post('login/local')
async loginLocal() {
  // ...
}
```

---

## 📊 对比：全局 Guard vs 手动 Guard

### 之前（手动添加 Guard）

```typescript
@Controller('api')
export class ApiController {
  @Get('public')
  async publicEndpoint() {
    // 不需要认证
  }

  @Get('protected')
  @UseGuards(AuthGuard('jwt'))  // ❌ 每个路由都要手动添加
  async protectedEndpoint(@CurrentUser() user: User) {
    return user;
  }

  @Get('another')
  @UseGuards(AuthGuard('jwt'))  // ❌ 重复代码
  async anotherEndpoint(@CurrentUser() user: User) {
    return user;
  }
}
```

### 现在（全局 Guard）

```typescript
@Controller('api')
export class ApiController {
  @Public()  // ✅ 明确标记公开路由
  @Get('public')
  async publicEndpoint() {
    // 不需要认证
  }

  @Get('protected')
  // ✅ 自动保护，不需要手动添加 Guard
  async protectedEndpoint(@CurrentUser() user: User) {
    return user;
  }

  @Get('another')
  // ✅ 自动保护
  async anotherEndpoint(@CurrentUser() user: User) {
    return user;
  }
}
```

---

## 🎯 优势

1. **代码更简洁**：不需要在每个路由上重复添加 `@UseGuards(AuthGuard('jwt'))`
2. **更安全**：默认所有路由都需要认证，只有明确标记的才是公开的
3. **易于维护**：集中管理认证逻辑
4. **灵活性**：可以轻松标记公开路由

---

## ✅ 总结

- ✅ JWT Guard 已注册为全局 Guard
- ✅ 所有路由默认需要 JWT 认证
- ✅ 使用 `@Public()` 装饰器标记公开路由
- ✅ 认证相关的路由已标记为公开

**现在你的所有 API 路由都默认需要 JWT 认证了！** 🚀

