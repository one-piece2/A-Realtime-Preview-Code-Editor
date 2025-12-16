import { IsEnum } from 'class-validator';
// 不能通过此接口设置ower权限
export class UpdateMemberDto {
  @IsEnum(['editor', 'viewer'])
  role: 'editor' | 'viewer'; 
}