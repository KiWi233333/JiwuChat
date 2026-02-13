# 架构与关键路径速查

## 前端目录（app/）

| 目录           | 用途                                                                             |
| -------------- | -------------------------------------------------------------------------------- |
| `pages/`       | 文件路由，对应页面                                                               |
| `components/`  | 按功能分：chat、user、settings、common 等；公共组件在 common/                    |
| `composables/` | api、hooks、store、utils、tauri；见 [composables-types.md](composables-types.md) |
| `init/`        | 应用初始化：system、setting、macos、iframe、share                                |
| `types/`       | 通用类型与枚举；Result、StatusCode 在 types/result.ts                            |
| `layouts/`     | Nuxt 布局组件                                                                    |

## 关键模块路径

- **WebSocket**：`composables/hooks/ws/useWsCore.ts`、`useWsNotification.ts`；状态 `store/useWsStore.ts`；Worker `public/useWsWorker.js`。
- **TipTap 编辑器**：`components/common/Editor/index.vue`；工具与类型同目录。
- **Tauri 桌面**：`src-tauri/src/desktops/`（window、tray、deeplink 等）；移动端 `mobiles/`。

## 配置与环境

- **Nuxt**：`nuxt.config.ts`（SPA、UnoCSS、Element Plus、Pinia）。
- **Tauri**：`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml`。
- **环境变量**：`.env.development.local`、`.env.production.local`；敏感信息不入库。
