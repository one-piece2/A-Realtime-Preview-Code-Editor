import { Module,forwardRef } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { YjsDocumentService } from './yjs-document.service';
import { RoomModule } from 'src/room/room.module';
import {AuthModule} from 'src/auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
@Module({
  imports: [forwardRef(() => RoomModule),AuthModule,JwtModule],
  providers: [ChatGateway, YjsDocumentService],
   exports: [ChatGateway],
})
export class ChatModule {}
