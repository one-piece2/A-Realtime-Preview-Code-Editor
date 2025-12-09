import { SetMetadata } from '@nestjs/common';

/**
 * 公开路由装饰器
 * 使用此装饰器标记的路由不需要 JWT 认证
 * 
 * 使用示例：
 * @Public()
 * @Get('public-endpoint')
 * async publicEndpoint() {
 *   return { message: 'This is public' };
 * }
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

