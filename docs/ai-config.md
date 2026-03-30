# AI 模型配置

StoryForge 支持多种 AI 模型服务提供商。所有模型均已更新至 **2026年3月最新版本**。

## 支持的提供商

### OpenAI

使用 OpenAI GPT-5.4 系列模型进行文本生成和分析。

```bash
VITE_DEFAULT_PROVIDER=openai
VITE_OPENAI_API_KEY=sk-xxxx
VITE_OPENAI_BASE_URL=https://api.openai.com/v1
```

**推荐模型**: `gpt-5.4`

获取 API 密钥：[platform.openai.com](https://platform.openai.com/api-keys)

### Anthropic Claude

使用 Claude Sonnet 4.6 / Opus 4.6 模型，提供出色的推理和创作能力。

```bash
VITE_ANTHROPIC_API_KEY=sk-ant-xxxx
```

**推荐模型**: `claude-sonnet-4.6` / `claude-opus-4.6`

获取 API 密钥：[console.anthropic.com](https://console.anthropic.com/)

### Google Gemini

使用 Google Gemini 3.1 Pro 模型。

```bash
VITE_GOOGLE_API_KEY=xxxx
```

**推荐模型**: `gemini-3.1-pro`

获取 API 密钥：[AI Studio](https://aistudio.google.com/app/apikey)

### 智谱 AI (GLM)

使用智谱 GLM-5 系列模型。

```bash
VITE_ZHIPU_API_KEY=xxxx
```

**推荐模型**: `glm-5`

获取 API 密钥：[智谱 AI 开放平台](https://open.bigmodel.cn/)

### 通义千问 (Qwen)

使用阿里 Qwen 2.5 Max 模型。

```bash
VITE_QIANWEN_API_KEY=xxxx
```

**推荐模型**: `qwen2.5-max`

获取 API 密钥：[阿里云百炼](https://bailian.console.aliyun.com/)

### DeepSeek

使用 DeepSeek V3.2 模型，性价比极高。

```bash
VITE_DEEPSEEK_API_KEY=sk-xxxx
```

**推荐模型**: `deepseek-v3.2`

获取 API 密钥：[platform.deepseek.com](https://platform.deepseek.com/)

### Moonshot Kimi

使用 Kimi K2.5 模型，长上下文支持优秀。

```bash
VITE_MOONSHOT_API_KEY=sk-xxxx
```

**推荐模型**: `kimi-k2.5`

获取 API 密钥：[Moonshot Console](https://platform.moonshot.cn/)

### 讯飞星火

使用讯飞星火 V3.5 模型。

```bash
VITE_SPARK_API_KEY=xxxx
```

**推荐模型**: `generalv3.5`

获取 API 密钥：[讯飞开放平台](https://xinghuo.xfyun.cn/)

## 配置方式

在项目根目录创建 `.env` 文件：

```bash
# 选择默认提供商
VITE_DEFAULT_PROVIDER=openai

# OpenAI 配置
VITE_OPENAI_API_KEY=your-api-key
```

::: tip 提示
不同提供商的密钥不能混用，请确保 `VITE_DEFAULT_PROVIDER` 与你配置的提供商一致。
:::

## 模型推荐 (2026年3月)

| 场景 | 推荐模型 | 说明 |
|------|----------|------|
| 剧情分析 | GPT-5.4 / Claude Opus 4.6 | 强大的推理和分析能力 |
| 脚本生成 | GPT-5.4 / Qwen 2.5-Max | 高质量的文本生成 |
| 字幕翻译 | GPT-5.4 / DeepSeek V3.2 | 准确的翻译能力 |
| 语音合成 | Azure TTS / 阿里语音 | 自然的语音输出 |
| 多模态分析 | Gemini 3.1 Pro | 出色的视觉理解能力 |

## 模型对比 (2026年3月)

| 模型 | 上下文 | 优势 | 适合场景 |
|------|--------|------|----------|
| GPT-5.4 | 128K | 全能型，推理能力强 | 复杂分析、创意写作 |
| Claude Opus 4.6 | 200K | 超长上下文，安全性高 | 长文本分析、代码 |
| Claude Sonnet 4.6 | 200K | 性价比高 | 日常任务、翻译 |
| Gemini 3.1 Pro | 1M | 超长上下文，多模态 | 视频理解、超长文本 |
| Qwen 2.5-Max | 128K | 中文优化，性价比高 | 中文内容创作 |
| DeepSeek V3.2 | 128K | 开源友好，价格低 | 日常任务、翻译 |
| GLM-5 | 128K | 中文优化 | 中文内容创作 |
| Kimi K2.5 | 200K+ | 超长上下文 | 长文本分析 |
