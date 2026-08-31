# 剧工 (Fablr) — 开发者贡献指南

感谢你对「剧工 (Fablr)」开源项目的关注！我们欢迎所有形式的贡献。

---

## 📋 1. 贡献流程

### 1.1 准备工作

```bash
# 克隆仓库
git clone https://github.com/Agions/fablr.git
cd fablr

# 安装前端依赖
pnpm install
```

### 1.2 创建特性分支

```bash
# 从 main 分支拉取最新代码
git checkout main
git pull origin main

# 创建特性分支
git checkout -b feature/amazing-feature
```

### 1.3 本地开发与调试

```bash
# 启动前端热重载开发服务器
npm run dev

# 启动 Tauri 桌面端全栈开发环境
pnpm tauri dev
```

---

## 📝 2. 代码与命名规范

严格遵守 [`docs/NAMING_AND_MODULARIZATION.md`](./docs/NAMING_AND_MODULARIZATION.md) 的标准：

1. **命名规范**：
   * 文件名：纯小写短横线 `kebab-case`（如 `video-player.tsx`, `audio-sync.ts`）；
   * 函数名：简短有力的动宾风格（如 `get()`, `set()`, `load()`, `save()`, `init()`, `play()`, `seek()`）；
   * 组件与类型：`PascalCase`（如 `VideoPlayer`, `Screenplay`）；
2. **纯中文界面规范**：
   * 所有面向用户的 UI 文案、提示与状态标签统一采用纯中文；
3. **架构规范**：
   * 严禁引入 Ant Design 相关库及组件；
   * UI 基座全面基于原生 Tailwind CSS + `@base-ui/react` + `lucide-react`。

---

## 🧪 3. 测试与质量验证

在提交代码前，必须确保本地所有质量检查和测试通过：

```bash
# 运行全量规范与质量扫描（0 AntD、0 循环依赖、命名合规、Token 一致）
npm run verify:all

# 运行前端自动化测试套件
npm run test:run

# 运行前端生产打包构建
npm run build

# 运行 Rust 后端编译检查
cd src-tauri && cargo check
```

---

## 📄 4. 许可证与致谢

贡献即表示你同意你的代码将在 MIT 许可证下发布。感谢所有创作者与开发者的支持！
