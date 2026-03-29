# 安装配置

## 环境要求

- Node.js ≥ 18.0.0
- npm ≥ 9.0.0
- Git ≥ 2.30.0

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

### 3. 环境变量配置

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# AI 服务
OPENAI_API_KEY=sk-your-key
ANTHROPIC_API_KEY=sk-ant-your-key

# 应用配置
VITE_APP_TITLE=StoryForge
VITE_API_BASE_URL=
```

### 4. 启动

```bash
npm run dev
```

## 开发构建

```bash
# 开发构建（带热更新）
npm run dev

# 生产构建
npm run build

# 预览构建结果
npm run preview
```

## 代码检查

```bash
# ESLint 检查
npm run lint

# TypeScript 类型检查
npm run typecheck

# 测试
npm run test
```

## 目录结构

```
src/
├── components/     # React 组件
├── core/          # 核心服务和状态
├── hooks/         # 自定义 Hooks
├── pages/         # 页面组件
├── services/       # API 服务
├── store/         # Zustand 状态管理
├── styles/        # 全局样式
├── types/         # TypeScript 类型
└── utils/         # 工具函数
```
