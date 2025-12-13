# Git Commit Message

## feat: 实现 AI 聊天模块（前后端完整实现）

### 📁 新增文件

#### 后端 (server/src/ai/)
- `ai.module.ts` - AI 模块定义
- `ai.controller.ts` - AI 控制器，包含两个接口：
  - `POST /ai/chat/stream` - SSE 流式聊天接口
  - `POST /ai/completion` - 代码补全接口
- `ai.service.ts` - AI 服务层，调用 DeepSeek API
- `dto/chat.dto.ts` - 请求 DTO 定义

#### 前端 API 层 (client/src/api/ai/)
- `ai.ts` - AI API 接口封装
- `types.ts` - API 请求/响应类型定义（Message, Completion）

#### 前端模块层 (client/src/modules/ai/)
- `type.ts` - 模块类型定义（Message, Conversation, AIState, AIActions）
- `store.ts` - Zustand Store，管理会话和消息状态
- `services.ts` - 业务逻辑层，处理流式请求和状态更新

### 🔧 修改文件

- `client/src/api/auth/auth.ts` - 重构：统一 API 导出格式
- `client/src/modules/auth/services.ts` - 重构：移除重复 API，改为从 @/api/auth 导入
- `server/src/app.module.ts` - 注册 AiModule

---

## 🔑 核心实现细节

### 1. SSE 流式聊天

**后端**：使用 NestJS 手动设置 SSE 响应头
```typescript
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
```

**为什么不用 @Sse() 装饰器？**
- `@Sse()` 只支持 GET 请求
- 聊天需要 POST 传递复杂的 messages 数组
- 手动实现更灵活

### 2. 前端 SSE 分包处理

**问题**：网络传输时 SSE 数据可能被拆分
```
chunk1: "data: {"content":"你"
chunk2: "好"}\n\ndata: {"content":"世界"}\n\n"
```

**解决方案**：使用缓冲区累积数据，按 `\n\n` 分割完整消息
```typescript
let buffer = '';
while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';  // 保留不完整的部分
    // 处理完整消息...
}
```

### 3. 流式消息占位机制

**为什么要占位？**
- 流式响应是逐字返回的，需要一个消息对象来不断更新内容
- 如果不占位，消息列表会突然多出一条，而不是平滑地"打字"出来

**流程**：
```
t0: 用户发送消息
t1: 创建空的 assistant 消息 { id: "xxx", content: "" }  ← 占位
t2: 收到 chunk "你"   → streamingContent = "你"
t3: 收到 chunk "好"   → streamingContent = "你好"
t4: 流结束 → 把 "你好" 写入 assistant 消息的 content
```

### 4. onChunk 回调作用

数据流向：
```
后端 SSE → streamChat → onChunk → store.appendStreamingContent → UI 渲染
```

`onChunk` 是一个回调钩子，让调用方决定如何处理每个数据块。在这里用于更新 Zustand store 的 `streamingContent`，触发 UI 实时更新（打字机效果）。

### 5. sendMessageWithStream 业务逻辑

完整流程：
1. 添加用户消息到 store
2. 获取当前会话
3. 初始化流式状态（setStreaming, resetStreamingContent）
4. 准备历史消息（转换格式，实现多轮对话）
5. 添加空的 assistant 消息占位
6. 调用 streamChat，通过回调更新状态
7. 流结束后，把完整内容写入消息历史

---

## 📂 代码架构

```
前端:
@/api/ai/           → API 层（HTTP 请求封装）
@/modules/ai/
  ├── type.ts       → 类型定义
  ├── store.ts      → 状态管理（Zustand）
  └── services.ts   → 业务逻辑（流式处理、状态更新）

后端:
server/src/ai/
  ├── ai.module.ts      → 模块定义
  ├── ai.controller.ts  → 控制器（路由）
  ├── ai.service.ts     → 服务层（业务逻辑）
  └── dto/chat.dto.ts   → 数据传输对象
```

---

## 🎯 API 对应关系

| 前端服务 | 后端接口 | 说明 |
|---------|---------|------|
| `streamChat` | `POST /ai/chat/stream` | SSE 流式聊天 |
| `getCompletion` | `POST /ai/completion` | 代码补全 |
