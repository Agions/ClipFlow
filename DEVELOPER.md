# StoryForge 开发者指南

## 环境搭建

### 系统要求

- **Node.js**: ≥ 18
- **pnpm**: ≥ 9
- **Rust**: 最新稳定版（仅开发 Tauri 时需要）
- **FFmpeg**: 必须安装并加入 PATH

### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/Agions/StoryForge.git
cd StoryForge

# 2. 安装 Node 依赖
pnpm install

# 3. 安装 Rust（如需要）
curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 4. 验证 FFmpeg
ffmpeg -version
```

### 开发环境启动

```bash
# 前端开发模式（React + Vite）
npm run dev

# Tauri 开发模式（完整桌面应用）
npm run tauri dev

# 类型检查
npm run type-check

# 运行测试
npm run test
```

---

## 项目结构

```
StoryForge/
├── src/
│   ├── components/          # React 组件
│   │   ├── AIPanel/        # AI 功能面板
│   │   │   ├── AIEditorContext.tsx  # AI 编辑器上下文
│   │   │   └── ClipFlow/             # 剪辑模式组件
│   │   ├── editor/          # 时间线 / 轨道编辑器
│   │   └── common/          # 通用组件
│   ├── core/
│   │   ├── services/        # 业务服务层
│   │   │   ├── ai.service.ts            # AI 模型适配
│   │   │   ├── plotAnalysis.service.ts   # 剧情分析 ✨NEW
│   │   │   ├── aiClip.service.ts        # 智能剪辑
│   │   │   ├── vision.service.ts        # 视觉分析
│   │   │   ├── asr.service.ts          # 语音转写
│   │   │   ├── subtitle.service.ts     # 字幕生成
│   │   │   ├── auto-music.service.ts   # 自动配乐
│   │   │   └── export.service.ts       # 导出服务
│   │   └── types/           # TypeScript 领域模型
│   ├── pages/                # 页面组件
│   ├── hooks/                # 自定义 Hooks
│   ├── store/                # Zustand 状态管理
│   └── utils/                # 工具函数
├── src-tauri/                # Tauri / Rust 后端
│   └── src/
│       ├── lib.rs           # 库入口
│       └── main.rs          # 应用入口
├── docs/                     # 文档（docsify）
└── scripts/                  # 构建脚本
```

---

## 服务层规范

### 新增服务

```typescript
// src/core/services/myService.service.ts

import { BaseService, ServiceError } from "./base.service";
import type { VideoInfo } from "@/core/types";

export class MyService extends BaseService {
  constructor() {
    super("MyService", { timeout: 30000, retries: 2 });
  }

  async processVideo(video: VideoInfo): Promise<Result> {
    return this.executeRequest(
      async () => {
        // 业务逻辑
        return result;
      },
      "处理视频",
      { loadingMessage: "正在处理中..." }
    );
  }
}

export const myService = new MyService();
```

### 在 index.ts 中导出

```typescript
// src/core/services/index.ts
export { myService, MyService } from "./myService.service";
```

---

## 调试技巧

### 前端调试

```bash
# 开启详细日志（开发时控制台会输出 service 层日志）
DEBUG=storyforge:* npm run dev

# React DevTools：安装浏览器扩展
# https://react.dev/learn/react-developer-tools

# Zustand DevTools：浏览器扩展调试状态
```

### Tauri 调试

```bash
# 查看 Rust 日志
tail -f ~/.cache/tauri/logs/*/logs/*.log

# 强制重启 Tauri
npm run tauri dev -- --force
```

### AI 服务调试

在 `.env` 中配置：

```bash
VITE_DEBUG_AI=true
AI_DEBUG_LOG=true
```

---

## 添加新功能

### 1. 添加新的 AI 模型

编辑 `src/core/services/ai.service.ts`：

```typescript
// 1. 在 MODEL_PROVIDERS 添加提供商
const MODEL_PROVIDERS: Record<SupportedProvider, ModelProvider> = {
  // ... 现有配置
  yourprovider: {
    name: "你的模型",
    baseUrl: "https://api.yourmodel.com/v1"
  }
};

// 2. 在 callAPI 中添加对应的请求处理
```

### 2. 添加新的剪辑模式

在 `src/core/services/workflow/steps/` 下新建文件：

```typescript
// src/core/services/workflow/steps/myClipStep.ts

export interface MyClipConfig {
  enabled: boolean;
  // ... 配置项
}

export async function executeMyClipStep(
  videoInfo: VideoInfo,
  config: MyClipConfig,
  updateProgress?: (p: number) => void
): Promise<void> {
  // 实现剪辑逻辑
}
```

### 3. 添加新的服务模块

```typescript
// src/core/services/newService.service.ts

export class NewService extends BaseService {
  async doSomething(param: string): Promise<Result> {
    return this.executeRequest(async () => {
      // ...
    }, "执行操作");
  }
}

export const newService = new NewService();
```

---

## 测试

```bash
# 运行所有测试
npm run test

# 监听模式（开发时使用）
npm run test -- --watch

# 生成覆盖率报告
npm run test:coverage

# UI 测试模式
npm run test:ui
```

### 编写测试

```typescript
// src/utils/__tests__/helpers.test.ts
import { describe, it, expect } from "vitest";
import { yourFunction } from "../helpers";

describe("yourFunction", () => {
  it("应返回预期结果", () => {
    expect(yourFunction("input")).toBe("expected");
  });
});
```

---

## 构建发布

```bash
# 构建前端
npm run build

# 构建 Tauri 应用
npm run tauri build

# 构建特定平台
npm run tauri build -- --target x86_64-pc-windows-msvc    # Windows
npm run tauri build -- --target x86_64-apple-darwin       # macOS
npm run tauri build -- --target x86_64-unknown-linux-gnu  # Linux
```

---

## 代码规范

### TypeScript

- 使用 strict 模式
- 优先使用 `interface`，避免滥用 `any`
- 导出类型而非实现细节

### React

- 使用函数组件 + Hooks
- 组件文件用 PascalCase：`MyComponent.tsx`
- Hooks 以 `use` 开头

### CSS/LESS

- 使用 LESS 模块化样式
- 遵循 BEM 命名约定

---

## 常见问题

### Q: FFmpeg 未找到

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Windows
winget install ffmpeg
```

### Q: Tauri 构建失败

```bash
# 更新 Rust
rustup update

# 清理缓存
cargo clean
npm run tauri build
```

### Q: AI API 调用失败

检查 `.env` 配置：

```bash
VITE_OPENAI_API_KEY=sk-xxx
VITE_ANTHROPIC_API_KEY=xxx
```

---

## 资源链接

| 资源 | 链接 |
|------|------|
| Tauri 文档 | https://tauri.app/v2/guides/ |
| React 文档 | https://react.dev/ |
| TypeScript 手册 | https://www.typescriptlang.org/docs/ |
| Ant Design | https://ant.design/components/overview/ |
| Zustand | https://github.com/pmndrs/zustand |
| StoryForge Issues | https://github.com/Agions/StoryForge/issues |

---

*最后更新：2026-03-28*
