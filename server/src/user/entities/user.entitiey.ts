import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 账号信息
  @Column({ type: 'varchar', length: 255, unique: true })
  @Index()
  email: string;

  @Column({ type: 'varchar', length: 100 })
  username: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string; // 密码（非GitHub登录时使用）

  // GitHub 信息
  @Column({ type: 'varchar', length: 100, nullable: true })
  githubNickname: string; // GitHub 昵称

  @Column({ type: 'text', nullable: true })
  githubAvatar: string; // GitHub 头像 URL

  // 认证提供商
  @Column({ type: 'varchar', length: 50, default: 'local' })
  provider: string; // 'github', 'google', 'local'

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index()
  providerId: string; // OAuth 提供商的用户 ID（GitHub登录时使用）

  // 时间戳
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
