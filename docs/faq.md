# 常见问题

> 关于 StoryForge 的常见疑问解答

---

## 🚀 入门

### Q: 支持哪些操作系统？

StoryForge 基于 Tauri 构建，支持 **Windows / macOS / Linux** 三大桌面平台。

### Q: 是否需要 AI API 密钥？

StoryForge 的核心剪辑功能可以离线使用，但 **AI 功能**（智能剪辑、解说生成、字幕翻译等）需要配置对应的 AI 模型密钥才能使用。

### Q: 视频文件会上传到服务器吗？

**不会。** 所有视频处理均在本地完成，文件不会离开你的设备。API 密钥仅用于调用 AI 服务进行文本生成，不会泄露视频内容。

### Q: 支持哪些视频格式？

| 格式 | 状态 | 说明 |
|------|------|------|
| MP4 | ✅ 完全支持 | 推荐格式 |
| MOV | ✅ 支持 | macOS 原生 |
| WebM | ✅ 支持 | Web 优化 |
| AVI | ✅ 支持 | 传统格式 |
| MKV | ✅ 支持 | 灵活封装 |
| FLV | ⚠️ 部分支持 | 可能需要转码 |

---

## 💳 API 密钥与费用

### Q: 如何获取 API 密钥？

| 模型 | 获取地址 | 充值方式 |
|------|---------|---------|
| OpenAI GPT | https://platform.openai.com | 信用卡充值 |
| Anthropic Claude | https://console.anthropic.com | 信用卡充值 |
| Google Gemini | https://aistudio.google.com | GCP 账号 |
| DeepSeek | https://platform.deepseek.com | 充值 |
| 通义千问 | https://dashscope.aliyuncs.com | 阿里云账号 |
| 智谱 GLM | https://open.bigmodel.cn | 充值 |
| Kimi | https://platform.moonshot.cn | 充值 |

### Q: 使用 StoryForge 会产生哪些费用？

| 项目 | 费用承担方 |
|------|-----------|
| 视频处理（本地）| 无费用 |
| AI 模型调用 | 你（按各平台定价）|
| StoryForge 本身 | **免费开源** |

### Q: 如何选择合适的 AI 模型？

| 使用场景 | 推荐模型 |
|---------|---------|
| 日常剪辑解说 | GPT-4o-mini / Claude 3.5 Haiku |
| 长视频深度分析 | GPT-4o / Claude 3.5 Sonnet |
| 中文内容为主 | 通义千问 Plus / 智谱 GLM-4 |
| 长文本处理 | Kimi (128K 上下文) |
| 多模态（图文结合）| Gemini 1.5 Pro |

---

## 🔧 技术问题

### Q: npm install 失败？

```bash
# 清理缓存后重试
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Q: Tauri 构建失败？

```bash
# 更新 Rust 工具链
rustup update

# 清理构建缓存
cargo clean
npm run tauri build
```

### Q: FFmpeg 未找到？

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt install ffmpeg
```

**Windows:** 从 https://ffmpeg.org/download.html 下载并添加到 PATH

### Q: 视频分析时间过长？

视频分析速度取决于：
- 视频时长（分析时间 ≈ 视频时长 × 2-3 倍）
- AI 模型响应速度
- 网络延迟

如需加速，可关闭部分分析选项（情感分析、OCR 等）。

### Q: 内存占用过高？

对于长视频或批量处理：
- 关闭其他占用内存的程序
- 在设置中降低分析精度
- 分批处理而非一次性处理多个视频

---

## 🎬 功能使用

### Q: 智能混剪和剧情分析有什么区别？

| 对比项 | 智能混剪 | 剧情分析 |
|--------|---------|---------|
| 核心逻辑 | 识别高光时刻 | 理解叙事结构 |
| 输出风格 | 节奏感强 | 叙事完整 |
| 适用内容 | 综艺/体育/活动 | 纪录片/访谈/剧情 |
| 情感追踪 | 基础 | 完整情感曲线 |

### Q: 导出视频有水印吗？

**没有。** StoryForge 导出的视频不包含任何水印。

### Q: 可以导出字幕文件吗？

可以。StoryForge 支持导出以下字幕格式：

| 格式 | 说明 |
|------|------|
| SRT | 通用字幕格式 |
| VTT | Web 视频字幕 |
| ASS | 高级字幕（含样式）|

### Q: 批量导出如何操作？

1. 在项目列表中选择多个项目（Ctrl+点击）
2. 点击「批量导出」
3. 设置统一的导出参数
4. 队列自动依次导出

---

## 🐛 故障排除

### AI 功能无法使用

1. 检查 `.env` 中的 API 密钥是否正确
2. 确认网络可以访问 AI 服务商
3. 检查 API 密钥是否还有额度
4. 查看控制台是否有具体错误信息

### 视频无法播放

- 尝试重新导入视频
- 检查视频文件是否损坏
- 确认视频编码格式受浏览器支持

### 剪辑结果不理想

- 调整剪辑模式（不同模式适合不同内容）
- 手动微调 AI 生成的片段
- 尝试不同的 AI 模型

---

## 📞 获取帮助

- 🐛 [GitHub Issues](https://github.com/Agions/StoryForge/issues) — 报告 Bug
- 💡 [GitHub Discussions](https://github.com/Agions/StoryForge/discussions) — 功能建议
- 📖 [StoryForge 文档](https://github.com/Agions/StoryForge#readme) — 使用文档
