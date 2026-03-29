# 常见问题

## 安装问题

### Q: npm install 失败怎么办？

```bash
# 清除缓存
npm cache clean --force

# 删除 node_modules
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### Q: 端口被占用？

修改 `.env`：

```env
VITE_PORT=3001
```

## AI 功能问题

### Q: AI 分析失败？

1. 检查 API Key 是否有效
2. 确认 API 余额充足
3. 查看网络连接

### Q: 配音合成失败？

- Edge TTS 需要网络连接
- 检查音频输出设备
- 确认音频格式支持

## 视频处理问题

### Q: 支持哪些视频格式？

| 格式 | 状态 |
|------|------|
| MP4 (H.264) | ✅ 完全支持 |
| MP4 (H.265) | ✅ 支持 |
| MOV | ✅ 支持 |
| AVI | ⚠️ 部分支持 |
| MKV | ⚠️ 部分支持 |
| WebM | ✅ 支持 |

### Q: 视频太大处理慢？

- 建议视频 ≤ 2GB
- 分段处理大文件
- 使用代理编辑

## 导出问题

### Q: 导出失败？

1. 检查磁盘空间
2. 确认输出目录可写
3. 尝试其他格式

### Q: 导出时间过长？

- 降低输出分辨率
- 使用硬件加速
- 选择更快的编码格式

## 其他问题

### Q: 如何反馈问题？

- GitHub Issues: https://github.com/Agions/StoryForge/issues
- 提交问题时请附上错误日志

### Q: 如何参与贡献？

1. Fork 项目
2. 创建特性分支
3. 提交代码
4. 创建 Pull Request

详见 [贡献指南](../CONTRIBUTING.md)。
