# 安装与环境指南

Fablr (剧工) 采用 **Tauri 2 + Rust** 架构构建，为各主流桌面平台提供原生分发包。

---

## 1. 客户端下载与系统要求

| 操作系统 | 推荐安装包格式 | 最低系统版本 | 硬件建议 |
| :--- | :--- | :--- | :--- |
| **macOS** | `.dmg` (Apple Silicon / Intel) | macOS 12.0 (Monterey) 及以上 | Apple Silicon M1/M2/M3/M4 或 Intel i5 16GB |
| **Windows** | `.exe` / `.msi` (x64) | Windows 10 (1809+) / Windows 11 | 64 位 CPU，8GB 内存，推荐独立显卡 |
| **Linux** | `.AppImage` / `.deb` (x86_64) | Ubuntu 20.04+ / Fedora 36+ | 64 位系统，GTK 3.24+ |

> [!TIP]
> 推荐通过 GitHub Releases 或客户端内置的自动更新通道获取最新版本：
> - 官方发布页：[https://github.com/Agions/fablr/releases/latest](https://github.com/Agions/fablr/releases/latest)
> - 国内高速镜像源支持：已内置 `https://ghproxy.net` 代理通道。

---

## 2. 操作系统安装步骤

### macOS 用户
1. 下载最新版 `Fablr_x.x.x_aarch64.dmg`（Apple Silicon M系列）或 `Fablr_x.x.x_x64.dmg`（Intel 芯片）；
2. 双击打开 `.dmg` 镜像，将 `Fablr.app` 拖入 `Applications` 目录；
3. **初次启动若提示「无法打开，因为无法验证开发者」**：
   - 前往 `系统设置` → `隐私与安全性` → 点击 `仍要打开`；
   - 或在终端中执行：
     ```bash
     sudo xattr -rd com.apple.quarantine /Applications/Fablr.app
     ```

### Windows 用户
1. 下载 `Fablr_x.x.x_x64-setup.exe`；
2. 双击运行安装向导，按提示完成安装；
3. 如系统未安装 `WebView2 Runtime`（Windows 10 旧版可能缺少），安装器将自动提示补全。

### Linux 用户
1. 下载 `Fablr_x.x.x_amd64.AppImage`；
2. 赋予可执行权限并运行：
   ```bash
   chmod +x Fablr_*.AppImage
   ./Fablr_*.AppImage
   ```

---

## 3. 本地模型与依赖环境说明

Fablr 采用「开箱即用」设计，核心音视频处理（FFmpeg/FFprobe）已深度集成在原生 Rust 引擎中。

### 本地 Whisper 语音识别（可选加速）
- 默认内嵌微型 Whisper 模型，启动时无需额外配置。
- 如需提升大型影视长视频转写速度，可在客户端「设置中心」中配置本地 CUDA / CoreML 加速驱动。

### 大语言模型 API 接入 (多 Agent 研磨)
进入客户端左侧底部 `设置中心` → `模型提供商`，配置任意兼容 OpenAI 标准接口的大模型密钥（支持 DeepSeek / OpenAI / Claude / Ollama 等）。
