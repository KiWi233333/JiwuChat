# 测试与工具链

## 当前测试策略

- **无正式 JS 测试框架**：`package.json` 中未配置 Vitest 等。
- **最低验证**：改动后执行 `pnpm run lint`（或 `pnpm run lint:fix`）和 `pnpm run dev:nuxt` 做基础验证。
- **Rust**：在 `src-tauri` 下执行 `cargo fmt`、`cargo test`。

## 未来引入测试时

- Vue 组件与 composables：建议 Vitest。
- Rust：保持 `cargo test`。
- 关键流程 E2E：可考虑 Playwright。

## 常用命令速查

| 用途      | 命令                          |
| --------- | ----------------------------- |
| 开发 Web  | `pnpm run dev:nuxt`           |
| 开发桌面  | `pnpm run dev:tauri`          |
| 全量构建  | `pnpm run build`              |
| 代码检查  | `pnpm run lint:fix`           |
| Rust 检查 | `cd src-tauri && cargo check` |

## 常见问题

- **Tauri 构建失败**：更新 Rust（`rustup update`）；必要时 `cd src-tauri && cargo clean`。
- **依赖异常**：仅用 pnpm；可尝试 `rm -rf node_modules pnpm-lock.yaml && pnpm install`。Node 版本由 Volta 管理。
- **OAuth 桌面端**：检查 `tauri.conf.json` 中协议注册；测试 `open "jiwuchat://oauth/callback?platform=test"`；逻辑在 `src-tauri/src/desktops/deeplink/`。
