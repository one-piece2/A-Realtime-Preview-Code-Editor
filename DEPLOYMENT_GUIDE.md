# 项目部署指南

本文档提供了将React Editor项目部署到不同平台的详细步骤。

## 1. 准备工作

在开始部署之前，请确保：

1. 项目已成功构建（`npm run build`命令已执行且无错误）
2. 构建产物已生成在`dist`目录中
3. 您已在目标平台注册账户

## 2. 部署到Vercel

### 步骤1：安装Vercel CLI（可选）

您可以使用Vercel命令行工具或直接通过Vercel官网进行部署。

```bash
npm install -g vercel
```

### 步骤2：登录Vercel

```bash
vercel login
```

按照提示完成登录过程。

### 步骤3：部署项目

在项目根目录执行以下命令：

```bash
vercel
```

按照提示回答几个问题：
- 是否想在当前目录部署？ (Y/n) - 输入 Y
- 您想链接到哪个现有项目？ - 选择 "Create new project"
- 项目名称：(lyyyyds) - 可以使用默认名称或自定义
- 在哪个团队中部署？ - 选择您的个人账户
- 是否添加自定义域名？ - 可以稍后添加，现在选择 N
- 自动检测的框架是什么？ - 选择 "Vite"
- 要覆盖默认构建设置吗？ - 选择 N

### 步骤4：确认部署

部署完成后，Vercel会提供一个预览URL。您可以访问该URL来查看部署的项目。

### 步骤5：（可选）设置生产环境

如果预览没有问题，可以通过以下命令部署到生产环境：

```bash
vercel --prod
```

### 通过Vercel官网部署

1. 访问 [Vercel官网](https://vercel.com) 并登录
2. 点击右上角的 "New Project"
3. 选择从Git仓库导入或拖放`dist`文件夹
4. 如果选择Git仓库，按照提示连接您的GitHub/GitLab账户
5. 选择您的项目仓库
6. 配置项目设置：
   - 框架预设：选择 "Vite"
   - 构建命令：`npm run build`
   - 输出目录：`dist`
   - 环境变量：根据需要添加
7. 点击 "Deploy"

部署完成后，您将获得一个永久的URL来访问您的应用。

## 3. 部署到Netlify

### 步骤1：通过Netlify官网部署

1. 访问 [Netlify官网](https://www.netlify.com) 并登录
2. 点击右上角的 "Add new site" -> "Import an existing project"
3. 选择您的Git提供商（GitHub/GitLab/Bitbucket）
4. 授权Netlify访问您的仓库
5. 选择要部署的仓库
6. 配置部署设置：
   - 分支：选择您的主分支（通常是main或master）
   - 构建命令：`npm run build`
   - 发布目录：`dist`
   - 环境变量：根据需要添加
7. 点击 "Deploy site"

### 步骤2：使用Netlify CLI部署（可选）

1. 安装Netlify CLI

```bash
npm install -g netlify-cli
```

2. 登录Netlify

```bash
netlify login
```

3. 在项目根目录初始化Netlify项目

```bash
netlify init
```

4. 按照提示完成配置：
   - 选择 "Create & configure a new site"
   - 选择您的团队
   - 输入站点名称或使用随机生成的名称
   - 输入构建命令：`npm run build`
   - 输入发布目录：`dist`

5. 部署站点

```bash
netlify deploy --prod
```

### 步骤3：配置自定义域名（可选）

部署成功后，您可以在Netlify控制面板中配置自定义域名。

1. 在站点设置中，点击 "Domain management"
2. 点击 "Add custom domain"
3. 按照提示完成域名配置

## 4. 部署到GitHub Pages

### 步骤1：安装gh-pages包

在项目根目录执行：

```bash
npm install --save-dev gh-pages
```

### 步骤2：修改package.json

在`package.json`中添加以下脚本和字段：

```json
{
  "homepage": "https://[your-github-username].github.io/[repository-name]",
  "scripts": {
    // 现有的脚本...
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

请将`[your-github-username]`替换为您的GitHub用户名，`[repository-name]`替换为您的仓库名称。

### 步骤3：部署项目

运行以下命令部署项目：

```bash
npm run deploy
```

这将自动构建项目并将构建产物部署到GitHub Pages。

### 步骤4：确认部署

部署完成后，您可以访问`https://[your-github-username].github.io/[repository-name]`来查看您的应用。

### 注意事项

- 确保您的仓库是公开的（除非您有GitHub Pages Pro）
- 第一次部署可能需要几分钟才能生效
- 您可能需要在GitHub仓库的设置中启用GitHub Pages（通常gh-pages包会自动处理）

## 5. 部署后检查

部署完成后，建议执行以下检查：

1. 访问部署后的应用URL，确保页面能正常加载
2. 测试应用的主要功能，确保一切正常工作
3. 检查控制台是否有任何错误
4. 验证响应式设计在不同设备上是否正常显示

## 6. 持续部署设置

所有上述平台都支持持续部署功能，当您推送代码到仓库时，会自动触发新的构建和部署：

- **Vercel**: 默认启用，每次推送到配置的分支时自动部署
- **Netlify**: 默认启用，每次推送到指定分支时自动部署
- **GitHub Pages**: 通过配置GitHub Actions或使用gh-pages包的预提交钩子实现