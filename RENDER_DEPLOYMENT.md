# Render 部署指南

本指南将帮助你将 React Editor 项目部署到 Render 平台。

## 📋 前置要求

1. 在 [Render](https://render.com) 注册账户（可以使用 GitHub 账户登录）
2. 将代码推送到 GitHub/GitLab/Bitbucket 仓库
3. 确保项目在本地可以正常构建和运行

## 🚀 部署步骤

### 方式一：使用 render.yaml 自动部署（推荐）

1. **推送代码到 Git 仓库**
   ```bash
   git add .
   git commit -m "Add Render deployment configuration"
   git push origin main
   ```

2. **在 Render 中创建新服务**
   - 登录 [Render Dashboard](https://dashboard.render.com)
   - 点击 "New +" -> "Blueprint"
   - 选择你的 Git 仓库
   - Render 会自动检测 `render.yaml` 文件

3. **配置环境变量**
   
   **后端服务环境变量：**
   - `FRONTEND_URL`: 设置为前端服务的 URL（例如：`https://react-editor-frontend.onrender.com`）
   - `PORT`: Render 会自动设置，无需手动配置
   - `NODE_ENV`: 自动设置为 `production`

   **前端服务环境变量：**
   - `VITE_BACKEND_URL`: 设置为后端服务的 URL（例如：`https://react-editor-backend.onrender.com`）
   - `NODE_ENV`: 自动设置为 `production`

4. **部署**
   - Render 会自动开始构建和部署
   - 等待部署完成（首次部署可能需要 5-10 分钟）

### 方式二：手动创建服务

#### 步骤 1: 部署后端服务

1. 在 Render Dashboard 点击 "New +" -> "Web Service"
2. 连接你的 Git 仓库
3. 配置服务：
   - **Name**: `react-editor-backend`
   - **Environment**: `Node`
   - **Region**: 选择离你最近的区域（如 Singapore, Oregon）
   - **Branch**: `main` 或你的主分支
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
   - **Plan**: Free（或选择付费计划）

4. 添加环境变量：
   - `FRONTEND_URL`: 前端服务的 URL（先部署前端后更新）
   - `NODE_ENV`: `production`

5. 点击 "Create Web Service" 开始部署

#### 步骤 2: 部署前端服务

1. 在 Render Dashboard 点击 "New +" -> "Static Site"（推荐）或 "Web Service"
2. 连接你的 Git 仓库

**选项 A: 使用 Static Site（推荐，更简单）**
   - **Name**: `react-editor-frontend`
   - **Branch**: `main`
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Environment Variables**:
     - `VITE_BACKEND_URL`: 后端服务的 URL（例如：`https://react-editor-backend.onrender.com`）

**选项 B: 使用 Web Service（如果需要 SSR 或动态路由）**
   - **Name**: `react-editor-frontend`
   - **Environment**: `Node`
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx vite preview --host 0.0.0.0 --port $PORT`
   - **Environment Variables**:
     - `VITE_BACKEND_URL`: 后端服务的 URL

3. 点击 "Create Static Site" 或 "Create Web Service"

#### 步骤 3: 更新环境变量

部署完成后，需要更新环境变量：

1. **更新后端服务的 `FRONTEND_URL`**:
   - 进入后端服务设置
   - 更新 `FRONTEND_URL` 为前端服务的实际 URL
   - 保存并重新部署

2. **更新前端服务的 `VITE_BACKEND_URL`**（如果还没设置）:
   - 进入前端服务设置
   - 设置 `VITE_BACKEND_URL` 为后端服务的实际 URL
   - 保存并重新部署

## 🔧 环境变量配置

### 后端环境变量

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `FRONTEND_URL` | 前端服务的完整 URL | `https://react-editor-frontend.onrender.com` |
| `PORT` | 服务端口（Render 自动设置） | `10000` |
| `NODE_ENV` | 环境模式 | `production` |

### 前端环境变量

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `VITE_BACKEND_URL` | 后端服务的完整 URL | `https://react-editor-backend.onrender.com` |
| `NODE_ENV` | 环境模式 | `production` |

## ⚠️ 重要注意事项

### 1. WebSocket 连接

Render 的免费计划支持 WebSocket，但需要注意：
- 确保后端服务使用正确的 CORS 配置
- 前端连接时使用 HTTPS URL（Render 自动提供）

### 2. 服务休眠

Render 免费计划的服务在 15 分钟无活动后会休眠：
- 首次访问可能需要 30-60 秒唤醒
- 考虑升级到 Starter 计划（$7/月）避免休眠

### 3. 构建时间

免费计划的构建时间限制：
- 每次构建最多 10 分钟
- 如果超时，考虑优化构建过程或升级计划

### 4. 环境变量更新

更新环境变量后需要手动触发重新部署：
- 在服务设置中点击 "Manual Deploy" -> "Deploy latest commit"

## 🔍 故障排查

### 问题 1: 前端无法连接到后端

**解决方案：**
1. 检查 `VITE_BACKEND_URL` 是否正确设置
2. 确保后端服务已成功部署
3. 检查浏览器控制台的错误信息
4. 验证后端 CORS 配置中的 `FRONTEND_URL` 是否正确

### 问题 2: WebSocket 连接失败

**解决方案：**
1. 确保使用 HTTPS URL（不是 HTTP）
2. 检查后端 WebSocket Gateway 的 CORS 配置
3. 查看 Render 服务日志中的错误信息

### 问题 3: 构建失败

**解决方案：**
1. 检查构建日志中的具体错误
2. 确保所有依赖都在 `package.json` 中
3. 检查 Node.js 版本兼容性
4. 尝试在本地运行构建命令：`npm run build`

### 问题 4: 服务休眠导致首次访问慢

**解决方案：**
1. 使用 [UptimeRobot](https://uptimerobot.com) 等工具定期 ping 服务
2. 升级到 Starter 计划避免休眠
3. 在代码中添加健康检查端点

## 📝 健康检查配置

为了确保服务正常运行，可以在后端添加健康检查端点：

```typescript
// server/src/app.controller.ts
@Get('health')
health() {
  return { status: 'ok', timestamp: new Date().toISOString() };
}
```

然后在 Render 服务设置中配置：
- **Health Check Path**: `/health`

## 🔄 持续部署

Render 默认启用自动部署：
- 每次推送到主分支会自动触发部署
- 可以在服务设置中配置自动部署的分支
- 可以禁用自动部署，改为手动部署

## 📊 监控和日志

- 在 Render Dashboard 可以查看：
  - 实时日志
  - 服务指标（CPU、内存使用）
  - 部署历史
  - 错误和警告

## 🎉 部署完成

部署成功后：
1. 访问前端服务的 URL
2. 测试主要功能：
   - 创建/加入房间
   - 实时代码同步
   - 多用户协作
   - WebSocket 连接

## 💡 优化建议

1. **使用自定义域名**（可选）
   - 在服务设置中添加自定义域名
   - 配置 DNS 记录

2. **启用 CDN**（Static Site）
   - Render 的 Static Site 自动使用 CDN
   - 提升全球访问速度

3. **数据库集成**（如果需要）
   - Render 提供 PostgreSQL 数据库服务
   - 可以用于存储用户数据、房间信息等

4. **Redis 缓存**（可选）
   - 用于存储会话、临时数据
   - 提升性能

## 📚 相关资源

- [Render 文档](https://render.com/docs)
- [Render 定价](https://render.com/pricing)
- [WebSocket 支持](https://render.com/docs/websockets)

