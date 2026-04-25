---
title: 常见问题
description: CutDeck 常见问题解答，涵盖安装配置、AI 使用、功能操作等各方面问题。
---

# 常见问题

## 一般问题

### 如何开始使用 CutDeck？

请参考[快速开始](./getting-started.md)指南，了解如何安装和启动项目。

### CutDeck 支持哪些视频格式？

| 格式 | 扩展名 | 支持情况 |
|------|--------|----------|
| MP4 | `.mp4` | ✅ 完全支持 |
| QuickTime | `.mov` | ✅ 完全支持 |
| AVI | `.avi` | ✅ 完全支持 |
| MKV | `.mkv` | ✅ 完全支持 |
| WebM | `.webm` | ✅ 完全支持 |
| FLV | `.flv` | ⚠️ 部分支持 |
| WMV | `.wmv` | ⚠️ 需要转码 |

### CutDeck 是免费的吗？

CutDeck 本身是 **开源免费** 的，但使用 AI 服务（如 OpenAI、DeepSeek 等）可能需要付费。

### 需要配置 AI API 吗？

是的，需要配置 AI 模型服务才能使用 AI 分析和生成功能。请参考 [AI 模型配置](./ai-config.md)。

---

## 安装问题

### npm install 失败怎么办？

1. 清除 npm 缓存：
```bash
npm cache clean --force
```

2. 删除 node_modules 后重新安装：
```bash
rm -rf node_modules package-lock.json
npm install
```

3. 如果网络问题，配置国内镜像：
```bash
npm config set registry https://registry.npmmirror.com
```

### Node.js 版本要求是什么？

需要 **Node.js ≥ 18.0.0**。推荐使用 LTS 版本。

### 启动开发服务器失败怎么办？

1. 确保 Node.js 版本符合要求
2. 检查端口是否被占用（默认 1430）
3. 清除缓存后重试
4. 查看 [安装配置](./installation.md)

### 端口被占用怎么办？

修改 `.env` 文件添加：
```bash
VITE_PORT=1431
```

---

## AI 相关问题

### 如何获取 AI API 密钥？

你可以在以下平台申请 API 密钥：

| 提供商 | 申请地址 |
|--------|----------|
| OpenAI | [platform.openai.com](https://platform.openai.com/api-keys) |
| DeepSeek | [platform.deepseek.com](https://platform.deepseek.com/) |
| 通义千问 | [bailian.console.aliyun.com](https://bailian.console.aliyun.com/) |
| 智谱 AI | [open.bigmodel.cn](https://open.bigmodel.cn/) |
| Kimi | [platform.moonshot.cn](https://platform.moonshot.cn/) |

### 支持哪些 AI 模型？

CutDeck 支持多种模型提供商（详见 [AI 模型配置](./ai-config.md)）：

- **OpenAI**: GPT-4o、GPT-4o mini、o3-mini
- **Anthropic**: Claude Sonnet 4.6、Claude Opus 4.7
- **Google**: Gemini 3.1 Pro、Gemini 2.0 Flash
- **DeepSeek**: DeepSeek-V4-Flash、DeepSeek-V4-Pro
- **通义千问**: Qwen-Max、Qwen3-Max
- **智谱**: GLM-4、GLM-4V
- **Kimi**: moonshot-v1-128k、moonshot-v1-8k

### 哪个 AI 模型最好？

根据不同场景推荐：

| 场景 | 推荐模型 |
|------|----------|
| 视频内容分析 | GPT-4o / Gemini 2.0 Flash |
| 字幕生成 | Claude 3.5 Sonnet |
| 脚本生成 | GPT-5.5 / Qwen-Max |
| 性价比首选 | **DeepSeek Chat** |

### AI 功能无响应？

1. 确认 `.env` 配置正确
2. 确认 API Key 有效且有余额
3. 确认网络可以访问 AI 服务商
4. 查看浏览器控制台错误信息

### AI 消耗多少配额？

| 分析模式 | 预估消耗 |
|----------|----------|
| 快速分析 | ~500 tokens / 视频 |
| 标准分析 | ~2000 tokens / 视频 |
| 深度分析 | ~5000 tokens / 视频 |

---

## 功能问题

### 视频处理需要 GPU 吗？

基础功能不需要 GPU。GPU 主要用于加速 AI 模型推理，推荐用于生产环境。

### 批量处理支持多少视频？

CutDeck 批量处理支持 **无限数量** 的视频，具体取决于你的硬件性能和 AI 配额。

### 如何导入剪映/Pr 项目？

目前 CutDeck 支持：
- ✅ 导入剪映草稿（`.draft`）
- ✅ 导入 Premiere 项目（`.prproj`）功能开发中
- ❌ 暂不支持 Final Cut Pro 项目

### 导出失败怎么办？

1. 检查磁盘空间是否充足
2. 检查输出路径是否有写入权限
3. 更换输出格式试试
4. 查看导出日志

### 字幕不同步怎么办？

1. 点击 **「校准」** 按钮
2. 播放视频找到同步点
3. 点击「标记」，AI 自动调整时间轴

### AI 生成的文案不满意？

1. 切换不同的文案风格（正式/活泼/情感）
2. 手动编辑生成的文案
3. 尝试不同的 AI 模型

---

## 视频质量问题

### 导出视频模糊？

1. 提高导出码率（推荐 10-20 Mbps）
2. 使用 H.264 编码代替 H.265
3. 选择更高分辨率导出

### 音画不同步？

1. 重新导入视频素材
2. 检查是否有音频延迟
3. 使用「音画同步校准」功能

---

## 技术问题

### 如何报告问题或建议？

请在 [GitHub Issues](https://github.com/Agions/CutDeck/issues) 中提交，我们会尽快处理。

### 如何查看日志？

开发模式下，日志会直接输出在终端和浏览器控制台。

生产环境日志位置：
- **Windows**: `%APPDATA%/CutDeck/logs/`
- **macOS**: `~/Library/Logs/CutDeck/`
- **Linux**: `~/.config/CutDeck/logs/`

### 如何更新到最新版本？

```bash
cd CutDeck
git pull origin main
npm install
npm run dev
```

---

## 其他问题

### CutDeck 支持多语言吗？

目前 CutDeck 界面支持 **中文** 和 **英文**。文档使用中文编写。

### 如何参与贡献？

请参考 [贡献指南](./contributing.md)，我们欢迎所有形式的贡献！

### 可以离线使用吗？

CutDeck 的核心功能需要 AI 服务支持，需要联网使用。但本地视频处理功能可以离线使用。

### 有移动端 App 吗？

目前 CutDeck 是 **桌面应用**，支持 Windows、macOS 和 Linux。移动端 App 正在规划中。
