import { Controller,Post,Body,Res } from '@nestjs/common';
import { AiService } from './ai.service';
import { ChatRequestDto ,CompletionRequestDto} from './dto/chat.dto';
import { Public } from '../auth/decorators/public.decorator'
import { type Response } from 'express';
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

@Public()
@Post('chat/stream')
  async streamChat(@Body() dto: ChatRequestDto , @Res() res: Response){
      // 设置 SSE 响应头 建立长连接
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    try {
      for await (const chunk of this.aiService.streamChat(dto)) {
        // SSE 格式: data: <content>\n\n
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
      
      // 发送结束信号
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
   
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
  //补全接口
  @Post('completion')
  async getCompletion(@Body() dto: CompletionRequestDto) {
    try {
      const completion = await this.aiService.getCompletion(dto);
      return {
        success: true,
        data: { completion },
      };
    } catch (error) {
    
      return {
        success: false,
        error: error.message,
      };
    }
  }


}

