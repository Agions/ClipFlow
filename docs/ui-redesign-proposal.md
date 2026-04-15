# CutDeck UI 重构方案

> 分析日期: 2026-04-15
> 技术栈: React + TypeScript + Vite + Ant Design 5 + Tauri

---

## 1. 当前 UI 现状分析

### 1.1 组件规模与复杂度

| 组件 | 文件路径 | 行数 | 复杂度评估 |
|------|----------|------|------------|
| Dashboard | `src/pages/Dashboard/index.tsx` | 765 | **高** - 包含大量内联渲染函数 |
| VideoEditor (页面) | `src/pages/VideoEditor/index.tsx` | 279 | **中** |
| Layout | `src/components/Layout.tsx` | 159 | **低** |
| VideoEditor (组件) | `src/components/VideoEditor/index.tsx` | 358+ | **高** - 职责过多 |
| AIAssistant | `src/components/editor/AIAssistant.tsx` | 561 | **高** |
| Timeline | `src/components/editor/Timeline/index.tsx` | 594 | **中** - 已模块化 |

### 1.2 主要问题发现

#### A. 代码重复问题

1. **Dashboard 中的重复模式**:
   - `renderGridItem` (351-437行) 和 `renderListItem` (442-527行) 有大量重复逻辑
   - 项目操作按钮（编辑/导出/更多）在两处几乎相同
   - 状态徽章渲染逻辑重复

2. **样式变量重复定义**:
   - `Dashboard/index.module.less`: 定义了完整的设计系统变量
   - `VideoEditor/index.module.less`: 又重新定义了一遍颜色变量
   - 两个文件使用不同的色彩体系（Dashboard用琥珀色，VideoEditor用电影胶片色）

3. **相同的 StatusBadge 组件逻辑分散**:
   - Dashboard 和其他地方各自实现类似的状态渲染

#### B. 组件职责不清

1. **VideoEditor 页面 vs 组件混淆**:
   - `src/pages/VideoEditor/index.tsx` - 页面容器
   - `src/components/VideoEditor/index.tsx` - 编辑器组件
   - `src/components/VideoEditor/VideoPlayer` - 播放器子组件
   - `src/components/VideoEditor/Timeline` - 时间线子组件
   - `src/components/editor/` - 另一套 Timeline 组件
   - 存在两套并行的 Timeline 组件结构

2. **Dashboard 承担了过多职责**:
   - 数据加载（`loadProjects`）
   - 数据转换（`concurrentMap`）
   - 视图渲染（网格/列表切换）
   - 业务操作（删除、收藏、创建）
   - 统计分析（`totalProjects`, `totalDuration`, `totalSize`）

#### C. 样式不一致

1. **色彩系统冲突**:
   ```
   Dashboard: 深炭底(#0C0D14) + 琥珀光(#FF9F43) + 电青色(#00D4FF)
   VideoEditor: 墨黑(#0d0d0f) + 胶片琥珀(#d4a574)
   ```
   同一应用存在两套完全不同的色彩系统。

2. **圆角半径不统一**:
   - Dashboard: `@radius-xl: 16px`, `@radius-2xl: 24px`
   - VideoEditor: `@radius-lg: 12px`, `@radius-xl: 16px`

3. **字体配置重复**:
   - Dashboard 和 VideoEditor 都定义了 `@font-display`, `@font-body`, `@font-mono`

#### D. 废弃代码未清理

1. **大量 _DEAD 目录**:
   ```
   src/_DEAD/
   ├── pages-Workflow-20260410/    (11个文件)
   ├── pages-Editor-20260410/
   ├── VideoUploader-20260410/
   ├── VideoTimeline-20260410/
   ├── VideoEditor.tsx
   ├── WorkflowMonitor.tsx
   ├── SubtitleEditor-20260410/
   ├── SmartSegmentPanel-20260410/
   ├── ScriptGeneratorV2-20260410/
   ├── HighlightPanel-20260410/
   └── EffectsPanel-20260410/
   ```
   这些文件应该清理或迁移到正式代码。

2. **重复组件**:
   - `src/components/Dashboard.tsx` 与 `src/pages/Dashboard/index.tsx` 功能重叠
   - 两套 Timeline 组件 (`src/components/editor/Timeline/` vs `src/components/VideoEditor/Timeline/`)

#### E. Ant Design 使用不规范

1. **直接操作 DOM**: 
   - Dashboard 中使用原生 `<button>` 而非 Ant Design Button
   
2. **CSS Module 入侵 Ant Design 样式**:
   ```less
   // Dashboard/index.module.less
   :global(.ant-card-actions) {
     background: rgba(12, 13, 20, 0.60) !important;
   }
   ```
   过度使用 `!important` 和 `:global()` 降低可维护性

3. **Props 蔓延**: VideoEditor hook 返回 20+ 个状态/方法，组件间耦合严重

---

## 2. UI 重构方案

### 2.1 组件拆分建议

#### Dashboard 重构

```
src/pages/Dashboard/
├── index.tsx                    # 页面容器（保留）
├── components/
│   ├── StatsCards.tsx           # 统计卡片（从 index.tsx 提取）
│   ├── ProjectGrid.tsx          # 网格视图
│   ├── ProjectList.tsx          # 列表视图（与网格共享 ProjectCard）
│   ├── ProjectCard.tsx          # 项目卡片（网格/列表共用）
│   ├── ProjectToolbar.tsx       # 搜索+视图切换工具栏
│   ├── StatusBadge.tsx          # 状态徽章组件
│   └── QuickTools.tsx           # 快速工具区
├── hooks/
│   ├── useProjects.ts           # 项目数据加载逻辑
│   └── useProjectActions.ts     # 项目操作（删除/收藏）
└── types.ts                     # 类型定义
```

#### VideoEditor 重构

```
src/pages/VideoEditor/
├── index.tsx                    # 页面容器（已良好）
├── components/
│   ├── Toolbar.tsx              # ✅ 已有
│   ├── SegmentList.tsx           # ✅ 已有
│   ├── EditorTabs.tsx           # 新增：右侧标签页容器
│   ├── TrimPanel.tsx            # 新增：片段编辑面板
│   └── EffectsPanel.tsx         # 新增：效果面板（占位）
├── hooks/
│   └── useVideoEditor.ts        # ✅ 已有
└── types.ts
```

### 2.2 代码组织优化

#### 统一设计系统

创建 `src/styles/design-system.ts` 统一管理变量：

```typescript
// 设计令牌（Design Tokens）
export const tokens = {
  colors: {
    bgBase: '#0C0D14',
    bgSurface: '#141520',
    bgElevated: '#1C1D2E',
    accent: '#FF9F43',
    accentLight: '#FFBE76',
    cyan: '#00D4FF',
    textPrimary: '#F0F0F5',
    textSecondary: '#8888A0',
    success: '#4ADE80',
    warning: '#FBBF24',
    error: '#F87171',
  },
  typography: {
    fontDisplay: '"Outfit", system-ui, sans-serif',
    fontBody: '"Figtree", system-ui, sans-serif',
    fontMono: '"JetBrains Mono", monospace',
  },
  spacing: {
    radiusSm: '4px',
    radiusMd: '8px',
    radiusLg: '12px',
    radiusXl: '16px',
  }
} as const;
```

所有 LESS/CSS 文件应引用这些变量，而非重复定义。

#### 清理废弃代码

```bash
# 1. 清理 _DEAD 目录（确认无用的前提下）
rm -rf src/_DEAD/

# 2. 合并重复的 Dashboard 组件
# 保留 src/pages/Dashboard/，删除 src/components/Dashboard.tsx

# 3. 统一 Timeline 组件
# 保留 src/components/editor/Timeline/（已模块化）
# 删除 src/components/VideoEditor/ 下的 Timeline 引用
```

### 2.3 用户体验改进

#### Dashboard UX 优化

1. **虚拟列表**: 当项目超过 50 个时，使用虚拟滚动替代 `Row/Col`
2. **骨架屏**: 完善加载状态，当前仅有 6 个占位卡片
3. **批量操作**: 支持多选项目进行批量删除/导出
4. **空状态**: 优化无项目时的引导流程

#### VideoEditor UX 优化

1. **响应式布局**: 右侧面板在小屏幕应可折叠
2. **键盘快捷键**: 添加完整的快捷键支持（当前仅有 Tooltip 提示）
3. **自动保存**: 实现草稿自动保存机制
4. **导出预览**: 导出前显示预估文件大小和时长

### 2.4 视觉一致性改进

#### 统一颜色主题

```less
// theme.less - 全局主题变量
// 所有页面共享同一色彩系统
@bg-base: #0C0D14;
@bg-surface: #141520;
@bg-elevated: #1C1D2E;
@accent: #FF9F43;
@accent-light: #FFBE76;
@cyan: #00D4FF;
@text-primary: #F0F0F5;
@text-secondary: #8888A0;
@text-tertiary: #55556A;
```

#### 统一组件样式

| 组件 | 现状 | 改进方案 |
|------|------|----------|
| Button | 散落在各 LESS 文件 | 创建 `src/components/common/Button/styles.less` |
| Card | 重复样式定义 | 统一 `Card` 变体（projectCard, toolCard, statCard） |
| Input | 搜索框样式在 Dashboard | 提取为 `SearchInput` 组件 |

#### 动画与过渡

```less
// 统一过渡配置
@transition-fast: 150ms cubic-bezier(0.16, 1, 0.3, 1);
@transition-normal: 200ms cubic-bezier(0.16, 1, 0.3, 1);
@transition-slow: 300ms cubic-bezier(0.16, 1, 0.3, 1);

// 动画应遵循 prefers-reduced-motion
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 3. 重构优先级与计划

### Phase 1: 紧急修复（1-2天）

1. ✅ 清理 `_DEAD` 目录
2. ✅ 删除 `src/components/Dashboard.tsx`（重复）
3. ✅ 统一 Ant Design 按钮使用（用 Ant Button 替代原生 button）

### Phase 2: 设计系统统一（3-5天）

1. 创建 `src/styles/tokens.less` 统一变量
2. 重写 `VideoEditor/index.module.less` 使用统一变量
3. 清理 Dashboard 中的重复色彩定义
4. 创建 `src/components/common/` 公共组件库

### Phase 3: Dashboard 重构（5-7天）

1. 拆分 Dashboard 为独立组件
2. 提取 `useProjects` hook
3. 合并 Grid/List 渲染逻辑
4. 实现虚拟列表（项目 > 50 时）

### Phase 4: VideoEditor 优化（5-7天）

1. 统一 Timeline 组件
2. 拆分 AIClipPanel 为更小组件
3. 添加键盘快捷键
4. 实现自动保存

---

## 4. 附录

### A. 建议的目录结构

```
src/
├── components/
│   ├── common/                  # 公共组件
│   │   ├── Button/
│   │   ├── Card/
│   │   ├── Input/
│   │   └── ...
│   ├── editor/                  # 编辑器相关（已模块化）
│   │   └── Timeline/
│   └── layout/                  # 布局组件
├── pages/
│   ├── Dashboard/
│   ├── VideoEditor/
│   └── ...
├── styles/
│   ├── tokens.less              # 设计令牌
│   ├── theme.less               # 主题变量
│   └── animations.less         # 动画定义
├── hooks/                       # 共享 hooks
└── utils/                       # 共享工具
```

### B. 关键指标

- Dashboard: 765 行 → 目标 300-400 行
- VideoEditor (组件): 358+ 行 → 目标 200 行
- 代码重复率: 目标 < 5%
- 样式一致性: 100% 使用设计令牌

### C. 待讨论

1. 是否需要支持多主题（暗色/亮色）？
2. Timeline 是否需要支持移动端？
3. 是否需要国际化（i18n）支持？
