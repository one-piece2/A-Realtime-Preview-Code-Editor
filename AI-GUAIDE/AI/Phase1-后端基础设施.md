# Phase 1: 后端基础设施 (NestJS)

> 搭建通往 LLM 的安全桥梁

## 1. 目标概述

构建一个安全、可扩展的 NestJS 后端服务，作为前端与 LLM API（如 DeepSeek）之间的代理层。

### 核心价值
- **安全性**: API Key 存储在服务端，前端无法直接访问
- **流式响应**: 支持 SSE (Server-Sent Events) 实现实时流式输出
- **统一接口**: 为前端提供标准化的 AI 交互接口

---

## 2. 目录结构

```
server/src/ai/
├── ai.module.ts          # AI 模块定义
├── ai.controller.ts      # 控制器 - 处理 HTTP 请求
├── ai.service.ts         # 服务层 - 封装 OpenAI SDK
├── dto/
│   ├── chat.dto.ts       # 聊天请求 DTO
│   └── completion.dto.ts # 代码补全请求 DTO
└── interfaces/
    └── ai.interface.ts   # 类型定义
```

---

## 3. 实施步骤

### 3.1 环境变量配置

**文件**: `server/.env`

```env
# DeepSeek API 配置
DEEPSEEK_API_KEY=your_api_key_here
BASE_URL=https://api.deepseek.com/v1

# 可选：模型配置
DEFAULT_MODEL=deepseek-chat
MAX_TOKENS=4096
```

**文件**: `server/src/app.module.ts` (添加 ConfigModule)

```typescript
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // ... 其他模块
  ],
})
export class AppModule {}
```

### 3.2 安装依赖

```bash
cd server
npm install openai @nestjs/config
npm install -D @types/node
```

### 3.3 创建 DTO 文件

**文件**: `server/src/ai/dto/chat.dto.ts`

```typescript
import { IsString, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MessageDto {
  @IsString()
  role: 'user' | 'assistant' | 'system';

  @IsString()
  content: string;
}

export class ChatRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages: MessageDto[];

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  context?: string; // 当前代码上下文
}
```

**文件**: `server/src/ai/dto/completion.dto.ts`

```typescript
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CompletionRequestDto {
  @IsString()
  prefix: string; // 光标前的代码

  @IsString()
  suffix: string; // 光标后的代码

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  filename?: string;

  @IsOptional()
  @IsNumber()
  maxTokens?: number;
}
```

### 3.4 实现 AI Service

**文件**: `server/src/ai/ai.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatRequestDto } from './dto/chat.dto';
import { CompletionRequestDto } from './dto/completion.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      baseURL: this.configService.get<string>('BASE_URL'),
      apiKey: this.configService.get<string>('DEEPSEEK_API_KEY'),
    });
  }

  /**
   * 流式聊天 - 返回 AsyncIterable
   */
  async *streamChat(dto: ChatRequestDto): AsyncIterable<string> {
    const systemPrompt = this.buildSystemPrompt(dto.context);
    
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...dto.messages,
    ];

    const stream = await this.openai.chat.completions.create({
      model: dto.model || 'deepseek-chat',
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

  /**
   * 代码补全 - 用于 Ghost Text
   */
  async getCompletion(dto: CompletionRequestDto): Promise<string> {
    const prompt = this.buildCompletionPrompt(dto);

    const response = await this.openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a code completion assistant. Only output the code that should be inserted, nothing else.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: dto.maxTokens || 150,
      temperature: 0.2,
      stop: ['\n\n', '```'],
    });

    return response.choices[0]?.message?.content?.trim() || '';
  }

  private buildSystemPrompt(context?: string): string {
    let prompt = `你是一个专业的编程助手，擅长 React、TypeScript、JavaScript 开发。
请用中文回答问题，代码注释可以用英文。
回答要简洁、准确、实用。`;

    if (context) {
      prompt += `\n\n当前代码上下文:\n\`\`\`\n${context}\n\`\`\``;
    }

    return prompt;
  }

  private buildCompletionPrompt(dto: CompletionRequestDto): string {
    return `Complete the following ${dto.language || 'code'}:

File: ${dto.filename || 'unknown'}

\`\`\`${dto.language || ''}
${dto.prefix}<CURSOR>${dto.suffix}
\`\`\`

Only output the code to insert at <CURSOR>, nothing else.`;
  }
}
```

### 3.5 实现 AI Controller (SSE 流式响应)

**文件**: `server/src/ai/ai.controller.ts`

```typescript
import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { AiService } from './ai.service';
import { ChatRequestDto } from './dto/chat.dto';
import { CompletionRequestDto } from './dto/completion.dto';

@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(private readonly aiService: AiService) {}

  /**
   * 流式聊天接口 - SSE
   * POST /ai/chat/stream
   */
  @Post('chat/stream')
  async streamChat(
    @Body() dto: ChatRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    // 设置 SSE 响应头
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
      this.logger.error('Stream chat error:', error);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }

  /**
   * 代码补全接口
   * POST /ai/completion
   */
  @Post('completion')
  async getCompletion(@Body() dto: CompletionRequestDto) {
    try {
      const completion = await this.aiService.getCompletion(dto);
      return {
        success: true,
        data: { completion },
      };
    } catch (error) {
      this.logger.error('Completion error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
```

### 3.6 更新 AI Module

**文件**: `server/src/ai/ai.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
```

---

## 4. API 接口规范

### 4.1 流式聊天

```
POST /ai/chat/stream
Content-Type: application/json

Request:
{
  "messages": [
    { "role": "user", "content": "如何在 React 中使用 useEffect?" }
  ],
  "context": "// 当前编辑器中的代码..."
}

Response (SSE):
data: {"content": "在"}
data: {"content": " React"}
data: {"content": " 中"}
...
data: {"done": true}
```

### 4.2 代码补全

```
POST /ai/completion
Content-Type: application/json

Request:
{
  "prefix": "function add(a, b) {\n  ",
  "suffix": "\n}",
  "language": "typescript",
  "filename": "utils.ts"
}

Response:
{
  "success": true,
  "data": {
    "completion": "return a + b;"
  }
}
```

---

## 5. 安全考虑

| 风险 | 解决方案 |
|------|----------|
| API Key 泄露 | 存储在服务端环境变量，前端无法访问 |
| 请求频率限制 | 可添加 @nestjs/throttler 限流 |
| 输入验证 | 使用 class-validator 验证 DTO |
| CORS | 配置允许的前端域名 |

---

## 6. 测试验证

```bash
# 测试流式聊天
curl -X POST http://localhost:3000/ai/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'

# 测试代码补全
curl -X POST http://localhost:3000/ai/completion \
  -H "Content-Type: application/json" \
  -d '{"prefix":"const x = ","suffix":"","language":"typescript"}'
```

---

## 7. 下一步

完成 Phase 1 后，进入 **Phase 2: 前端核心逻辑**，实现：
- `useAIChat` Hook - 管理聊天状态和流式请求
- `useChatStorage` Hook - 本地持久化聊天记录
- AI 模块的 Zustand Store
