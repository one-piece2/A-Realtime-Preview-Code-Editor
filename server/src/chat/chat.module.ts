import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { YjsDocumentService } from './yjs-document.service';

@Module({
  providers: [ChatGateway, YjsDocumentService],
})
export class ChatModule {}
