import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Unique,
    Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entitiey';
import { Room } from './room.entitiey';

// 角色枚举类型
export type RoomRole = 'owner' | 'editor' | 'viewer';

@Entity('room_members')
//一个userId 在一个roomId中只能有一条成员记录 防止重复加入
@Unique(['roomId', 'userId'])
export class RoomMember {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 用户角色
    @Column({
        type: 'enum',
        enum: ['owner', 'editor', 'viewer'],
        default: 'viewer',
    })
    role: RoomRole;

    // 邀请人 ID (可选，记录谁邀请了该成员)
    @Column({ type: 'uuid', nullable: true })
    invitedBy: string;

    // 加入时间
    @CreateDateColumn()
    joinedAt: Date;

    // 最后活跃时间
    @UpdateDateColumn()
    lastActiveAt: Date;


    // 房间 ID (关联 rooms 表的主键)
    @Column({ type: 'uuid' })
    @Index()
    roomId: string;

    // 关系: 所属房间
    @ManyToOne(() => Room, (room) => room.members, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'roomId' })
    room: Room;

       // 用户 ID (关联 users 表)
    @Column({ type: 'uuid' })
    @Index()
    userId: string;

    // 关系: 用户
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

}