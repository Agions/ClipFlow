---
title: 安装指南
description: StoryFab 安装、系统要求和首次启动
---

# 安装指南

## 系统要求

| 组件 | 最低要求 | 推荐 |
| --- | --- | --- |
| 操作系统 | Windows 10+ / macOS 12+ / Ubuntu 20.04+ | 最新版 |
| 内存 | 8 GB | 16 GB（4K 视频建议 32 GB） |
| 磁盘空间 | 2 GB 可用空间 | SSD，额外 10 GB 用于缓存 |
| FFmpeg | 安装包内置 | - |
| 网络 | 首次下载模型（约 150 MB） | 全程离线可用 |

## 桌面应用安装

前往 [Releases](https://github.com/Agions/story-fab/releases) 下载对应平台的安装包：

| 平台 | 安装包 | 说明 |
| --- | --- | --- |
| Windows | `StoryFab_*_x64-setup.exe` | 标准安装程序 |
| macOS (Apple Silicon) | `StoryFab_*_aarch64.dmg` | M 系列芯片 |
| macOS (Intel) | `StoryFab_*_x64.dmg` | Intel 芯片 |
| Linux | `StoryFab_*_amd64.AppImage` | 无需安装，可直接运行 |

### 启动后首次配置

第一版启动时会自动完成：

1. 创建本地配置目录（`~/.story-fab/`）
2. 下载并解压 Whisper 模型文件（约 150 MB）
3. 验证 FFmpeg 可用
4. 初始化本地数据库

等待约 1-3 分钟即可进入主界面。

## macOS Gatekeeper 处理

未签名应用首次打开会被拦截：

```bash
# 方式 1：移除隔离属性（推荐）
sudo xattr -rd com.apple.quarantine /Applications/StoryFab.app

# 方式 2：系统设置 → 隐私与安全 → 仍要打开
```

或在终端中：

```bash
open /Applications/StoryFab.app
```

## Linux AppImage 启动

```bash
chmod +x StoryFab_*.AppImage
./StoryFab_*.AppImage
```

若提示缺少 `libfuse2`：

```bash
# Debian / Ubuntu
sudo apt install libfuse2
```

## 常见安装问题

- **闪退 / 黑屏**：确认显卡驱动最新，或尝试 `--disable-gpu` 启动
- **模型下载失败**：手动下载后放入 `~/.story-fab/models/`，重启应用见 [FAQ](/reference/faq)

## 下一步

- [快速上手](/getting-started/quick-start) — 5 步出片
- [功能指南](/features/commentary-mode) — 了解两种创作模式
