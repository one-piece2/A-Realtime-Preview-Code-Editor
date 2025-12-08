import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from 'src/user/user.module';
@Module({
  //在auth模块中引入UserModule和注册JwtModule
  imports: [UserModule, JwtModule.register({
    secret: process.env.JWT_SECRET,
    signOptions: { expiresIn: process.env.JWT_EXPIRES_IN as any },
  })],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
