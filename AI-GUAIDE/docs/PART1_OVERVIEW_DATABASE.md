# 协同编辑权限体系技术方案 - Part 1: 概述与数据库设计

## 目录
- [1. 系统目标](#1-系统目标)
- [2. 架构设计](#2-架构设计)
- [3. 数据库设计](#3-数据库设计)
- [4. 实施步骤](#4-实施步骤)

---

## 1. 系统目标

### 1.1 核心需求
实现一个 **基于用户登录的多人实时协同编辑平台**：

| 需求 | 说明 |
|------|------|
| 用户必须先登录 | 基于现有 JWT 认证体系 |
| 登录后进入指定房间 | 房间是协同的基本单位 |
| 角色权限控制 | Owner / Editor / Viewer 三种角色 |
| 基于 Yjs 协同编辑 | 不破坏 CRDT 同步机制 |
| 前后端职责分离 | Auth / Room / Sync 三层架构 |

### 1.2 角色定义

| 角色 | 权限 | 说明 |
|------|------|------|
| `owner` | 完全控制 | 房主，可管理成员、修改角色、删除房间 |
| `editor` | 可编辑 | 可编辑文档内容，不能管理成员 |
| `viewer` | 只读 | 只能查看，不能编辑 |

---

## 2. 架构设计

### 2.1 三层分离架构

```
┌─────────────────────────────────────────────────────────────────┐
│                           前端 (Client)                          │
├─────────────────┬─────────────────────┬─────────────────────────┤
│   Auth Store    │     Room Store      │   Collaboration Store   │
│   (JWT/用户)    │  (房间/角色/权限)   │    (Yjs/光标/同步)      │
└────────┬────────┴──────────┬──────────┴────────────┬────────────┘
         │                   │                       │
         ▼                   ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                           后端 (Server)                          │
├─────────────────┬─────────────────────┬─────────────────────────┤
│   Auth Module   │    Room Module      │     Chat Gateway        │
│   (JWT验证)     │ (房间CRUD/成员管理) │   (Yjs同步+权限拦截)    │
└─────────────────┴─────────────────────┴─────────────────────────┘
         │                   │                       │
         ▼                   ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                         数据库 (PostgreSQL)                      │
├─────────────────┬───────────────────────────────────────────────┤
│     users       │            rooms  +  room_members             │
└─────────────────┴───────────────────────────────────────────────┘
```

### 2.2 各层职责

| 层级 | 职责 | 不负责 |
|------|------|--------|
| **Auth 层** | 用户身份认证、JWT 签发/验证 | 不关心房间、不关心协同 |
| **Room 层** | 房间管理、成员管理、角色权限 | 不关心 Yjs 同步细节 |
| **Sync 层** | 文档状态同步 (Yjs CRDT) | 不参与权限判断 |

### 2.3 数据流

```
[用户登录] ──▶ [获取 JWT] ──▶ [创建/加入房间] ──▶ [获取角色]
                                                      │
                                                      ▼
[建立 WebSocket] ◀── [JWT 验证] ◀── [房间成员验证] ◀──┘
        │
        ▼
[加入房间] ──▶ [根据角色设置编辑器状态] ──▶ [协同编辑]
```

---

## 3. 数据库设计

### 3.1 ER 图

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     users       │       │     rooms       │       │  room_members   │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK, UUID)   │       │ id (PK, UUID)   │       │ id (PK, UUID)   │
│ email           │◀──┐   │ roomId (unique) │   ┌──▶│ roomId (FK)     │
│ username        │   │   │ name            │   │   │ userId (FK)     │
│ password        │   │   │ ownerId (FK) ───┼───┘   │ role (enum)     │
│ githubNickname  │   │   │ description     │       │ joinedAt        │
│ githubAvatar    │   └───┼─────────────────┤       │                 │
│ provider        │       │ isPublic        │       └────────┬────────┘
│ providerId      │       │ createdAt       │                │
│ createdAt       │       │ updatedAt       │                │
│ updatedAt       │       └─────────────────┘                │
└─────────────────┘                                          │
        ▲                                                    │
        └────────────────────────────────────────────────────┘
```

### 3.2 Room 实体

**文件路径**: `server/src/room/entities/room.entity.ts`

```typescript
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

  // 用户可见的房间号 (如: "abc-123-xyz")
  @Column({ type: 'varchar', length: 100, unique: true })
  @Index()
  roomId: string;

  // 房间名称
  @Column({ type: 'varchar', length: 255 })
  name: string;

  // 房间描述
  @Column({ type: 'text', nullable: true })
  description: string;

  // 房主 ID (关联 users 表)
  @Column({ type: 'uuid' })
  @Index()
  ownerId: string;

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

  // 关系: 房主
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  // 关系: 房间成员
  @OneToMany(() => RoomMember, (member) => member.room)
  members: RoomMember[];
}
```

### 3.3 RoomMember 实体

**文件路径**: `server/src/room/entities/room-member.entity.ts`

```typescript
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
import { Room } from './room.entity';

// 角色枚举类型
export type RoomRole = 'owner' | 'editor' | 'viewer';

@Entity('room_members')
@Unique(['roomId', 'userId']) // 同一用户在同一房间只能有一条记录
export class RoomMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 房间 ID (关联 rooms 表的主键)
  @Column({ type: 'uuid' })
  @Index()
  roomId: string;

  // 用户 ID (关联 users 表)
  @Column({ type: 'uuid' })
  @Index()
  userId: string;

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

  // 关系: 所属房间
  @ManyToOne(() => Room, (room) => room.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomId' })
  room: Room;

  // 关系: 用户
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
```

### 3.4 数据库迁移

**创建迁移文件**: `server/src/migrations/xxxx-CreateRoomTables.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRoomTables1702800000000 implements MigrationInterface {
  name = 'CreateRoomTables1702800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建 rooms 表
    await queryRunner.query(`
      CREATE TABLE "rooms" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "roomId" varchar(100) NOT NULL,
        "name" varchar(255) NOT NULL,
        "description" text,
        "ownerId" uuid NOT NULL,
        "isPublic" boolean NOT NULL DEFAULT false,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "maxMembers" int NOT NULL DEFAULT 0,
        "defaultRole" varchar(20) NOT NULL DEFAULT 'viewer',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rooms" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_rooms_roomId" UNIQUE ("roomId"),
        CONSTRAINT "FK_rooms_owner" FOREIGN KEY ("ownerId") 
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // 创建 rooms 索引
    await queryRunner.query(`
      CREATE INDEX "IDX_rooms_roomId" ON "rooms" ("roomId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_rooms_ownerId" ON "rooms" ("ownerId")
    `);

    // 创建角色枚举类型
    await queryRunner.query(`
      CREATE TYPE "room_role_enum" AS ENUM ('owner', 'editor', 'viewer')
    `);

    // 创建 room_members 表
    await queryRunner.query(`
      CREATE TABLE "room_members" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "roomId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "role" "room_role_enum" NOT NULL DEFAULT 'viewer',
        "invitedBy" uuid,
        "joinedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "lastActiveAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_room_members" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_room_members_room_user" UNIQUE ("roomId", "userId"),
        CONSTRAINT "FK_room_members_room" FOREIGN KEY ("roomId") 
          REFERENCES "rooms"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_room_members_user" FOREIGN KEY ("userId") 
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // 创建 room_members 索引
    await queryRunner.query(`
      CREATE INDEX "IDX_room_members_roomId" ON "room_members" ("roomId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_room_members_userId" ON "room_members" ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "room_members"`);
    await queryRunner.query(`DROP TYPE "room_role_enum"`);
    await queryRunner.query(`DROP TABLE "rooms"`);
  }
}
```

---

## 4. 实施步骤

### 4.1 Phase 1 检查清单

| 序号 | 任务 | 状态 |
|------|------|------|
| 1.1 | 创建 `server/src/room/` 目录结构 | ⬜ |
| 1.2 | 创建 `room.entity.ts` | ⬜ |
| 1.3 | 创建 `room-member.entity.ts` | ⬜ |
| 1.4 | 在 `app.module.ts` 中注册实体 | ⬜ |
| 1.5 | 生成并运行数据库迁移 | ⬜ |
| 1.6 | 验证数据库表结构 | ⬜ |

### 4.2 目录结构

```
server/src/room/
├── entities/
│   ├── room.entity.ts          # Room 实体
│   └── room-member.entity.ts   # RoomMember 实体
├── dto/
│   ├── create-room.dto.ts      # 创建房间 DTO
│   ├── update-room.dto.ts      # 更新房间 DTO
│   ├── join-room.dto.ts        # 加入房间 DTO
│   └── update-member.dto.ts    # 更新成员 DTO
├── room.controller.ts          # REST API 控制器
├── room.service.ts             # 业务逻辑服务
├── room.guard.ts               # 权限守卫
└── room.module.ts              # 模块定义
```

---

## 下一步

请继续阅读 **Part 2: 后端 Room 模块实现** (`PART2_BACKEND_ROOM_MODULE.md`)
