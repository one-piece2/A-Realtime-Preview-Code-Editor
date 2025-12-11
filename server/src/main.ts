import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // 临时开启日志用于调试
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });

  // 配置 CORS，允许前端跨域请求
  // 支持多个前端 URL（用逗号分隔）或单个 URL
  const frontendUrls = process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : ['http://localhost:5173'];
  
  app.enableCors({
    origin: (origin, callback) => {
      // 允许无 origin 的请求（如移动应用、Postman 等）
      if (!origin) {
        return callback(null, true);
      }
      // 检查 origin 是否在允许列表中
      if (frontendUrls.some(url => origin === url || origin.startsWith(url))) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${port}`);
    console.log(`📡 WebSocket Gateway ready`);
    console.log(`✅ CORS enabled for: ${frontendUrls.join(', ')}`);
  });
}
bootstrap();
