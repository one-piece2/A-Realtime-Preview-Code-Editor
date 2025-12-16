import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entitiey';
import { RoomMember } from './room-member.entity';

@Entity('rooms')
export class Room {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100, unique: true })
    @Index()
    roomId: string;

    // 房间名称
    @Column({ type: 'varchar', length: 255 })
    name: string;

    // 房间描述
    @Column({ type: 'text', nullable: true })
    description: string;



    // 是否公开房间 (公开房间可被搜索和自由加入)
    @Column({ type: 'boolean', default: false })
    isPublic: boolean;


    // 房间状态: active, archived, deleted
    @Column({ type: 'varchar', length: 20, default: 'active' })
    status: string;

    // 最大成员数 (0 表示无限制)
    @Column({ type: 'int', default: 0 })
    maxMembers: number;

    // 默认新成员角色
    @Column({ type: 'varchar', length: 20, default: 'viewer' })
    defaultRole: 'editor' | 'viewer';

    // 时间戳
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;


    // 房主 ID (关联 user 表)
    @Column({ type: 'uuid' })
    @Index()
    ownerId: string;


    // 关系: 房主  多个房间对应一个房主
    //onDelete: 'CASCADE' 表示：如果这个 User 被删除，所有他拥有的房间也会自动删除
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    //告诉 TypeORM，ownerId 字段是外键  用ownerId作为外键关联到User表的主键
    @JoinColumn({ name: 'ownerId' })
    //这是关系对象本身，当查询房间的时候，可以获得完整的User对象
    owner: User;



    // 关系: 房间成员
    //一个 Room 对应多个 RoomMember，反向通过 RoomMember.room 关联
    @OneToMany(() => RoomMember, (member) => member.room)
    members: RoomMember[];
}



