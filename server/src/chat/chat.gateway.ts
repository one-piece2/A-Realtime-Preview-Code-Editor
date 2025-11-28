import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { ACTIONS } from 'src/action';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway  {
  @SubscribeMessage(ACTIONS.JOIN)
  handleMessage(client: any, payload: any): string {
    return 'Hello world!';
  }
}
