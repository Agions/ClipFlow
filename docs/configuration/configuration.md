---
title: 高级配置
description: StoryFab 高级配置选项、本地目录、缓存管理
---

# 高级配置

StoryFab 大部分操作可零配置开箱即用。高级配置面向有特殊需求的用户。

## 配置文件位置

```
Windows:  %APPDATA%\StoryFab\config.json
macOS:    ~/.story-fab/config.json
Linux:    ~/.story-fab/config.json
```

可直接编辑 JSON 文件修改配置，保存后重启应用生效。

## 常用配置项

### Whisper 模型

| 模型 | 大小 | 速度（1小时音频） | 中文准确率 | 推荐场景 |
| --- | --- | --- | --- | --- |
| `tiny` | 75 MB | 3-5 分钟 | 80-85% | 快速尝鲜 |
| `base` | 140 MB | 5-8 分钟 | 85-90% | 日常使用 ⚡ |
| `small` | 480 MB | 15-25 分钟 | 90-95% | 高质量转录 |
| `medium` | 1.5 GB | 30-60 分钟 | 93-97% | 专业用途 |
| `large-v3` | 3 GB | 60-120 分钟 | 95-98% | 最高准确率 |

```json
{ "whisper_model": "base" }
```

### 高光检测灵敏度

```json
{ "highlight_sensitivity": "medium" }
```

- `low`：保守检测，适合安静、节奏慢的内容
- `medium`：默认，适合大多数内容
- `high`：激进检测，适合快节奏、高动态内容

### TTS 默认引擎

```json
{ "tts_engine": "edge" }
```

可选 `edge`（免费）或 `azure`（需配置 API Key）。

### Azure TTS 配置

```json
{
  "azure_tts_key": "你的 Azure Key",
  "azure_tts_region": "eastasia"
}
```

### 目录配置

| 配置项 | 默认路径 | 说明 |
| --- | --- | --- |
| `projects_dir` | `~/StoryFab/projects/` | 项目文件存储 |
| `cache_dir` | `~/.story-fab/cache/` | 模型/缓存文件 |
| `output_dir` | `~/StoryFab/output/` | 导出文件 |
| `temp_dir` | `~/.story-fab/temp/` | 临时文件（自动清理） |

```json
{
  "projects_dir": "/Volumes/SSD/StoryFab/projects",
  "output_dir": "/Volumes/SSD/StoryFab/output"
}
```

### 性能配置

| 配置项 | 范围 | 说明 |
| --- | --- | --- |
| `max_concurrent_tasks` | 1-8 | 同时分析/导出的任务数 |
| `memory_limit_mb` | 2048-32768 | 内存使用上限 |
| `gpu_accel` | true / false | 是否启用 GPU 加速（需兼容显卡） |
| `wasm_simd` | true / false | 启用 WebAssembly SIMD 提速（默认开启） |

## AI 服务配置

### 本地推理（默认）

StoryFab 内置本地推理引擎，无需任何 API Key。以下功能完全离线：

- 高光检测
- Whisper 转录
- Agent Pipeline（短文策划/撰写）

### 云端补充（可选）

对于长视频的深度分析，可接入云端大模型补充能力：

| 服务 | 说明 |
| --- | --- |
| OpenAI | GPT-4o 补充长视频解析 |
| DeepSeek | 同功能，价格更低 |
| Ollama | 本地大模型，不流转数据 |

```json
{
  "ai_provider": "ollama",
  "ai_endpoint": "http://localhost:11434",
  "ai_model": "llama3.2"
}
```

## 日志与诊断

```json
{
  "log_level": "info",
  "log_file": "~/.story-fab/logs/app.log"
}
```

- `error`：仅错误
- `warn`：警告 + 错误
- `info`：常规运行日志（默认）
- `debug`：详细调试信息

## 缓存管理

缓存目录结构与清理规则：

```
~/.story-fab/cache/
├── whisper-models/     # Whisper 模型文件（勿删）
├── transcription/      # 转录缓存（命中相同文件时复用）
├── thumbnails/         # 视频缩略图缓存
├── tts-cache/          # TTS 配音缓存（相同文本复用）
└── temp/               # 临时文件（可安全清理）
```

### 手动清理

点击「设置 → 存储 → 清理缓存」或手动删除缓存目录内文件。

清理效果：

| 清理项 | 释放空间 | 影响 |
| --- | --- | --- |
| 临时文件 | 中 | 无影响 |
| 缩略图缓存 | 小 | 再次浏览时重新生成 |
| TTS 配音缓存 | 大 | 需重新合成配音 |
| 转录缓存 | 大 | 需重新转录 |
| Whisper 模型 | 极大 | 需重新下载 |

## 相关文档

- [安装指南](/getting-started/installation) — 安装与首次配置
- [FAQ](/reference/faq) — 常见配置问题
