# 🚀 快速部署到 Render

## 一键部署步骤

### 1. 准备代码
确保代码已推送到 GitHub/GitLab/Bitbucket

### 2. 在 Render 创建服务

#### 方式 A: 使用 Blueprint（推荐，最简单）

1. 登录 [Render Dashboard](https://dashboard.render.com)
2. 点击 "New +" -> "Blueprint"
3. 选择你的 Git 仓库
4. Render 会自动读取 `render.yaml` 配置
5. 点击 "Apply" 创建服务

#### 方式 B: 手动创建

**先部署后端：**
1. "New +" -> "Web Service"
2. 连接仓库
3. 设置：
   - Name: `react-editor-backend`
   - Root Directory: `server`
   - Build: `npm install && npm run build`
   - Start: `npm run start:prod`
4. 添加环境变量 `FRONTEND_URL`（先留空，部署前端后更新）

**再部署前端：**
1. "New +" -> "Static Site"
2. 连接仓库
3. 设置：
   - Name: `react-editor-frontend`
   - Root Directory: `client`
   - Build: `npm install && npm run build`
   - Publish Directory: `dist`
4. 添加环境变量 `VITE_BACKEND_URL` = 后端 URL

### 3. 配置环境变量

**后端服务：**
```
FRONTEND_URL=https://你的前端服务URL.onrender.com
```

**前端服务：**
```
VITE_BACKEND_URL=https://你的后端服务URL.onrender.com
```

### 4. 完成！

访问前端 URL 即可使用。

## ⚡ 快速检查清单

- [ ] 代码已推送到 Git 仓库
- [ ] 在 Render 创建了后端服务
- [ ] 在 Render 创建了前端服务
- [ ] 设置了后端 `FRONTEND_URL` 环境变量
- [ ] 设置了前端 `VITE_BACKEND_URL` 环境变量
- [ ] 两个服务都部署成功
- [ ] 测试了 WebSocket 连接

## 📖 详细文档

查看 [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) 获取完整部署指南。

