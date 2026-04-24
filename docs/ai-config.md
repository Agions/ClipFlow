---
title: AI 模型配置
description: CutDeck 支持的 AI 模型提供商配置详解，基于 2026 年 4 月最新模型列表（仅 DeepSeek 已核实更新）。
---

# AI 模型配置

CutDeck 支持多种 AI 模型服务提供商。模型列表与代码常量同步更新至 **2026 年 4 月**（已核实）。

---

## 快速配置

在项目根目录创建 `.env` 文件：

```bash
# 选择默认提供商（任选其一）
VITE_DEFAULT_PROVIDER=deepseek

# DeepSeek 配置（性价比最高，推荐）
VITE_DEEPSEEK_API_KEY=sk-xxxx

# OpenAI 配置
VITE_OPENAI_API_KEY=sk-xxxx
VITE_OPENAI_BASE_URL=https://api.openai.com/v1
```

::: tip 推荐配置
初次使用推荐 **DeepSeek Chat**，性价比最高，中文能力出色。
:::

---

## 支持的提供商

### OpenAI

```bash
VITE_DEFAULT_PROVIDER=openai
VITE_OPENAI_API_KEY=sk-xxxx
VITE_OPENAI_BASE_URL=https://api.openai.com/v1
```

| 模型 ID | 名称 | 特点 |
|---------|------|------|
| `gpt-5.5` | GPT-5.5 | 🏆 最新旗舰（2026-04-23），编程/研究/数据分析 |
| `gpt-5.3-codex` | GPT-5.3 Codex | OpenAI 编程专用模型，为 Codex 等编码环境设计 |
| `o4-mini` | OpenAI o4-mini | 轻量推理模型，高速低成本 |
| `o3` | OpenAI o3 | 高推理模型，复杂推断，视觉理解 |
| `o3-mini` | OpenAI o3-mini | 推理轻量版 |
| `gpt-4o` | GPT-4o | 旗舰多模态（历史版本） |

获取 API 密钥：[platform.openai.com](https://platform.openai.com/api-keys)

---

### Anthropic Claude

```bash
VITE_ANTHROPIC_API_KEY=sk-ant-xxxx
```

| 模型 ID | 名称 | 特点 |
|---------|------|------|
| `claude-opus-4-7` | Claude Opus 4.7 | 🏆 最新旗舰（2026-04），最高智能水平 |
| `claude-sonnet-4-6` | Claude Sonnet 4.6 | 长文本处理，稳定风格 |
| `claude-sonnet-4-5` | Claude Sonnet 4.5 | 中高端，性价比 |

获取 API 密钥：[console.anthropic.com](https://console.anthropic.com/)

---

### Google Gemini

```bash
VITE_GOOGLE_API_KEY=xxxx
VITE_DEFAULT_PROVIDER=google
```

| 模型 ID | 名称 | 特点 |
|---------|------|------|
| `gemini-3.1-pro` | Gemini 3.1 Pro | 🏆 最新旗舰（2026-02），Gemini 3.1 Pro 系列 |
| `gemini-2.0-flash` | Gemini 2.0 Flash | 轻量高速，多模态能力强 |

> 注：`gemini-3.1-pro-preview`（旧 ID）已废弃，API 现使用 `gemini-3.1-pro`。

获取 API 密钥：[AI Studio](https://aistudio.google.com/app/apikey)

---

### DeepSeek

```bash
VITE_DEEPSEEK_API_KEY=sk-xxxx
VITE_DEFAULT_PROVIDER=deepseek
```

| 模型 ID | 名称 | 特点 |
|---------|------|------|
| `deepseek-v4-flash` | DeepSeek-V4-Flash | 🚀 2026-04-24，100万上下文，替代 deepseek-chat |
| `deepseek-v4-pro` | DeepSeek-V4-Pro | 2026-04-24，100万上下文，替代 deepseek-reasoner |

获取 API 密钥：[platform.deepseek.com](https://platform.deepseek.com/)

---

### 通义千问 (Qwen)

```bash
VITE_QIANWEN_API_KEY=xxxx
VITE_DEFAULT_PROVIDER=dashscope
```

| 模型 ID | 名称 | 特点 |
|---------|------|------|
| `qwen3-max` | Qwen3-Max | 🏆 最新旗舰，中文能力突出 |
| `qwen3.5-plus` | Qwen3.5-Plus | 多模态（文本/图像/视频） |

> 注：`qwen-max-latest` 已更名为 `qwen3-max`，为同一模型最新版本。

获取 API 密钥：[阿里云百炼](https://bailian.console.aliyun.com/)

---

### 智谱 AI (GLM)

```bash
VITE_ZHIPU_API_KEY=xxxx
VITE_DEFAULT_PROVIDER=zhipuai
```

| 模型 ID | 名称 | 特点 |
|---------|------|------|
| `glm-5` | GLM-5 | 🏆 最新旗舰（2026-02-11），面向 Agentic Engineering |
| `glm-4` | GLM-4 | 中文能力突出 |

获取 API 密钥：[智谱 AI 开放平台](https://open.bigmodel.cn/)

---

### Moonshot Kimi

```bash
VITE_MOONSHOT_API_KEY=sk-xxxx
VITE_DEFAULT_PROVIDER=moonshot
```

| 模型 ID | 名称 | 特点 |
|---------|------|------|
| `kimi-k2-turbo-preview` | Kimi K2.6 | 🚀 高速版（60-100 Tokens/s），256K 上下文，代码与 Agent |
| `moonshot-v1-8k` | Kimi 8K | 快速对话模型（已上线 API） |

获取 API 密钥：[Moonshot Console](https://platform.moonshot.cn/)

---

## 配置方式

### 环境变量配置

```bash
# ===================
# AI 提供商选择
# ===================
VITE_DEFAULT_PROVIDER=deepseek

# ===================
# OpenAI
# ===================
VITE_OPENAI_API_KEY=sk-xxxx
VITE_OPENAI_BASE_URL=https://api.openai.com/v1

# ===================
# DeepSeek
# ===================
VITE_DEEPSEEK_API_KEY=sk-xxxx

# ===================
# 通义千问
# ===================
VITE_QIANWEN_API_KEY=xxxx

# ===================
# Anthropic Claude
# ===================
VITE_ANTHROPIC_API_KEY=sk-ant-xxxx
```

::: warning 注意
不同提供商的密钥不能混用，请确保 `VITE_DEFAULT_PROVIDER` 与你配置的提供商一致。
:::

---

## 场景推荐

| 场景 | 推荐模型 | 说明 |
|------|----------|------|
| 视频内容分析 | GPT-4o / Gemini 2.0 Flash | 多模态视觉理解 |
| 字幕生成 | Claude 3.5 Sonnet | 精准的上下文处理 |
| 脚本生成 | GPT-4o / Qwen Plus | 高质量文本生成 |
| 中文内容 | Qwen Plus / GLM-4 | 中文优化出色 |
| 长视频分析 | Gemini 1.5 Pro | 2M 超长上下文 |
| 性价比首选 | **DeepSeek Chat** | 成本极低，效果出色 |

---

## API 代理配置

如果无法直接访问某些 AI 服务，可以配置代理：

```bash
# HTTP 代理
VITE_HTTP_PROXY=http://127.0.0.1:7890

# HTTPS 代理
VITE_HTTPS_PROXY=http://127.0.0.1:7890
```

---

## 成本优化建议

| 建议 | 说明 |
|------|------|
| 使用 DeepSeek | 性价比最高，效果不输 GPT-4 |
| Gemini 免费额度 | 1.5 Pro/Flash 在免费额度内使用 |
| 批量处理 | 合理安排任务，减少 API 调用 |
| 缓存分析结果 | 相同视频不要重复分析 |
| 选择合适的模型 | 简单任务用小模型，复杂任务用大模型 |

---

## 相关文档

- [快速开始](./getting-started.md) — 开始使用
- [常见问题](./faq.md) — AI 相关问题解答
