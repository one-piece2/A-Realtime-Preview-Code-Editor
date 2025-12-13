import { IsString,IsArray,ValidateNested, IsOptional,IsNumber} from "class-validator";
import { Type } from 'class-transformer';
//这是
export class MessageDto {
  @IsString()
  role: 'user' | 'assistant' | 'system';
 
  @IsString()
  content: string;
}

export class ChatRequestDto {
  @IsArray()
  //数组里的每一项，都是一个 MessageDto，需要递归校验
  @ValidateNested({ each: true })
  //把普通 JSON 对象 → 转成 MessageDto 实例
  @Type(() => MessageDto)
  messages: MessageDto[];

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  context?: string; // 当前代码上下文
}

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