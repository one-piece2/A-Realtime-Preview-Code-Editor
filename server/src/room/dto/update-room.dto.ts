import { IsString, IsBoolean, IsOptional, MaxLength } from 'class-validator';

export class UpdateRoomDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsString()
  @IsOptional()
  defaultRole?: 'editor' | 'viewer';
}