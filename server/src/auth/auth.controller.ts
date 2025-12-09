import { Controller, Post, Get, UseGuards, Req, Res, Body, HttpCode, HttpStatus, UsePipes, ValidationPipe } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { User } from 'src/user/entities/user.entitiey';
import { LoginDto } from 'src/dto/login.user.dto';
import { RegisterDto } from 'src/dto/register.user.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
// 扩展 Express Request 类型，添加 user 属性
declare module 'express' {
  interface Request {
    user?: User; // LocalStrategy.validate() 返回的是 User 类型
  }
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 本地登录（邮箱+密码）
   * POST /auth/login/local
   * Body: { email: "user@example.com", password: "123456" }
   */
  @Public() // 标记为公开路由，不需要 JWT 认证
  @Post('login/local')
  @UseGuards(AuthGuard('local'))
  //开启验证管道
  @UsePipes(new ValidationPipe())
  async loginLocal(@Body() loginDto: LoginDto, @Req() req: Request) {
 //包含用户信息和token
    const tokens = await this.authService.generateTokens(req.user!);
    return tokens;
  }

  /**
   * 本地注册
   * POST /auth/register/local
   * Body: { email: "user@example.com", username: "username", password: "123456" }
   * 
   * 注册成功后会自动登录，返回 JWT Token
   */
  @Public() // 标记为公开路由，不需要 JWT 认证
  @Post('register/local')
  @HttpCode(HttpStatus.CREATED) // 返回 201 Created 状态码
  //开启验证管道
  @UsePipes(new ValidationPipe())
  async registerLocal(@Body() registerDto: RegisterDto) {
    // 注册用户并自动登录（返回 Token）
    const tokens = await this.authService.registerUser(registerDto);
    return tokens;
  }




  //  用户访问此路由 → 重定向到 GitHub 授权页面   用户授权 → GitHub 回调到 /auth/github/callback
  //  后端验证用户信息
  // 如果用户不存在 → 自动创建（注册）
  // 如果用户已存在 → 直接登录
  // 生成 Token 并重定向到前端
  @Public() // 标记为公开路由，不需要 JWT 认证
  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubAuth() {
    // Passport 会自动处理重定向到 GitHub（这个方法不会被执行，只是定义路由）
   
  }

  
  
    //   GitHub 授权后会重定向到这里
    // 此时用户已经通过 GitHub 验证，直接生成 Token 返回
    // findOrCreate() 已经处理了注册/登录逻辑：
    // 如果用户不存在 → 自动创建（注册）
    // 如果用户已存在 → 更新信息并返回（登录）
  @Public() // 标记为公开路由，不需要 JWT 认证
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    // req.user 是 GithubStrategy.validate() 返回的用户
    // findOrCreate() 已经处理了注册/登录逻辑
    
    const tokens = await this.authService.generateTokens(req.user!);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    
    // 重定向到前端，携带 Token
    res.redirect(
      `${frontendUrl}/auth/callback?token=${tokens.accessToken}&refresh=${tokens.refreshToken || ''}`
    );
  }
}
//   /**
//    * 刷新 Access Token
//    * POST /auth/refresh
//    * Body: { refreshToken: "..." }
//    * 
//    * ⚠️ 注意：这个接口应该是公开的，因为用户可能只有 refreshToken
//    */
//   @Public()
//   @Post('refresh')
//   async refresh(@Body('refreshToken') refreshToken: string) {
//     return this.authService.refreshToken(refreshToken);
//   }

//   /**
//    * 获取当前用户信息
//    * GET /auth/me
//    * 
//    * ⚠️ 注意：这个接口需要 JWT 认证（默认保护，不需要 @Public()）
//    * 需要在请求头中携带：Authorization: Bearer <accessToken>
//    */
//   @Get('me')
//   async getProfile(@CurrentUser() user: User) {
//     return {
//       id: user.id,
//       email: user.email,
//       username: user.username,
//       githubNickname: user.githubNickname,
//       githubAvatar: user.githubAvatar,
//       provider: user.provider,
//     };
//   }
// }
