# 贡献指南

感谢你关注 StoryForge！欢迎为项目贡献代码和想法。

---

## 🤝 如何参与

### 报告问题

遇到问题时，请先搜索 [已有的 Issue](https://github.com/Agions/StoryForge/issues)，避免重复。

报告新问题时请包含：
- **清晰的问题描述**
- **复现步骤**
- **环境信息**（操作系统、Node 版本、Tauri 版本等）
- **相关截图或日志**

### 提交代码

1. **Fork** 本仓库
2. **克隆**你的 Fork：
   ```bash
   git clone https://github.com/YOUR_USERNAME/StoryForge.git
   cd StoryForge
   ```
3. **创建分支**：
   ```bash
   git checkout -b feat/your-feature-name
   ```
4. **开发 & 测试**
5. **提交**（遵守 Commit 规范，见下文）
6. **Push 并发起 Pull Request**

---

## 📝 Commit 规范

每次提交应遵循以下格式：

```
<类型>: <简短描述>

[可选正文：详细解释 "为什么" 而不是 "做了什么"]
[可选正文：包含相关 Issue 编号]
```

### 类型标识

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复 bug |
| `docs` | 文档更新 |
| `style` | 代码格式调整（不影响功能）|
| `refactor` | 代码重构 |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建、工具链变更 |
| `build` | 影响构建系统的变更 |
| `ci` | CI 配置变更 |

### 示例

```
feat(plotAnalysis): 新增剧情图谱生成功能

- 支持场景检测和情感分析
- 输出多版本剪辑建议

Closes #42
```

---

## 🧪 开发指南

### 环境要求

- Node.js ≥ 18
- pnpm ≥ 9
- Rust（仅 Tauri 开发需要）
- FFmpeg

### 开发流程

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 类型检查
npm run type-check

# ESLint 检查
npm run lint

# 运行测试
npm run test
```

### 代码规范

- 使用 **TypeScript**（严格模式）
- 遵循项目 ESLint 和 Prettier 配置
- 新增服务需在 `src/core/services/index.ts` 统一导出
- 公共类型添加到 `src/core/types/`
- 为新功能编写测试（Vitest）

---

## 🔍 Pull Request 审查流程

1. PR 提交后会自动运行 CI（类型检查 / 测试 / 构建）
2. 维护者会尽快 Review
3. 请及时响应 Review 意见并进行修改
4. 至少 1 个维护者 Approve 后合并

### PR 描述模板

```markdown
## 做了什么
（简洁描述改动内容）

## 为什么做
（改动的原因或解决的问题）

## 影响范围
（改动涉及的功能或模块）

## 测试截图
（如有 UI 改动，请附截图）
```

---

## 📐 设计规范

### UI 组件

- 使用 **Ant Design** 作为基础组件库
- 自定义组件放在 `src/components/` 对应子目录下
- 样式使用 **Less**，遵循 Ant Design 变量覆盖规范

### 服务层

- 所有服务继承 `BaseService`
- 统一错误处理使用 `ServiceError`
- 服务实例在 `src/core/services/index.ts` 导出
- 每个服务一个文件，文件名与服务类名对应

### 状态管理

- 使用 **Zustand** 管理全局状态
- Store 文件放在 `src/store/`
- 按功能模块拆分 Store，避免单一 Store 过大

---

## 💬 讨论与社区

- [GitHub Discussions](https://github.com/Agions/StoryForge/discussions) — 功能建议和问答
- [GitHub Issues](https://github.com/Agions/StoryForge/issues) — Bug 报告和功能请求

---

再次感谢你的贡献！🌟
