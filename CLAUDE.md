# CLAUDE.md

本文件为在仓库中编写、修改代码时提供统一规范与上下文，供 Claude Code 及协作者遵循。全程中文进行回答和编码相关

## Project Overview

JiwuChat 是基于 Tauri 2.9+ 与 Nuxt.js 4.0 的跨平台聊天应用，支持桌面、Web、移动端；轻量（约 10MB），集成 AI、WebRTC 与多平台 OAuth。

## Technology Stack

- **Frontend**: Nuxt.js 4.2 + Vue 3 + TypeScript 5.9.3 + Element Plus 2.13.1 + UnoCSS + Pinia 3.0.4
- **Desktop**: Tauri 2.9+ (Rust)
- **Rich Text**: TipTap（markdown、@ 提及、表格、任务列表）
- **Markdown**: md-editor-v3 5.8.4
- **Package Manager**: pnpm 10.13.1（必须）
- **Node.js**: 22.20.0（Volta 管理）
- **Build**: Vite + Rolldown（rolldown-vite@7.2.11）

## Essential Development Commands

### Development

```bash
pnpm run dev:nuxt          # Web 开发（最常用）
pnpm run dev:vscode:nuxt   # Web + VS Code 调试
pnpm run dev:tauri         # 桌面开发（或 dev:desktop）
pnpm run dev:android       # Android
pnpm run dev:ios           # iOS（仅 macOS）
pnpm run prod:nuxt         # 生产环境本地验证
pnpm run prod:nuxt:local
```

### Building

```bash
pnpm run build       # 全量构建（Web + 桌面）
pnpm run build:nuxt  # 仅 Web
pnpm run build:tauri # 仅桌面
```

### Code Quality

```bash
pnpm run lint:fix              # 提交前执行
cd src-tauri && cargo check    # Rust 类型检查
```

### Mobile

```bash
pnpm run android-init
pnpm run ios-init   # 仅 macOS
```

---

## 编码与命名规范（Coding Style & Naming）

- **缩进**: 2 空格
- **引号**: 双引号 `"`
- **分号**: 必须
- **ESLint**: 以 ESLint 为准，提交前执行 `pnpm run lint:fix`
- **Vue 组件文件**: `PascalCase.vue`
- **Composables**: `useXxx.ts`（如 `useSetting.ts`、`useWsCore.ts`）
- **API 函数**: 小驼峰，语义化（如 `getChatMessagePage`、`sendChatMessage`）

---

## Vue 组件开发规范

### 组件命名与引用（Nuxt 特性）

- **路径即组件名**：Nuxt 按 `components/` 下路径自动注册，路径会转为 PascalCase 组件名。
- 例如：`app/components/common/IconTip/index.vue` → 模板中使用 **`CommonIconTip`**；`common/PageHeader.vue` → **`CommonPageHeader`**。
- 在模板中引用时使用该“路径名”，不要臆造短名（除非在 nuxt.config 中配置了自定义解析）。

### Props 定义

- **解构 + 默认值**：用 `defineProps` 解构并写默认值，**不要**用 `withDefaults`。
- **类型与逻辑分离**：类型放在普通 `<script lang="ts">`，逻辑放在 `<script setup lang="ts">`。

```vue
<script lang="ts">
export interface MyComponentProps {
  name?: string
  count?: number
}
</script>

<script setup lang="ts">
const { name = "default", count = 0 } = defineProps<MyComponentProps>()
</script>
```

### Emits

- 使用 `defineEmits<{ (e: "eventName", payload?: Type): void }>()` 并保持类型明确。

### 已知坑点

- **el-tooltip**：不要同时传 `:content="tip"` 和 `<template #content>`，易导致 “Maximum call stack size exceeded”。只二选一：要么用 `content` 简单文案，要么只用 `#content` 插槽（含自定义或带滚动的内容）。

---

## 样式规范（Styling）

### 单位与布局

- **尺寸一律用 rem**：spacing、font-size、宽高、定位等用 rem，避免 px，保证可缩放与一致性。
- **响应式**：优先 grid + `minmax` 做列表/卡片布局，少用固定 flex 宽度。

### UnoCSS（主样式手段）

- **Shortcuts 优先**：颜色、边框、常用模式用 `uno.config.ts` 中的 shortcuts，保证深色模式与设计一致。
- **常用类**：
  - 背景：`card-bg-color`, `bg-color`, `bg-color-2`, `bg-color-3`, `bg-color-inverse`
  - 文字：`text-color`, `text-small`, `text-small-color`, `text-mini`, `text-mini-50`
  - 边框：`border-default`, `border-default-b`, `border-default-t` 等
  - 按钮语义：`btn-primary`, `btn-danger`, `btn-info` 等
- **动态类名**：用 computed 生成 class，避免在模板里拼长串；尽量少用 `:deep()`。

### SCSS 规范（scoped 组件内）

- **避免 BEM 嵌套**：不用 `&__element`、`&--modifier` 这类 BEM 嵌套。
- **UnoCSS 在 SCSS 中的用法**：在 `<style lang="scss" scoped>` 里用 **`--at-apply`** 引用 UnoCSS 工具类或 shortcuts，避免在 SCSS 里写裸 `@apply`（以免部分环境报 Unknown at rule）。
- **语义类名**：用 SCSS 把多个 utility 组合成语义类（如 `.card-item`），而不是在模板里堆 class。

```scss
.icon-tip {
  --at-apply: "relative cursor-pointer select-none transition-200";
  --at-apply: "inline-flex items-center justify-center";

  &.is-disabled {
    --at-apply: "cursor-not-allowed opacity-50";
  }

  &.is-background {
    --at-apply: "p-1 rounded-sm";
    &:hover:not(.is-disabled) {
      --at-apply: bg-color-inverse text-color;
    }
  }
}
```

- **主题**：所有涉及颜色的地方都要考虑深色模式，优先用 shortcuts 或 `dark:` 修饰符。

### 视觉与交互

- **卡片化**：列表项等用卡片语义，配合 hover（shadow、translate）增强可点击感。
- **装饰**：复杂装饰（背景图案等）用 SCSS/CSS 伪元素，保持 DOM 简洁。

---

## Icon 规范

- **写法**：使用 UnoCSS presetIcons + Iconify，class 格式为 **`i-{collection}:{icon-name}`**。
- **常见集合**：`i-solar:xxx`、`i-carbon:xxx`、`i-ri:xxx` 等。
- 示例：`class="i-solar:settings-linear"`、`:class="'i-carbon:close'"`、`icon="i-ri:user-line"`（组件 prop 传图标时同样用该格式）。

---

## Composables / Hooks 设计

- **位置**：业务逻辑放在 `app/composables/`，按功能分子目录。
- **目录约定**：
  - `api/`：按领域分（chat、user、res、sys 等），每个模块导出具体 API 函数（如 `getChatMessagePage`、`sendChatMessage`）。
  - `hooks/`：可复用业务逻辑（如 `msg/`、`oauth/`、`oss/`、`ws/`），命名 `useXxx.ts`。
  - `store/`：Pinia store（`useChatStore`、`useUserStore`、`useSettingStore`、`useWsStore`）。
  - `utils/`：纯工具（`useHttp`、`useDelay`、`useCheck` 等）。
  - `tauri/`：Tauri 相关（window、tray、setting 等）。
- **API 层**：通过 `useHttp.get/post/put/delete` 等发请求，返回类型使用 `Result<T>`（见 `types/result.ts`），并在 API 函数上写清 JSDoc（用途、参数、返回值）。

---

## 类型定义（TypeScript）

- **集中定义**：通用类型、枚举、接口放在 `app/types/`（如 `result.ts`、`index.ts`、`user/`、`chat/`）。
- **API 与业务类型**：与接口强相关的类型可放在对应 composable 或组件同目录；若多处复用则提到 `types/`。
- **Result 规范**：后端统一包装为 `Result<T>`，使用 `types/result.ts` 中的 `StatusCode` 与 `Result<T>`，并在 composables 中统一处理 `res.code === StatusCode.SUCCESS` 等逻辑。

---

## Architecture Overview

### Frontend (Nuxt)

- **Composables 优先**：逻辑在 composables，组件偏展示与交互。
- **初始化**：`app/init/`（system、setting、macos、iframe、share 等）。
- **组件**：按功能分（chat、user、oauth、settings、common），公共组件在 `common/`。
- **路由**：`pages/` 文件即路由；自动导入 composables 与工具。

### Backend (Tauri/Rust)

- 桌面逻辑在 `src-tauri/src/desktops/`，移动在 `mobiles/`；窗口、托盘、命令、deeplink 等模块化组织。

### State

- Pinia stores 按功能划分；设置类状态可配合持久化（如本地存储）。

### OAuth

- 协议：`jiwuchat://oauth/callback`；多端支持；桌面端 deeplink 在 `deeplink/` 模块。

---

## Configuration & Build

- **关键配置**：`nuxt.config.ts`（SPA、UnoCSS、Element Plus、Pinia 等）、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml`。
- **环境**：`.env.development.local` / `.env.production.local`，敏感信息不入库。
- **构建**：pnpm 中 vite 被 override 为 rolldown-vite；UnoCSS shortcuts 见 `uno.config.ts`。

---

## Commit 规范

- **格式**：Conventional Commits，commitlint 校验：`<type>(<scope>): <subject>`。
- **Type**：`feat` | `fix` | `docs` | `style` | `refactor` | `perf` | `test` | `chore` | `revert` | `build` | `ci`。
- **规则**：type 小写；header 不超过 100 字符；subject 结尾无句号；不自动 commit，仅在用户明确要求时执行 `git commit`。
- **示例**：`feat(chat): add message editing feature`。

---

## 其他约定

### WebSocket

- 核心：`composables/hooks/ws/useWsCore.ts`；通知：`useWsNotification.ts`；状态：`useWsStore.ts`；Worker：`public/useWsWorker.js`。

### TipTap Editor

- 组件：`components/common/Editor/index.vue`；扩展（markdown、@、表格、任务列表等）、工具与类型见同目录。

### 测试

- 当前无正式测试框架；改动后至少跑 `pnpm run lint:fix` 和 `pnpm run dev:nuxt` 做基础验证；Rust 改动在 `src-tauri` 下跑 `cargo fmt` 与 `cargo test`。

### 常见问题

- Tauri 构建：更新 Rust、必要时 `cargo clean`。
- 依赖：只用 pnpm；异常时清 `node_modules` 与 lockfile 再装。
- OAuth 桌面端：检查协议注册与 deeplink 处理。

---

本文档与 `.cursorrules`、`AGENTS.md` 一起构成项目规范；开发与 AI 协作者应优先遵循本文件中的编码方式、样式规范、SCSS 与 Icon 约定，以及 Nuxt 组件命名与 composables/类型设计。
