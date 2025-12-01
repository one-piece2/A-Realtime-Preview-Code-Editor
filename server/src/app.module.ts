import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [ChatModule],
  controllers: [AppController],
  // ChatGateway 与 YjsDocumentService 已在 ChatModule 中提供，这里只需要 AppService
  providers: [AppService],
})
export class AppModule {}
