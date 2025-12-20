# 协同编辑权限体系技术方案 - Part 6: 测试方案

## 目录
- [1. 测试策略](#1-测试策略)
- [2. 单元测试](#2-单元测试)
- [3. 集成测试](#3-集成测试)
- [4. E2E 测试](#4-e2e-测试)
- [5. 边界情况处理](#5-边界情况处理)
- [6. 实施检查清单](#6-实施检查清单)

---

## 1. 测试策略

### 1.1 测试金字塔

```
                    ┌───────────┐
                    │   E2E     │  ← 少量，覆盖关键流程
                    │  Tests    │
                   ─┴───────────┴─
                  ┌───────────────┐
                  │  Integration  │  ← 中等，API + WebSocket
                  │    Tests      │
                 ─┴───────────────┴─
                ┌───────────────────┐
                │    Unit Tests     │  ← 大量，Service 层
                └───────────────────┘
```

### 1.2 测试范围

| 层级 | 测试类型 | 测试工具 | 覆盖目标 |
|------|----------|----------|----------|
| 后端 Service | 单元测试 | Jest | RoomService 所有方法 |
| 后端 Controller | 集成测试 | Jest + Supertest | REST API |
| WebSocket | 集成测试 | Jest + Socket.IO Client | 鉴权 + 权限拦截 |
| 前端 Store | 单元测试 | Vitest | Room/Collaboration Store |
| 前端组件 | 组件测试 | Vitest + Testing Library | 权限相关组件 |
| 全流程 | E2E 测试 | Playwright | 完整用户场景 |

---

## 2. 单元测试

### 2.1 RoomService 测试

**文件路径**: `server/src/room/room.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomService } from './room.service';
import { Room } from './entities/room.entity';
import { RoomMember } from './entities/room-member.entity';
import { ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';

describe('RoomService', () => {
  let service: RoomService;
  let roomRepo: jest.Mocked<Repository<Room>>;
  let memberRepo: jest.Mocked<Repository<RoomMember>>;

  const mockUser = { id: 'user-1', email: 'test@test.com', username: 'testuser' };
  const mockRoom = {
    id: 'room-uuid',
    roomId: 'abc-123-xyz',
    name: 'Test Room',
    ownerId: 'user-1',
    isPublic: false,
    status: 'active',
    defaultRole: 'viewer',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomService,
        {
          provide: getRepositoryToken(Room),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RoomMember),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            remove: jest.fn(),
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RoomService>(RoomService);
    roomRepo = module.get(getRepositoryToken(Room));
    memberRepo = module.get(getRepositoryToken(RoomMember));
  });

  // ==================== 房间创建测试 ====================

  describe('createRoom', () => {
    it('应该成功创建房间并将创建者设为 owner', async () => {
      const createDto = { name: 'New Room', description: 'Test' };
      
      roomRepo.create.mockReturnValue(mockRoom as any);
      roomRepo.save.mockResolvedValue(mockRoom as any);
      memberRepo.save.mockResolvedValue({ role: 'owner' } as any);

      const result = await service.createRoom('user-1', createDto);

      expect(result.name).toBe('New Room');
      expect(memberRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'owner', userId: 'user-1' })
      );
    });

    it('应该生成格式正确的 roomId (xxx-xxx-xxx)', async () => {
      roomRepo.create.mockImplementation((data) => data as any);
      roomRepo.save.mockImplementation((data) => Promise.resolve(data as any));
      memberRepo.save.mockResolvedValue({} as any);

      const result = await service.createRoom('user-1', { name: 'Test' });

      expect(result.roomId).toMatch(/^[a-z0-9]{3}-[a-z0-9]{3}-[a-z0-9]{3}$/);
    });
  });

  // ==================== 房间获取测试 ====================

  describe('getRoomByRoomId', () => {
    it('应该返回存在的房间', async () => {
      roomRepo.findOne.mockResolvedValue(mockRoom as any);

      const result = await service.getRoomByRoomId('abc-123-xyz');

      expect(result).toEqual(mockRoom);
    });

    it('房间不存在时应该抛出 NotFoundException', async () => {
      roomRepo.findOne.mockResolvedValue(null);

      await expect(service.getRoomByRoomId('not-exist')).rejects.toThrow(NotFoundException);
    });

    it('已删除的房间应该抛出 NotFoundException', async () => {
      roomRepo.findOne.mockResolvedValue(null); // status: 'active' 条件不匹配

      await expect(service.getRoomByRoomId('deleted-room')).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== 加入房间测试 ====================

  describe('joinRoom', () => {
    it('公开房间应该允许加入', async () => {
      const publicRoom = { ...mockRoom, isPublic: true };
      roomRepo.findOne.mockResolvedValue(publicRoom as any);
      memberRepo.findOne.mockResolvedValue(null); // 不是成员
      memberRepo.count.mockResolvedValue(0);
      memberRepo.create.mockReturnValue({ role: 'viewer' } as any);
      memberRepo.save.mockResolvedValue({ role: 'viewer' } as any);

      const result = await service.joinRoom('abc-123-xyz', 'user-2');

      expect(result.role).toBe('viewer');
    });

    it('私有房间应该拒绝加入', async () => {
      roomRepo.findOne.mockResolvedValue(mockRoom as any); // isPublic: false
      memberRepo.findOne.mockResolvedValue(null);

      await expect(service.joinRoom('abc-123-xyz', 'user-2')).rejects.toThrow(ForbiddenException);
    });

    it('已是成员时应该抛出 ConflictException', async () => {
      roomRepo.findOne.mockResolvedValue({ ...mockRoom, isPublic: true } as any);
      memberRepo.findOne.mockResolvedValue({ role: 'editor' } as any); // 已是成员

      await expect(service.joinRoom('abc-123-xyz', 'user-1')).rejects.toThrow(ConflictException);
    });

    it('房间成员已满时应该拒绝加入', async () => {
      const fullRoom = { ...mockRoom, isPublic: true, maxMembers: 5 };
      roomRepo.findOne.mockResolvedValue(fullRoom as any);
      memberRepo.findOne.mockResolvedValue(null);
      memberRepo.count.mockResolvedValue(5); // 已满

      await expect(service.joinRoom('abc-123-xyz', 'user-2')).rejects.toThrow(ForbiddenException);
    });
  });

  // ==================== 角色权限测试 ====================

  describe('updateMemberRole', () => {
    it('owner 可以修改其他成员角色', async () => {
      roomRepo.findOne.mockResolvedValue(mockRoom as any);
      memberRepo.findOne
        .mockResolvedValueOnce({ role: 'owner', userId: 'user-1' } as any) // 操作者
        .mockResolvedValueOnce({ role: 'viewer', userId: 'user-2' } as any); // 目标
      memberRepo.save.mockResolvedValue({ role: 'editor' } as any);

      const result = await service.updateMemberRole(
        'abc-123-xyz',
        'user-1',
        'user-2',
        { role: 'editor' }
      );

      expect(result.role).toBe('editor');
    });

    it('非 owner 不能修改角色', async () => {
      roomRepo.findOne.mockResolvedValue(mockRoom as any);
      memberRepo.findOne.mockResolvedValue({ role: 'editor', userId: 'user-2' } as any);

      await expect(
        service.updateMemberRole('abc-123-xyz', 'user-2', 'user-3', { role: 'viewer' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('不能修改自己的角色', async () => {
      roomRepo.findOne.mockResolvedValue(mockRoom as any);
      memberRepo.findOne.mockResolvedValue({ role: 'owner', userId: 'user-1' } as any);

      await expect(
        service.updateMemberRole('abc-123-xyz', 'user-1', 'user-1', { role: 'editor' })
      ).rejects.toThrow();
    });
  });

  // ==================== 编辑权限检查测试 ====================

  describe('canEdit', () => {
    it('owner 应该可以编辑', async () => {
      roomRepo.findOne.mockResolvedValue(mockRoom as any);
      memberRepo.findOne.mockResolvedValue({ role: 'owner' } as any);

      const result = await service.canEdit('abc-123-xyz', 'user-1');

      expect(result).toBe(true);
    });

    it('editor 应该可以编辑', async () => {
      roomRepo.findOne.mockResolvedValue(mockRoom as any);
      memberRepo.findOne.mockResolvedValue({ role: 'editor' } as any);

      const result = await service.canEdit('abc-123-xyz', 'user-2');

      expect(result).toBe(true);
    });

    it('viewer 不应该可以编辑', async () => {
      roomRepo.findOne.mockResolvedValue(mockRoom as any);
      memberRepo.findOne.mockResolvedValue({ role: 'viewer' } as any);

      const result = await service.canEdit('abc-123-xyz', 'user-3');

      expect(result).toBe(false);
    });

    it('非成员不应该可以编辑', async () => {
      roomRepo.findOne.mockResolvedValue(mockRoom as any);
      memberRepo.findOne.mockResolvedValue(null);

      const result = await service.canEdit('abc-123-xyz', 'user-4');

      expect(result).toBe(false);
    });
  });
});
```

### 2.2 前端 Store 测试

**文件路径**: `client/src/modules/room/__tests__/store.test.ts`

```typescript
import { act, renderHook } from '@testing-library/react';
import { useRoomStore } from '../store';
import { roomApi } from '../api';

// Mock API
jest.mock('../api');
const mockedApi = roomApi as jest.Mocked<typeof roomApi>;

describe('RoomStore', () => {
  beforeEach(() => {
    // 重置 store
    useRoomStore.setState({
      currentRoom: null,
      myRole: null,
      members: [],
      ownedRooms: [],
      joinedRooms: [],
      isLoading: false,
      error: null,
    });
  });

  describe('createRoom', () => {
    it('创建成功后应该更新 ownedRooms', async () => {
      const newRoom = { id: '1', roomId: 'abc-123', name: 'Test' };
      mockedApi.createRoom.mockResolvedValue(newRoom as any);

      const { result } = renderHook(() => useRoomStore());

      await act(async () => {
        await result.current.createRoom({ name: 'Test' });
      });

      expect(result.current.ownedRooms).toContainEqual(newRoom);
    });

    it('创建失败应该设置 error', async () => {
      mockedApi.createRoom.mockRejectedValue({
        response: { data: { message: '创建失败' } },
      });

      const { result } = renderHook(() => useRoomStore());

      await act(async () => {
        try {
          await result.current.createRoom({ name: 'Test' });
        } catch {}
      });

      expect(result.current.error).toBe('创建失败');
    });
  });

  describe('updateMyRole', () => {
    it('角色变更应该更新 canEdit', () => {
      const { result } = renderHook(() => useRoomStore());

      act(() => {
        result.current.setCurrentRoom({ roomId: 'abc' } as any, 'editor');
      });

      // 检查通过 selector
      expect(result.current.myRole).toBe('editor');
    });
  });
});
```

---

## 3. 集成测试

### 3.1 Room API 测试

**文件路径**: `server/src/room/room.controller.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entitiey';

describe('RoomController (Integration)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let userToken: string;
  let user2Token: string;
  let createdRoomId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);

    // 创建测试用户 token
    userToken = jwtService.sign({ sub: 'user-1', email: 'user1@test.com', username: 'user1' });
    user2Token = jwtService.sign({ sub: 'user-2', email: 'user2@test.com', username: 'user2' });
  });

  afterAll(async () => {
    await app.close();
  });

  // ==================== 房间 CRUD 测试 ====================

  describe('POST /rooms', () => {
    it('认证用户应该能创建房间', async () => {
      const response = await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Integration Test Room', description: 'Test' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.roomId).toMatch(/^[a-z0-9]{3}-[a-z0-9]{3}-[a-z0-9]{3}$/);
      
      createdRoomId = response.body.data.roomId;
    });

    it('未认证应该返回 401', async () => {
      await request(app.getHttpServer())
        .post('/rooms')
        .send({ name: 'Test' })
        .expect(401);
    });

    it('缺少必填字段应该返回 400', async () => {
      await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${userToken}`)
        .send({}) // 缺少 name
        .expect(400);
    });
  });

  describe('GET /rooms/:roomId', () => {
    it('成员应该能获取房间详情', async () => {
      const response = await request(app.getHttpServer())
        .get(`/rooms/${createdRoomId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.room.roomId).toBe(createdRoomId);
      expect(response.body.data.myRole).toBe('owner');
    });

    it('非成员访问私有房间应该返回 403', async () => {
      await request(app.getHttpServer())
        .get(`/rooms/${createdRoomId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);
    });
  });

  // ==================== 成员管理测试 ====================

  describe('PATCH /rooms/:roomId/members/:userId', () => {
    it('owner 可以修改成员角色', async () => {
      // 先邀请 user2 (需要先设置房间为公开或实现邀请接口)
      // 这里假设已经加入

      const response = await request(app.getHttpServer())
        .patch(`/rooms/${createdRoomId}/members/user-2`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ role: 'editor' })
        .expect(200);

      expect(response.body.data.role).toBe('editor');
    });

    it('非 owner 不能修改角色', async () => {
      await request(app.getHttpServer())
        .patch(`/rooms/${createdRoomId}/members/user-1`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ role: 'viewer' })
        .expect(403);
    });
  });
});
```

### 3.2 WebSocket 鉴权测试

**文件路径**: `server/src/chat/chat.gateway.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../app.module';
import { ACTIONS } from '../action';

describe('ChatGateway (Integration)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let ownerSocket: Socket;
  let editorSocket: Socket;
  let viewerSocket: Socket;
  let unauthorizedSocket: Socket;

  const roomId = 'test-room-123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(3001);

    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    ownerSocket?.disconnect();
    editorSocket?.disconnect();
    viewerSocket?.disconnect();
    unauthorizedSocket?.disconnect();
    await app.close();
  });

  // ==================== 连接鉴权测试 ====================

  describe('连接鉴权', () => {
    it('有效 token 应该成功连接', (done) => {
      const token = jwtService.sign({ sub: 'owner-1', email: 'owner@test.com', username: 'owner' });

      ownerSocket = io('http://localhost:3001', {
        auth: { token },
        transports: ['websocket'],
      });

      ownerSocket.on('connect', () => {
        expect(ownerSocket.connected).toBe(true);
        done();
      });
    });

    it('无 token 应该被断开', (done) => {
      unauthorizedSocket = io('http://localhost:3001', {
        transports: ['websocket'],
      });

      unauthorizedSocket.on(ACTIONS.ERROR, (error) => {
        expect(error.code).toBe('UNAUTHORIZED');
      });

      unauthorizedSocket.on('disconnect', () => {
        done();
      });
    });

    it('无效 token 应该被断开', (done) => {
      const socket = io('http://localhost:3001', {
        auth: { token: 'invalid-token' },
        transports: ['websocket'],
      });

      socket.on(ACTIONS.ERROR, (error) => {
        expect(error.code).toBe('TOKEN_INVALID');
      });

      socket.on('disconnect', () => {
        socket.close();
        done();
      });
    });
  });

  // ==================== 房间加入测试 ====================

  describe('加入房间', () => {
    it('成员应该能成功加入房间', (done) => {
      ownerSocket.emit(ACTIONS.JOIN, { roomId });

      ownerSocket.on(ACTIONS.JOINED, (data) => {
        expect(data.role).toBe('owner');
        expect(data.clients.length).toBeGreaterThan(0);
        done();
      });
    });

    it('非成员应该收到错误', (done) => {
      const token = jwtService.sign({ sub: 'stranger', email: 's@test.com', username: 'stranger' });

      const strangerSocket = io('http://localhost:3001', {
        auth: { token },
        transports: ['websocket'],
      });

      strangerSocket.on('connect', () => {
        strangerSocket.emit(ACTIONS.JOIN, { roomId });
      });

      strangerSocket.on(ACTIONS.ERROR, (error) => {
        expect(error.code).toBe('NOT_MEMBER');
        strangerSocket.disconnect();
        done();
      });
    });
  });

  // ==================== 权限拦截测试 ====================

  describe('Y_UPDATE 权限', () => {
    it('owner/editor 发送 Y_UPDATE 应该被广播', (done) => {
      const update = new Uint8Array([1, 2, 3]);

      // editor 监听广播
      editorSocket.on(ACTIONS.Y_UPDATE, (data) => {
        expect(data.roomId).toBe(roomId);
        done();
      });

      // owner 发送更新
      ownerSocket.emit(ACTIONS.Y_UPDATE, { roomId, update });
    });

    it('viewer 发送 Y_UPDATE 应该被拒绝', (done) => {
      const update = new Uint8Array([1, 2, 3]);

      viewerSocket.on(ACTIONS.ERROR, (error) => {
        expect(error.code).toBe('NO_EDIT_PERMISSION');
        done();
      });

      viewerSocket.emit(ACTIONS.Y_UPDATE, { roomId, update });
    });
  });

  // ==================== 角色变更测试 ====================

  describe('角色变更通知', () => {
    it('角色变更后用户应该收到 ROLE_CHANGED', (done) => {
      editorSocket.on(ACTIONS.ROLE_CHANGED, (data) => {
        expect(data.roomId).toBe(roomId);
        expect(data.role).toBe('viewer');
        done();
      });

      // 模拟 owner 通过 API 修改 editor 的角色
      // 这需要调用 RoomController.updateMemberRole
    });
  });
});
```

---

## 4. E2E 测试

### 4.1 Playwright 测试

**文件路径**: `e2e/collaboration.spec.ts`

```typescript
import { test, expect, Page } from '@playwright/test';

test.describe('协同编辑权限系统', () => {
  let ownerPage: Page;
  let editorPage: Page;
  let viewerPage: Page;

  test.beforeAll(async ({ browser }) => {
    // 创建三个独立的浏览器上下文
    const ownerContext = await browser.newContext();
    const editorContext = await browser.newContext();
    const viewerContext = await browser.newContext();

    ownerPage = await ownerContext.newPage();
    editorPage = await editorContext.newPage();
    viewerPage = await viewerContext.newPage();
  });

  test.afterAll(async () => {
    await ownerPage.close();
    await editorPage.close();
    await viewerPage.close();
  });

  test('完整协作流程', async () => {
    // 1. Owner 登录并创建房间
    await test.step('Owner 登录', async () => {
      await ownerPage.goto('/login');
      await ownerPage.fill('[name="email"]', 'owner@test.com');
      await ownerPage.fill('[name="password"]', 'password123');
      await ownerPage.click('button[type="submit"]');
      await expect(ownerPage).toHaveURL('/rooms');
    });

    await test.step('Owner 创建房间', async () => {
      await ownerPage.click('text=创建房间');
      await ownerPage.fill('[name="name"]', 'E2E Test Room');
      await ownerPage.click('text=公开房间'); // 设为公开
      await ownerPage.click('button[type="submit"]');
      
      // 应该跳转到编辑器页面
      await expect(ownerPage).toHaveURL(/\/editor\/[a-z0-9-]+/);
    });

    // 获取房间 ID
    const roomUrl = ownerPage.url();
    const roomId = roomUrl.split('/editor/')[1];

    // 2. Editor 登录并加入房间
    await test.step('Editor 登录并加入', async () => {
      await editorPage.goto('/login');
      await editorPage.fill('[name="email"]', 'editor@test.com');
      await editorPage.fill('[name="password"]', 'password123');
      await editorPage.click('button[type="submit"]');

      await editorPage.goto(`/editor/${roomId}`);
      
      // 应该能加入公开房间
      await expect(editorPage.locator('.monaco-editor')).toBeVisible();
    });

    // 3. Viewer 登录并加入
    await test.step('Viewer 登录并加入', async () => {
      await viewerPage.goto('/login');
      await viewerPage.fill('[name="email"]', 'viewer@test.com');
      await viewerPage.fill('[name="password"]', 'password123');
      await viewerPage.click('button[type="submit"]');

      await viewerPage.goto(`/editor/${roomId}`);
    });

    // 4. Owner 修改角色
    await test.step('Owner 设置角色', async () => {
      // 打开成员面板
      await ownerPage.click('[data-testid="member-list"]');
      
      // 将 editor 设为 editor
      await ownerPage.click(`[data-testid="member-editor@test.com"] >> [data-testid="more-menu"]`);
      await ownerPage.click('text=设为编辑者');
      
      // 将 viewer 保持为 viewer (默认)
    });

    // 5. 测试编辑权限
    await test.step('测试 Owner 可以编辑', async () => {
      const editor = ownerPage.locator('.monaco-editor textarea');
      await editor.fill('Hello from Owner');
      
      // 等待同步
      await ownerPage.waitForTimeout(500);
      
      // Editor 和 Viewer 应该看到内容
      await expect(editorPage.locator('.monaco-editor')).toContainText('Hello from Owner');
      await expect(viewerPage.locator('.monaco-editor')).toContainText('Hello from Owner');
    });

    await test.step('测试 Editor 可以编辑', async () => {
      const editor = editorPage.locator('.monaco-editor textarea');
      await editor.fill('Hello from Editor');
      
      await editorPage.waitForTimeout(500);
      
      await expect(ownerPage.locator('.monaco-editor')).toContainText('Hello from Editor');
    });

    await test.step('测试 Viewer 不能编辑', async () => {
      // Viewer 应该看到只读提示
      await expect(viewerPage.locator('text=只读模式')).toBeVisible();
      
      // 编辑器应该是只读的
      const isReadOnly = await viewerPage.evaluate(() => {
        const editor = (window as any).monaco?.editor?.getEditors()[0];
        return editor?.getOption(/* readOnly */ 81);
      });
      expect(isReadOnly).toBe(true);
    });

    // 6. 测试实时角色变更
    await test.step('测试角色变更实时生效', async () => {
      // Owner 将 Editor 改为 Viewer
      await ownerPage.click(`[data-testid="member-editor@test.com"] >> [data-testid="more-menu"]`);
      await ownerPage.click('text=设为观看者');

      // Editor 应该收到通知并变为只读
      await expect(editorPage.locator('text=角色已变更')).toBeVisible();
      await expect(editorPage.locator('text=只读模式')).toBeVisible();
    });
  });

  test('未登录用户应该被重定向到登录页', async ({ page }) => {
    await page.goto('/editor/some-room-id');
    await expect(page).toHaveURL(/\/login/);
  });

  test('非成员访问私有房间应该显示错误', async ({ page }) => {
    // 创建一个私有房间 (通过 API 或 fixture)
    const privateRoomId = 'private-room-123';

    await page.goto('/login');
    await page.fill('[name="email"]', 'stranger@test.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.goto(`/editor/${privateRoomId}`);

    await expect(page.locator('text=您不是该房间成员')).toBeVisible();
  });
});
```

---

## 5. 边界情况处理

### 5.1 边界情况清单

| 场景 | 预期行为 | 测试方法 |
|------|----------|----------|
| **断线重连** | 重连后恢复角色和同步 | 手动断开网络后恢复 |
| **Token 过期** | 提示重新登录 | Mock 过期的 token |
| **同时修改角色** | 最后写入生效 | 并发请求测试 |
| **Owner 离开** | 提示必须先转让 | 尝试 owner 离开 |
| **被移除时正在编辑** | 中断编辑，提示被移除 | 编辑过程中移除 |
| **房间被删除** | 所有成员收到通知 | 删除房间时检查 |
| **浏览器刷新** | 重新加载角色状态 | F5 刷新测试 |
| **多标签页打开** | 同一用户只保持一个连接 | 开多个标签 |

### 5.2 断线重连处理

```typescript
// client/src/modules/collaboration/yjs/socket-provider.ts
// 添加重连逻辑

private handleReconnect = () => {
  console.log('[SocketIOProvider] 尝试重连...');
  
  // 重新加入房间
  this.joinRoom();
  
  // 发送离线期间的更新
  this.flushPendingUpdates();
  
  // 请求最新状态
  this.requestInitialSync();
};

// 监听重连事件
this.socket.io.on('reconnect', this.handleReconnect);
```

### 5.3 Token 刷新处理

```typescript
// client/src/utils/tokenRefresh.ts
export async function refreshTokenIfNeeded(): Promise<string | null> {
  const token = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (!token || !refreshToken) return null;
  
  try {
    // 检查 token 是否即将过期 (5分钟内)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiry = payload.exp * 1000;
    const now = Date.now();
    
    if (expiry - now < 5 * 60 * 1000) {
      // 刷新 token
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.accessToken);
        return data.accessToken;
      }
    }
    
    return token;
  } catch {
    return null;
  }
}
```

---

## 6. 实施检查清单

### 6.1 总体进度

| 阶段 | 任务 | 预计时间 | 状态 |
|------|------|----------|------|
| **Phase 1** | 数据库设计与实体 | 0.5 天 | ⬜ |
| **Phase 2** | Room Service & Controller | 1 天 | ⬜ |
| **Phase 3** | WebSocket 鉴权改造 | 1 天 | ⬜ |
| **Phase 4** | 前端 Room Store & API | 1 天 | ⬜ |
| **Phase 5** | 前端 UI 组件 | 1 天 | ⬜ |
| **Phase 6** | 测试与调试 | 1 天 | ⬜ |

### 6.2 详细检查项

#### Phase 1: 数据库
- [ ] 创建 `server/src/room/entities/room.entity.ts`
- [ ] 创建 `server/src/room/entities/room-member.entity.ts`
- [ ] 在 `app.module.ts` 中注册实体
- [ ] 生成迁移文件: `npm run migration:generate`
- [ ] 运行迁移: `npm run migration:run`
- [ ] 验证表结构: `\dt` 或 pgAdmin

#### Phase 2: Room 模块
- [ ] 创建 DTO 文件 (4个)
- [ ] 实现 `room.service.ts`
- [ ] 实现 `room.controller.ts`
- [ ] 创建 `room.module.ts`
- [ ] 安装 nanoid: `npm install nanoid`
- [ ] 编写单元测试
- [ ] 通过 Postman/curl 测试 API

#### Phase 3: WebSocket
- [ ] 更新 `action.ts` (前后端)
- [ ] 改造 `chat.gateway.ts`
- [ ] 更新 `chat.module.ts`
- [ ] 实现 JWT 验证
- [ ] 实现房间成员验证
- [ ] 实现编辑权限拦截
- [ ] 实现角色变更通知
- [ ] 编写集成测试

#### Phase 4: 前端状态
- [ ] 创建 `client/src/modules/room/types.ts`
- [ ] 创建 `client/src/modules/room/api.ts`
- [ ] 创建 `client/src/modules/room/store.ts`
- [ ] 创建 `client/src/modules/room/hooks.ts`
- [ ] 改造 `collaboration/types.ts`
- [ ] 改造 `collaboration/store.ts`
- [ ] 改造 `collaboration/yjs/socket-provider.ts`
- [ ] 改造 `collaboration/hooks.ts`

#### Phase 5: 前端 UI
- [ ] 改造 `Editor.tsx` (只读支持)
- [ ] 创建 `ReadOnlyBanner.tsx`
- [ ] 创建 `RoomsPage.tsx`
- [ ] 创建 `RoomCard.tsx`
- [ ] 创建 `CreateRoomForm.tsx`
- [ ] 创建 `MemberList.tsx`
- [ ] 创建 `MemberItem.tsx`
- [ ] 创建 `PermissionGuard.tsx`
- [ ] 创建 `RoleChangeNotification.tsx`
- [ ] 更新路由配置

#### Phase 6: 测试
- [ ] 运行所有单元测试
- [ ] 运行集成测试
- [ ] 手动测试完整流程
- [ ] 测试边界情况
- [ ] 修复发现的问题

---

## 附录: 快速命令参考

```bash
# 后端
cd server

# 安装依赖
npm install nanoid

# 生成迁移
npm run migration:generate -- -n CreateRoomTables

# 运行迁移
npm run migration:run

# 运行测试
npm run test
npm run test:e2e

# 启动开发服务器
npm run start:dev
```

```bash
# 前端
cd client

# 运行测试
npm run test

# 运行 E2E 测试
npx playwright test

# 启动开发服务器
npm run dev
```

---

## 文档索引

| 文档 | 内容 |
|------|------|
| `PART1_OVERVIEW_DATABASE.md` | 系统概述、架构设计、数据库设计 |
| `PART2_BACKEND_ROOM_MODULE.md` | Room Service、Controller、API |
| `PART3_WEBSOCKET_AUTH.md` | WebSocket 鉴权、权限拦截 |
| `PART4_FRONTEND_STATE.md` | 前端状态管理、Store 改造 |
| `PART5_FRONTEND_UI.md` | UI 组件、权限控制、路由 |
| `PART6_TESTING.md` | 测试方案、E2E、边界情况 |

**实施建议**: 按 Phase 顺序执行，每个 Phase 完成后进行测试验证。
