import { IsString, IsOptional } from 'class-validator';
export class JoinRoomDto {
  @IsString()
  @IsOptional()
  inviteCode?: string; // 可选的邀请码
}