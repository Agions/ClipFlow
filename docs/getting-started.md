# 快速开始

本指南将帮助你在 5 分钟内启动 StoryForge 项目。

## 环境要求

| 要求 | 版本 |
|------|------|
| Node.js | ≥ 18.0.0 |
| npm | ≥ 9.0.0 |
| Git | ≥ 2.30.0 |

## 安装步骤

### 1. 克隆项目

```bash
git clone https://github.com/Agions/StoryForge.git
cd StoryForge
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制环境变量模板：

```bash
cp .env.example .env
```

编辑 `.env` 文件，添加你的 API Key：

```env
# AI 服务配置
OPENAI_API_KEY=sk-xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx

# 其他配置
VITE_APP_TITLE=StoryForge
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 查看应用。

## 构建生产版本

```bash
# 构建
npm run build

# 预览构建结果
npm run preview
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run lint` | 代码检查 |
| `npm run test` | 运行测试 |
| `npm run typecheck` | TypeScript 类型检查 |

## 常见问题

### 安装依赖失败

```bash
# 清除缓存后重试
npm cache clean --force
rm -rf node_modules
npm install
```

### 端口被占用

修改 `.env`：

```env
VITE_PORT=3001
```

### API Key 无效

确保 API Key 有效且余额充足。可以在对应的 AI 服务平台上检查。

## 下一步

- [功能介绍](features) - 了解更多功能
- [AI 模型配置](guides/ai-config) - 配置你的 AI 模型
- [常见问题](faq) - 常见问题解答
