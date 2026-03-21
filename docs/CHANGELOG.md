# 更新日志

> 所有项目变更将记录在此文件中

---

## [Unreleased] - 开发中

### 🔧 优化

#### 代码质量提升

| 优化项 | 说明 |
|--------|------|
| 类型统一 | `VideoProject` 类型添加，消除与 `core/types/Project` 命名冲突 |
| 组件模块化 | `VideoProcessingController/modules/` 子组件拆分 |
| 日志重构 | `console.*` → `logger` 统一日志管理 |
| 工具函数去重 | `helpers.ts` 重导出 `array.ts`，消除重复实现 |

#### 构建优化

| 优化项 | 说明 |
|--------|------|
| Vite Chunking | icons 独立打包，提高缓存效率 |
| Bundle 优化 | antd-vendor: 989KB → 922KB |

#### 依赖清理

- 移除未使用依赖：`styled-components`
- 删除死代码：`src/features/` 目录 (-511 行)

### 🧪 测试

| 测试文件 | 测试数 |
|----------|--------|
| `format.test.ts` | 33 |
| `object.test.ts` | 23 |
| `validators.test.ts` | 24 |
| `logger.test.ts` | 9 |
| `route-preload.test.ts` | 7 |
| `model-availability.test.ts` | 9 |
| `shared/utils/common.test.ts` | 30 |
| **总计** | **180+ tests** |

### ✅ 质量门禁

- TypeScript: 0 errors
- ESLint: 0 warnings
- Build: ~15s

---

## [1.0.0-beta] - 2026-03-03

### ✨ 新增功能

- 科技暗黑主题 UI 设计
- 霓虹发光效果
- 玻璃拟态组件
- 简化左侧导航栏
- API 密钥管理面板支持多平台
- 2026年3月最新 AI 模型列表

### 🔄 更新

- 设计系统配色方案
- 布局组件暗色样式
- 输入框样式优化

### 🤖 模型更新

| 厂商 | 模型 |
|------|------|
| OpenAI | GPT-5.3 |
| Anthropic | Claude 4.6 Opus |
| Google | Gemini 3 Ultra |
| DeepSeek | DeepSeek R1 |
| 月之暗面 | Kimi k2.5 |
| 阿里云 | Qwen 3.5 |
| 智谱 | GLM-5 |

### 🗑️ 移除

- 百度 ERNIE 模型

---

## 版本号规范

本项目遵循 [语义化版本控制](https://semver.org/lang/zh-CN/)：

- **MAJOR**: 不兼容的 API 变更
- **MINOR**: 向后兼容的新功能
- **PATCH**: 向后兼容的问题修复

---

## 发布周期

- 每月发布一次小版本
- 重要功能随时发布
- 重大版本每年发布

---

<p align="center">感谢您使用 ClipFlow！</p>
