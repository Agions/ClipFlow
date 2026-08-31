# 本地开发与环境搭建

## 1. 前置依赖要求

在开始开发 Fablr 之前，请确保本地已安装以下环境：

- **Node.js**: `>= 20.0.0` (推荐 Node 20 LTS)
- **pnpm**: `>= 9.0.0` (包管理器)
- **Rust**: `>= 1.80.0` (`rustup update stable`)
- **系统底层依赖**：
  - **macOS**：Xcode Command Line Tools (`xcode-select --install`)
  - **Linux (Ubuntu/Debian)**：`sudo apt-get install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev`
  - **Windows**：Visual Studio 2022 C++ 生成工具 + WebView2

---

## 2. 源码克隆与依赖安装

```bash
# 1. 克隆代码仓库
git clone https://github.com/Agions/fablr.git
cd fablr

# 2. 安装 Monorepo 所有依赖 (基于 pnpm workspace)
pnpm install

# 3. 编译 Packages
npm run build
```

---

## 3. 本地启动开发服务器

### 启动桌面端调试 (Tauri 2 + Vite 实时热重载)
```bash
npm run tauri dev
```
此命令将同时启动前端 Vite 开发服务器与 Rust 后端，并在本地弹出原生桌面窗口。支持 React 组件与 CSS 的 HMR 毫秒级热更新。

### 仅启动纯前端 Web 调试
```bash
npm run dev
```
用于快速调试前端页面布局、Canvas 时间轴渲染与组件交互。

---

## 4. 常用开发脚本清单

| 命令 | 说明 |
| :--- | :--- |
| `npm run type-check` | 执行 TypeScript 全局强类型检查 (`tsc --noEmit`) |
| `npm run lint` | 执行 ESLint 代码规范扫描 |
| `npm run test` | 运行 Vitest 单元测试与快照测试 |
| `npm run test:ci` | 运行带覆盖率门禁的完整测试套件 |
| `npm run verify:all` | 运行项目级门禁校验（0-antd、命名规范、循环依赖检查） |
| `npm run docs:dev` | 本地启动 VitePress 文档预览服务器 |
| `npm run docs:build` | 编译构建生产版本文档站点 |
