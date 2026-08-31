# 测试与质量验证 (Testing and Verification)

> 🧪 全自动化测试、架构约束扫描与代码质量保障

---

## 验证命令清单

```bash
# 1. 规范与约束一致性扫描 (AntD 零泄露 / kebab-case 命名 / 循环依赖检测 / Token 双向一致)
npm run verify:all

# 2. 前端 165 个 Vitest 测试套件运行 (2,562 个测试用例)
npm run test:run

# 3. TypeScript 静态类型严格检查
npx tsc --noEmit

# 4. Rust 后端单元测试
cd src-tauri && cargo test
```
