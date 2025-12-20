# 📊 localStorage vs Cookies 详细对比

## 🔍 核心区别

### 1. **存储位置**

| 特性 | localStorage | Cookies |
|------|--------------|---------|
| **存储位置** | 浏览器本地存储（仅客户端） | 浏览器 + 服务器（HTTP 请求头） |
| **访问方式** | 仅通过 JavaScript API | 通过 JavaScript API + HTTP 请求头自动发送 |
| **可见性** | 仅客户端可见 | 客户端和服务器都可见 |

---

### 2. **存储大小限制**

| 特性 | localStorage | Cookies |
|------|--------------|---------|
| **大小限制** | 通常 5-10MB | 每个 Cookie 最大 4KB，每个域名最多约 50 个 Cookie |
| **存储容量** | ✅ 大容量，适合存储复杂数据 | ❌ 小容量，只适合存储简单数据 |

**示例**：
```javascript
// localStorage - 可以存储大量数据
localStorage.setItem('largeData', JSON.stringify({ /* 大量数据 */ }));

// Cookies - 只能存储小数据
document.cookie = `token=eyJhbGci...`; // 如果 token 太长可能被截断
```

---

### 3. **生命周期**

| 特性 | localStorage | Cookies |
|------|--------------|---------|
| **默认过期** | ❌ 永不过期（除非手动清除） | ✅ 可以设置过期时间 |
| **会话结束** | ✅ 数据保留 | ⚠️ 可以设置为会话 Cookie（浏览器关闭后清除） |
| **清除方式** | 手动清除或程序清除 | 手动清除、程序清除或过期自动清除 |

**示例**：
```javascript
// localStorage - 永不过期
localStorage.setItem('token', 'xxx');
// 除非用户清除浏览器数据，否则一直存在

// Cookies - 可以设置过期时间
document.cookie = 'token=xxx; expires=Thu, 18 Dec 2025 12:00:00 UTC; path=/';
// 或者使用 js-cookie
Cookies.set('token', 'xxx', { expires: 7 }); // 7 天后过期
```

---

### 4. **自动发送**

| 特性 | localStorage | Cookies |
|------|--------------|---------|
| **HTTP 请求** | ❌ 不会自动发送 | ✅ 自动附加到每个 HTTP 请求头 |
| **手动处理** | ✅ 需要手动添加到请求头 | ❌ 自动处理（但也可以手动） |
| **性能影响** | ✅ 不影响请求大小 | ⚠️ 增加每个请求的大小 |

**示例**：
```javascript
// localStorage - 需要手动添加到请求头
const token = localStorage.getItem('token');
fetch('/api/data', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Cookies - 自动发送（如果设置了正确的 domain 和 path）
fetch('/api/data'); // Cookie 自动在请求头中发送
// 请求头：Cookie: token=xxx; otherCookie=yyy
```

---

### 5. **安全性**

| 特性 | localStorage | Cookies |
|------|--------------|---------|
| **XSS 攻击** | ⚠️ 容易受到 XSS 攻击 | ⚠️ 也容易受到 XSS 攻击 |
| **CSRF 攻击** | ✅ 不受 CSRF 攻击影响 | ⚠️ 容易受到 CSRF 攻击 |
| **HttpOnly** | ❌ 不支持（JavaScript 可访问） | ✅ 支持 HttpOnly（JavaScript 不可访问，更安全） |
| **Secure** | ❌ 不支持 | ✅ 支持 Secure（仅 HTTPS 传输） |
| **SameSite** | ❌ 不支持 | ✅ 支持 SameSite（防止 CSRF） |

**安全对比**：
```javascript
// localStorage - JavaScript 可访问，XSS 风险
localStorage.getItem('token'); // 如果页面被 XSS，可以读取

// Cookies - 可以设置 HttpOnly，更安全
// 服务器设置：
// Set-Cookie: token=xxx; HttpOnly; Secure; SameSite=Strict
// JavaScript 无法访问，只能通过 HTTP 请求发送
```

---

### 6. **跨域访问**

| 特性 | localStorage | Cookies |
|------|--------------|---------|
| **同源策略** | ✅ 严格同源（协议+域名+端口） | ✅ 严格同源（但可以设置 domain） |
| **跨域共享** | ❌ 无法跨域共享 | ⚠️ 可以设置 domain 实现子域名共享 |

**示例**：
```javascript
// localStorage - 无法跨域
// localhost:3000 和 localhost:5173 无法共享

// Cookies - 可以设置 domain
document.cookie = 'token=xxx; domain=.example.com; path=/';
// 所有子域名（app.example.com, api.example.com）都可以访问
```

---

### 7. **使用场景**

#### localStorage 适合：
- ✅ **JWT Token 存储**（前端应用）
- ✅ **用户偏好设置**（主题、语言等）
- ✅ **缓存数据**（API 响应缓存）
- ✅ **表单草稿**（未提交的表单数据）
- ✅ **不需要服务器访问的数据**

#### Cookies 适合：
- ✅ **需要服务器访问的数据**（Session ID）
- ✅ **需要自动发送的数据**（认证信息）
- ✅ **需要设置过期时间的数据**（记住我功能）
- ✅ **需要 HttpOnly 保护的数据**（更安全的认证）

---

## 🎯 在认证场景中的选择

### 使用 localStorage（当前方案）

**优点**：
- ✅ 不增加 HTTP 请求头大小
- ✅ 不受 CSRF 攻击影响
- ✅ 存储容量大
- ✅ 简单易用

**缺点**：
- ❌ 容易受到 XSS 攻击
- ❌ 需要手动添加到请求头
- ❌ JavaScript 可访问（安全性较低）

**适用场景**：
- SPA（单页应用）
- 使用 JWT Token
- 前端完全控制认证流程

**代码示例**：
```typescript
// 保存
localStorage.setItem('accessToken', token);

// 使用
const token = localStorage.getItem('accessToken');
fetch('/api/data', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

### 使用 Cookies（HttpOnly）

**优点**：
- ✅ 更安全（HttpOnly 防止 XSS）
- ✅ 自动发送（不需要手动处理）
- ✅ 可以设置过期时间
- ✅ 支持 Secure 和 SameSite

**缺点**：
- ❌ 增加每个请求的大小
- ❌ 容易受到 CSRF 攻击（需要额外防护）
- ❌ 存储容量小（4KB 限制）

**适用场景**：
- 传统 Web 应用
- 需要服务器端 Session
- 安全性要求高的应用

**代码示例**：
```typescript
// 服务器设置（后端）
res.cookie('token', token, {
  httpOnly: true,      // JavaScript 无法访问
  secure: true,       // 仅 HTTPS
  sameSite: 'strict', // 防止 CSRF
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 天
});

// 前端使用（自动发送）
fetch('/api/data'); // Cookie 自动在请求头中发送
```

---

## 📊 对比总结表

| 特性 | localStorage | Cookies |
|------|--------------|---------|
| **存储大小** | 5-10MB | 4KB/个 |
| **自动发送** | ❌ | ✅ |
| **过期时间** | ❌ | ✅ |
| **HttpOnly** | ❌ | ✅ |
| **XSS 风险** | ⚠️ 高 | ⚠️ 低（HttpOnly） |
| **CSRF 风险** | ✅ 无 | ⚠️ 有 |
| **使用简单度** | ✅ 简单 | ⚠️ 需要配置 |
| **适用场景** | SPA + JWT | 传统 Web + Session |

---

## 🔐 安全建议

### 使用 localStorage 时：
1. ✅ **防止 XSS**：对用户输入进行转义和验证
2. ✅ **使用 HTTPS**：确保传输安全
3. ✅ **Token 过期处理**：定期刷新 Token
4. ✅ **CSP（Content Security Policy）**：限制脚本执行

### 使用 Cookies 时：
1. ✅ **设置 HttpOnly**：防止 JavaScript 访问
2. ✅ **设置 Secure**：仅 HTTPS 传输
3. ✅ **设置 SameSite**：防止 CSRF 攻击
4. ✅ **使用 CSRF Token**：额外的 CSRF 防护

---

## 💡 你的项目选择

### 当前方案：localStorage ✅

**为什么选择 localStorage**：
1. ✅ **SPA 应用**：React 单页应用
2. ✅ **JWT Token**：使用 JWT，不需要服务器 Session
3. ✅ **简单易用**：前端完全控制
4. ✅ **性能好**：不增加请求头大小

**需要注意**：
- ⚠️ 做好 XSS 防护
- ⚠️ 使用 HTTPS
- ⚠️ 实现 Token 刷新机制

### 如果改用 Cookies（可选）

**需要修改的地方**：
```typescript
// 后端：设置 HttpOnly Cookie
res.cookie('accessToken', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000 // 15 分钟
});

// 前端：不需要手动添加 Authorization 头
// axios 会自动发送 Cookie
```

---

## 🎯 总结

| 场景 | 推荐方案 |
|------|---------|
| **SPA + JWT** | localStorage ✅ |
| **传统 Web + Session** | Cookies (HttpOnly) ✅ |
| **高安全性要求** | Cookies (HttpOnly + Secure + SameSite) ✅ |
| **简单快速开发** | localStorage ✅ |

**你的项目**：使用 **localStorage** 是合适的选择！✅

---

**文档版本**: v1.0

