import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany
} from 'typeorm';
import { RoomMember } from '../../room/entities/room-member.entity';
import { Room } from '../../room/entities/room.entitiey';
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

  // 关系: 用户加入的房间 作为成员的记录
  @OneToMany(() => RoomMember, (member) => member.user)
  roomMembers: RoomMember[];

  // 关系: 用户拥有的房间
  @OneToMany(() => Room, (room) => room.owner)
  ownedRooms: Room[];
}
