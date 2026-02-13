# 编码与命名规范

## 基础格式

- **缩进**: 2 空格
- **引号**: 双引号 `"`
- **分号**: 必须
- **ESLint**: 以 ESLint 为准，提交前执行 `pnpm run lint:fix`

## 命名约定

| 类型         | 规范             | 示例                                    |
| ------------ | ---------------- | --------------------------------------- |
| Vue 组件文件 | `PascalCase.vue` | `IconTip.vue`, `PageHeader.vue`         |
| Composables  | `useXxx.ts`      | `useSetting.ts`, `useWsCore.ts`         |
| API 函数     | 小驼峰、语义化   | `getChatMessagePage`, `sendChatMessage` |
| 类型/接口    | PascalCase       | `IconTipProps`, `Result<T>`             |

## Git 与 Commit

### Agent 行为（必须遵守）

- **禁止自动提交**：严禁在完成代码修改后自动执行 `git commit`。
- **仅在用户明确要求时**才执行提交；用户偏好手动处理 commit。

### Commit 格式

Conventional Commits，由 commitlint 校验：

```text
<type>(<scope>): <subject>
```

- **type**（小写）：`feat` | `fix` | `docs` | `style` | `refactor` | `perf` | `test` | `chore` | `revert` | `build` | `ci`
- **scope**：小写，可选
- **subject**：简短描述，结尾不加句号；header 总长不超过 100 字符
- 不包含 footer；不说明是谁生成的 commit

**示例**: `feat(chat): add message editing feature`

## 常用命令

- 开发：`pnpm run dev:nuxt`（Web）、`pnpm run dev:tauri`（桌面）
- 构建：`pnpm run build`、`pnpm run build:nuxt`、`pnpm run build:tauri`
- 代码质量：`pnpm run lint:fix`；Rust：`cd src-tauri && cargo check`
