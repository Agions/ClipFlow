# 剧工 (Fablr) — 架构命名与代码整洁规范 (Clean Code & Naming Guidelines)

本文档定义了「剧工」项目的架构规范、文件命名约定与代码整洁度准则，旨在保证代码库的高专业度、高内聚与极简整洁。

---

## 1. 核心设计原则 (Core Principles)

1. **KISS 原则（Keep It Simple, Stupid）**：
   * 杜绝过度设计与深层无意义抽象；
   * 避免长尾堆叠与冗长啰嗦的命名，追求短小、精准、自解释。
2. **单一职责与模块化（Single Responsibility & Modularization）**：
   * 每个文件聚焦单一能力，目录按领域划分；
   * 统一采用 `index.ts` 作为模块唯一导出收口。
3. **零垃圾残留（Zero Bloat）**：
   * 彻底移除所有废弃库（如 Ant Design）、冗余临时脚本与无用样式。

---

## 2. 文件与目录命名规范 (File & Directory Naming)

### 2.1 文件命名 (Files)
* **标准格式**：纯小写短横线 `kebab-case`，保持短小精炼（如 `app.tsx`, `nav.tsx`, `track.ts`, `clip.ts`）；
* **入口文件**：统一命名为 `index.ts` / `index.tsx`；
* **样式文件**：统一采用 CSS Modules 契约 `index.module.less` 或 `[name].module.less`；
* **测试文件**：契约统一为 `[name].test.ts` 或 `[name].test.tsx`。

### 2.2 目录命名 (Directories)
* **标准格式**：纯小写字母 `kebab-case` 或单次精炼名词（如 `core/`, `stores/`, `pages/`, `hooks/`, `shared/`）；
* **禁止目录名**：禁用 `tmp/`, `temp/`, `new/`, `old/`, `misc/`, `helper/` 等语义模糊的目录。

---

## 3. 函数与变量命名规范 (Function & Variable Naming)

* **短小动宾结构**：推荐优先使用简短有力的动词，例如：
  * 读取 / 加载：`get()`, `load()`, `fetch()`, `read()`
  * 修改 / 保存：`set()`, `save()`, `sync()`, `put()`
  * 流程与动作：`run()`, `init()`, `play()`, `seek()`, `cut()`, `trim()`, `emit()`
  * 状态与判定：`isReady`, `hasKey`, `isOpen`, `isValid`
* **函数长度限制**：单个函数代码行数原则上不超过 50 行，复杂业务拆解为纯函数组合。

---

## 4. 自动化合规检查 (Automated Verifications)

项目在 CI 与本地开发中内置全套自动化检查：
* `npm run verify:antd`：校验零 AntD 代码与组件引用；
* `npm run verify:naming`：校验文件目录 kebab-case 与命名合规；
* `npm run verify:circular`：校验零循环依赖；
* `npm run verify:tokens`：校验 CSS 与 TS 颜色 Token 100% 双向一致性；
* `npm run verify:all`：一键执行全部四项质量守护脚本。
