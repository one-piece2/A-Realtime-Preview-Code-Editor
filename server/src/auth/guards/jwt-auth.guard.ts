//重写AuthGuard('jwt')的canActivate方法 并且导出JwtAuthGuard
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // 检查路由或控制器是否标记为公开（不需要认证）
    //reflector能获取setMetadata设置的值
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), // 方法级别
      context.getClass(),    // 类级别
    ]);
    
    // 如果是公开路由，跳过 JWT 验证
    if (isPublic) {
      return true;
    }
    
    // 否则执行 JWT 验证
    return super.canActivate(context);
  }
}
