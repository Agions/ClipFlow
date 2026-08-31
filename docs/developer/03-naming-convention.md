# 命名规范与规范约束 (Naming Conventions)

> 📐 StoryFab/Fablr 命名规范与文件组织约束

---

## 核心规则

1. **文件名 kebab-case 强制约束**：
   - 规则：`^[a-z][a-z0-9-]*$`
   - 示例：`asset-hub.module.less`, `use-project-auto-save.ts`
2. **角色后缀拍平 (Role Suffix Flatten)**：
   - 将无工具链依赖的后缀拍平为 `name-role.ext`（例如 `workflow.reducer.ts`）。
3. **禁用 AntD 组件库**：
   - 禁止在任何前端文件中引入 antd 组件，必须使用全站统一的 Tailwind + CSS Modules 设计系统。
