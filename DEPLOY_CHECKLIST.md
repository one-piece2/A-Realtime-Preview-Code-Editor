# ✅ Render 部署检查清单

## 📋 部署前准备

- [ ] 代码已推送到 Git 仓库（GitHub/GitLab/Bitbucket）
- [ ] 本地测试通过（`npm run build` 成功）
- [ ] 已阅读 [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)

## 🔧 后端服务配置

### 在 Render 创建后端服务
- [ ] 服务类型：Web Service
- [ ] 名称：`react-editor-backend`
- [ ] 环境：Node
- [ ] Root Directory：`server`
- [ ] Build Command：`npm install && npm run build`
- [ ] Start Command：`npm run start:prod`

### 环境变量
- [ ] `FRONTEND_URL` = `https://你的前端服务URL.onrender.com`（部署前端后更新）
- [ ] `NODE_ENV` = `production`（可选，Render 会自动设置）

## 🎨 前端服务配置

### 在 Render 创建前端服务
- [ ] 服务类型：Static Site（推荐）或 Web Service
- [ ] 名称：`react-editor-frontend`
- [ ] Root Directory：`client`
- [ ] Build Command：`npm install && npm run build`
- [ ] Publish Directory：`dist`（仅 Static Site）

### 环境变量
- [ ] `VITE_BACKEND_URL` = `https://你的后端服务URL.onrender.com`
- [ ] `NODE_ENV` = `production`（可选）

## 🔄 部署后步骤

1. [ ] 等待两个服务都部署成功
2. [ ] 复制前端服务的 URL
3. [ ] 更新后端服务的 `FRONTEND_URL` 环境变量
4. [ ] 重新部署后端服务（在设置中点击 "Manual Deploy"）
5. [ ] 测试前端是否能正常访问
6. [ ] 测试创建/加入房间功能
7. [ ] 测试实时代码同步
8. [ ] 测试多用户协作（打开两个浏览器窗口）

## 🐛 常见问题检查

- [ ] 后端服务日志无错误
- [ ] 前端服务日志无错误
- [ ] 浏览器控制台无 CORS 错误
- [ ] WebSocket 连接成功（检查 Network -> WS）
- [ ] 环境变量都已正确设置

## 📝 部署信息记录

**后端服务 URL：**
```
https://____________________.onrender.com
```

**前端服务 URL：**
```
https://____________________.onrender.com
```

**部署日期：**
```
____年____月____日
```

## ✨ 完成！

部署成功后，分享前端 URL 给其他人测试协作功能！

