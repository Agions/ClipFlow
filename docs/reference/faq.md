# 常见问题

> 关于 ClipFlow 的常见问题解答

---

## 一般问题

### Q: ClipFlow 是什么？

**A:** ClipFlow 是一款 AI 驱动的专业视频内容创作平台，提供智能脚本生成、视频分析和智能混剪功能。

### Q: ClipFlow 是免费的吗？

**A:** 基础功能免费使用，AI 功能需要配置相应的 API 密钥。

### Q: 我的视频会上传到服务器吗？

**A:** 不会。所有视频处理在本地进行，API 密钥仅用于调用 AI 服务，不会将您的内容上传到第三方服务器。

---

## API 密钥问题

### Q: 如何获取 API 密钥？

**A:** 在各平台官方渠道注册获取：

| 平台 | 地址 |
|------|------|
| OpenAI | [platform.openai.com](https://platform.openai.com) |
| Anthropic | [anthropic.com](https://www.anthropic.com) |
| Google | [aistudio.google.com](https://aistudio.google.com) |
| DeepSeek | [platform.deepseek.com](https://platform.deepseek.com) |
| 阿里云 | [dashscope.aliyuncs.com](https://dashscope.aliyuncs.com) |
| 智谱 | [open.bigmodel.cn](https://open.bigmodel.cn) |
| 月之暗面 | [platform.moonshot.cn](https://platform.moonshot.cn) |

### Q: 只需要配置一个 API 密钥吗？

**A:** 不需要配置所有模型。只需配置您计划使用的模型密钥即可。

### Q: API 密钥安全吗？

**A:** 是的。API 密钥仅存储在本地浏览器存储中，不会发送到服务器。

---

## 技术问题

### Q: 支持哪些视频格式？

**A:**

| 类型 | 格式 |
|------|------|
| 输入 | MP4, MOV, WebM, AVI |
| 输出 | MP4 (推荐), MOV, WebM |

### Q: 需要什么样的电脑配置？

**A:**

| 配置 | 要求 |
|------|------|
| 内存 | 建议 16GB 以上 |
| 显卡 | 支持 WebGL |
| 磁盘 | 50GB 以上可用空间 |

### Q: 为什么视频处理很慢？

**A:** 处理速度取决于：

- 视频时长和分辨率
- 网络连接速度
- AI API 响应时间

### Q: 构建失败怎么办？

**A:**

1. 确保 Node.js 版本 >= 18
2. 清除 node_modules 后重新安装
3. 查看错误信息并搜索解决方案

---

## 功能问题

### Q: 支持哪些 AI 模型？

**A:** 支持 OpenAI GPT、Anthropic Claude、Google Gemini、DeepSeek、阿里通义、智谱 GLM、月之暗面 Kimi 等。

### Q: 可以离线使用吗？

**A:** 核心编辑功能支持离线，但 AI 功能需要网络连接。

### Q: 支持批量处理吗？

**A:** 是的，支持批量导入和批量导出。

---

## 版权问题

### Q: 使用 AI 生成的视频有版权问题吗？

**A:** AI 生成的文案属于您，您可以自由使用。视频素材请确保拥有合法使用权。

---

## 联系我们

- 📧 邮箱：agions@qq.com
- 🐛 GitHub Issues：[报告问题](https://github.com/agions/clipflow/issues)
- 💬 GitHub Discussions：[功能讨论](https://github.com/agions/clipflow/discussions)
