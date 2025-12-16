import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './chat/chat.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { AiModule } from './ai/ai.module';
import { RoomModule } from './room/room.module';
import config from './ormcofig';

@Module({
  imports: [
    //配置数据库
    TypeOrmModule.forRoot(config),
    //可以读取.env文件
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ChatModule,
    AuthModule,
    UserModule,
    AiModule,
    RoomModule,
  ],
  controllers: [AppController],
  // ChatGateway 与 YjsDocumentService 已在 ChatModule 中提供，这里只需要 AppService
  providers: [AppService],
})
export class AppModule {}
