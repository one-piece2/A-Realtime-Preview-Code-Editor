import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from 'src/user/user.module';
import { GithubStrategy } from './strategies/github.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.startegy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  //在auth模块中引入UserModule和注册JwtModule
  imports: [
    UserModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '7d' } as any,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  exports:[AuthService],
  providers: [
    AuthService,
    GithubStrategy,
    JwtStrategy,
    LocalStrategy,


    // 注册 JWT Guard 为全局 Guard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AuthModule {}
