# 剧工 (Fablr) — 开发者快速上手与质量验证

## 1. 环境准备

- **Node.js**：`>= 18.0.0`
- **Rust / Cargo**：`>= 1.75.0`
- **包管理器**：`pnpm` 或 `npm`

## 2. 安装与本地启动

```bash
# 1. 安装前端依赖
pnpm install

# 2. 启动前端 Vite 热重载服务器
npm run dev

# 3. 启动桌面端调试环境 (包含 Rust 后端)
pnpm tauri dev
```

## 3. 质量与合规检查

项目内置完整的工程守卫与测试套件：

```bash
# 一键运行全量工程规范检查（AntD 零残留 / 命名 Kebab 规范 / 零循环依赖 / 颜色 Token 校验）
npm run verify:all

# 运行前端 164 个测试文件 (2,500+ 测试用例)
npm run test:run

# 运行前端生产打包
npm run build

# 运行 Rust 后端编译检查
cd src-tauri && cargo check
```
