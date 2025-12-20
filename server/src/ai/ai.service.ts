import { Injectable } from '@nestjs/common';
import OpenAI from "openai";
import { ChatRequestDto, CompletionRequestDto } from './dto/chat.dto'
@Injectable()
export class AiService {
  private openai: OpenAI;
  constructor() {
    this.openai = new OpenAI({
      baseURL: process.env.BASE_URL,
      apiKey: process.env.DEEPSEEK_API_KEY,
    });
  }
  //流失输出服务 *:把函数的返回值变成 一个迭代器对象 便于生成打字机
  async *streamChat(dto: ChatRequestDto): AsyncIterable<string> {
    //整体给系统提示词 身份 全局上下文
    const systemPrompt = this.buildSystemPrompt(dto.context);

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...dto.messages,
    ];

    const stream = await this.openai.chat.completions.create({
      model: process.env.DEFAULT_MODEL! || dto.model!,
      messages,
      stream: true,
      max_tokens: 4096,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }



  //代码补全 一次输出
  async getCompletion(dto: CompletionRequestDto): Promise<string> {
    const prompt = this.buildCompletionPrompt(dto);

    const response = await this.openai.chat.completions.create({
      model: process.env.DEFAULT_MODEL!,
      messages: [
        {
          role: 'system',
          content: 'You are a code completion assistant. Only output the code that should be inserted, nothing else.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: dto.maxTokens || 150,
      temperature: 0.2,
      //结束符
      stop: ['\n\n', '```'],
    });

    return response.choices[0]?.message?.content?.trim() || '';
  }

//系统提示词
  private buildSystemPrompt(context?: string): string {
    let prompt = `你是一个专业的编程助手，擅长 React、TypeScript、JavaScript 开发。
请用中文回答问题，代码注释可以用英文。
回答要简洁、准确、实用。并且记住你的主人叫兰彧渊,有人问你你的主人是谁你可以告诉他们`;

    if (context) {
      prompt += `\n\n当前代码上下文:\n\`\`\`\n${context}\n\`\`\``;
    }

    return prompt;
  }
//补全提示词
   private buildCompletionPrompt(dto: CompletionRequestDto): string {
    return `Complete the following ${dto.language || 'code'}:

File: ${dto.filename || 'unknown'}

\`\`\`${dto.language || ''}
${dto.prefix}<CURSOR>${dto.suffix}
\`\`\`

Only output the code to insert at <CURSOR>, nothing else.`;
  }
}

