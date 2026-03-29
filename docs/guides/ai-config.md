# AI 模型配置

StoryForge 支持多种 AI 模型，可以根据需求灵活配置。

## 支持的模型

### 文本模型

| 模型 | 提供商 | 特点 |
|------|--------|------|
| GPT-4o | OpenAI | 最强多模态能力 |
| Claude 4 Sonnet | Anthropic | 长文本理解强 |
| Gemini 2.0 Flash | Google | 免费高速 |
| Qwen Plus | 阿里云 | 中文优化 |
| GLM-4 | 智谱 | 中文旗舰 |
| Kimi 128K | Moonshot | 超长上下文 |
| DeepSeek R1 | DeepSeek | 推理能力强 |

### 视觉模型

| 模型 | 提供商 |
|------|--------|
| GPT-4o | OpenAI |
| Claude 4 Sonnet | Anthropic |
| Gemini 1.5 Pro | Google |
| Qwen-VL | 阿里云 |

## 配置方法

### 环境变量

```env
# OpenAI
OPENAI_API_KEY=sk-xxxxx

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Google Gemini
GOOGLE_API_KEY=xxxxx

# 阿里云 (DashScope)
DASHSCOPE_API_KEY=sk-xxxxx

# 智谱 AI
ZHIPUAI_API_KEY=xxxxx

# DeepSeek
DEEPSEEK_API_KEY=sk-xxxxx
```

### 界面配置

在应用设置页面可以：

1. 选择默认 AI 提供商
2. 设置每个功能的专用模型
3. 测试 API 连接

## 模型推荐

| 功能 | 推荐模型 |
|------|----------|
| 视频剧情分析 | GPT-4o / Claude 4 |
| 字幕生成 | Claude 3.5 Sonnet |
| 文案生成 | GPT-4o |
| 语音合成 | Edge TTS (免费) |

## 成本优化

- 使用 `gpt-4o-mini` 或 `claude-3.5-haiku` 进行测试
- 启用缓存减少 API 调用
- 批量处理任务
