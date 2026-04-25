# 贡献指南

感谢你愿意为 CutDeck 贡献代码！本文档帮助你快速上手开发环境。

## 开发环境搭建

### 前置依赖

- Node.js ≥ 18
- Rust ≥ 1.70
- pnpm ≥ 8

### 本地运行

```bash
# 克隆仓库
git clone https://github.com/Agions/CutDeck.git
cd CutDeck

# 安装前端依赖
pnpm install

# 启动文档开发服务器
pnpm docs:dev

# 启动应用（可选）
pnpm app:dev
```

## 分支规范

| 分支 | 用途 |
|------|------|
| `main` | 稳定发布版本 |
| `develop` | 开发主分支 |
| `feat/*` | 新功能开发 |
| `fix/*` | Bug 修复 |
| `refactor/*` | 代码重构 |

## Pull Request 流程

1. 从 `develop` 分支创建你的功能分支
2. 确保所有测试通过：`pnpm test`
3. 提交 PR，描述改动内容与动机
4. 等待 Code Review，至少 1 人 approve 后合并

## 代码风格

- 使用 **ESLint** + **Prettier** 格式化代码
- 提交前运行：`pnpm lint`
- 遵循项目现有的命名约定与目录结构
- 新增组件需附带 TypeScript 类型定义

## 许可

所有贡献必须遵循 MIT 许可证。