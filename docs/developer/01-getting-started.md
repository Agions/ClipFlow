# 开发者上手指南 (Developer Getting Started)

> 💻 环境搭建、本地运行与 Tauri 2 调试

---

## 前置依赖需求

- **Node.js**: `>= 20.x`
- **pnpm / npm**: `>= 9.x`
- **Rust Toolchain**: `>= 1.80` (包含 `cargo` 与 `rustc`)
- **FFmpeg**: `>= 6.0` (须配置在 PATH 环境变量中)

---

## 本地启动步骤

```bash
# 1. 克隆代码仓库
git clone https://github.com/fablr/fablr.git
cd fablr

# 2. 安装 Node 依赖
npm install

# 3. 启动 Tauri 2 桌面端开发环境
npm run tauri dev
```
