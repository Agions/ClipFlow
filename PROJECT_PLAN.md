# ClipFlow 项目规划

## 项目概述

**ClipFlow** - AI 驱动的智能视频剪辑桌面应用

### 核心特性
- 🤖 AI 智能剪辑 - 自动识别精彩片段
- 📝 智能字幕 - 语音转文字 + 多语言翻译
- 🎵 自动配乐 - 根据视频情绪匹配背景音乐
- 🔒 本地运行 - 数据隐私安全
- 💻 桌面应用 - Tauri 构建

---

## 竞品分析

### 开源竞品

| 项目 | 特点 | 技术栈 |
|------|------|--------|
| **Lossless-Cut** | 无损剪辑瑞士军刀，基于 FFmpeg | TypeScript/Electron |
| **Shotcut** | 跨平台开源视频编辑 | C++/Qt |
| **Olive** | 免费非线性视频编辑 | C++ |
| **Editly** | 命令行视频编辑声明式工具 | TypeScript |
| **FFCreator** | Node.js 高速视频制作 | JavaScript |

### Lossless-Cut 核心功能参考
- 无损剪辑（基于 FFmpeg 直接数据拷贝）
- 多轨道/流编辑
- 音视频提取与合并
- 视频缩略图与音频波形
- 项目文件保存
- 关键帧时间轴

---

## 架构规划

### 技术栈
```
前端: React 18 + TypeScript + Ant Design 5
桌面: Tauri 2.x
状态管理: Zustand
样式: CSS Modules + Less
AI: 多模型支持 (OpenAI, Anthropic, Google, 国内模型)
视频处理: FFmpeg (Rust bindings)
```

### 项目结构
```
src/
├── components/     # 通用组件
├── pages/         # 页面组件
├── features/      # 功能模块
├── services/      # 业务服务
├── store/         # 状态管理
├── hooks/         # 自定义 Hooks
├── utils/         # 工具函数
├── constants/     # 常量定义
└── styles/       # 全局样式
```

---

## 功能模块

### 1. 核心剪辑 ✅ 已完成
- [x] 项目管理
- [x] 视频上传
- [x] 视频预览
- [x] 时间轴编辑
- [ ] 视频导出 - **待开发**

### 2. AI 功能 ⏳ 开发中
- [ ] 智能分析 (场景检测、关键帧)
- [ ] 脚本生成
- [ ] 去重优化
- [ ] 智能剪辑
- [ ] 字幕生成
- [ ] 自动配乐

### 3. 工作流 ✅ 基础完成
- [x] 多步骤创建流程
- [ ] 任务进度监控
- [ ] 日志展示

---

## UI/UX 设计

### 风格定位
**电影导演工作室风格** - Cinema Director Studio

### 色彩系统
| 名称 | 色值 | 用途 |
|------|------|------|
| Film Amber | #d4a574 | 主色调 |
| Ink Black | #0d0d0f | 背景 |
| Surface | #1c1c22 | 卡片 |
| Text Primary | #f8f8f2 | 文字 |

### 字体系统
- 标题: Outfit
- 正文: DM Sans
- 代码: JetBrains Mono

### 已优化页面
- [x] Layout 全局布局
- [x] Dashboard 项目管理
- [x] Home 首页
- [x] Settings 设置页
- [x] VideoEditor 视频编辑器
- [x] AIVideoEditor AI 剪辑页
- [x] Projects 项目列表
- [x] ProjectEdit 项目编辑
- [x] ProjectDetail 项目详情
- [x] Editor 基础编辑器
- [x] Workflow 工作流
- [x] ScriptDetail 脚本详情

### 设计资源
- frontend-design skill: ✅ 已安装
- ui-ux-pro-max skill: ✅ 已安装

---

## 部署策略

### 云端推送更新
- GitHub Actions 自动构建
- 发布到 GitHub Releases
- Tauri 自动更新

### 构建命令
```bash
# 开发
npm run tauri dev

# 生产构建
npm run tauri build
```

---

## 待办事项

### 高优先级
1. **视频导出功能**
   - 支持 MP4/MOV/WebM 格式
   - 多种分辨率 (720p ~ 4K)
   - 基于 FFmpeg 无损导出

2. **AI 智能分析模块**
   - 场景检测
   - 关键帧提取
   - 视频内容理解

3. **脚本生成器优化**
   - 8大 AI 模型支持
   - 7种模板

### 中优先级
- 性能优化 (大型视频加载)
- 单元测试覆盖
- CI/CD 完善

### 低优先级
- 插件系统
- 主题自定义
- 更多 AI 模型支持

---

## 版本规划

### v1.0 (目标)
- ✅ 项目管理
- ✅ 视频上传/预览
- ⏳ 简单剪辑功能
- ⏳ 导出功能

### v1.1
- AI 智能分析
- 脚本生成
- 工作流优化

### v1.2
- 字幕生成
- 自动配乐
- 更多 AI 模型

---

## 参考资源

### Lossless-Cut 关键特性
- 基于 FFmpeg 无损操作
- 支持大多数视频/音频格式
- 多轨道编辑
- 视频缩略图与音频波形
- 项目文件保存
- 键盘快捷键工作流

### 技术参考
- FFmpeg Rust bindings
- WebCodecs API
- WebAssembly 视频处理

---

*规划日期: 2026-03-11*
*最后更新: 2026-03-11*
