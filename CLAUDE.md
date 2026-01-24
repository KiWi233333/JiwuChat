# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JiwuChat is a cross-platform chat application built with Tauri 2.9+ and Nuxt.js 4.0, supporting desktop, web, and mobile platforms. It's a lightweight (~10MB) instant messaging app with AI integration, WebRTC capabilities, and multi-platform OAuth authentication.

## Technology Stack

**Frontend**: Nuxt.js 4.2 + Vue 3 + TypeScript 5.9.3 + Element Plus 2.13.1 + UnoCSS + Pinia 3.0.4 **Desktop**: Tauri 2.9+ with Rust backend **Rich Text Editor**: TipTap (markdown, mentions, tables, task lists) **Markdown Editor**: md-editor-v3 5.8.4 **Package Manager**: pnpm 10.13.1 (required) **Node.js**: 22.20.0 (managed by Volta) **Build Tool**: Vite with Rolldown optimization (rolldown-vite@7.2.11)

## Essential Development Commands

### Development

```bash
# Web development (most common)
pnpm run dev:nuxt

# Web development with VS Code inspector
pnpm run dev:vscode:nuxt

# Desktop development
pnpm run dev:tauri
# or
pnpm run dev:desktop

# Mobile development
pnpm run dev:android
pnpm run dev:ios  # macOS only

# Production environment testing
pnpm run prod:nuxt
pnpm run prod:nuxt:local
```

### Building

```bash
# Full production build (web + desktop)
pnpm run build

# Web only
pnpm run build:nuxt

# Desktop only
pnpm run build:tauri
```

### Code Quality

```bash
# Lint and fix (run before commits)
pnpm run lint:fix

# Rust type checking
cd src-tauri && cargo check
```

### Mobile Platform Setup

```bash
# Initialize platforms (one-time setup)
pnpm run android-init
pnpm run ios-init  # macOS only
```

## Architecture Overview

### Frontend Architecture (Nuxt.js)

- **Composables-first design**: Business logic in `/app/composables/` directory
  - `/composables/api/` - API layer with type-safe HTTP clients
  - `/composables/hooks/` - Reusable business logic
    - `/hooks/msg/` - Message handling logic
    - `/hooks/oauth/` - OAuth authentication logic
    - `/hooks/oss/` - Object storage service integration
    - `/hooks/ws/` - WebSocket management (with adapters for different protocols)
  - `/composables/store/` - Pinia state management (useChatStore, useUserStore, useSettingStore, useWsStore)
  - `/composables/utils/` - Utility functions
  - `/composables/tauri/` - Tauri-specific integrations
- **Initialization system**: `/app/init/` handles app bootstrapping
  - `system.ts` - System initialization
  - `setting/` - Settings initialization
  - `macos.ts` - macOS-specific setup
  - `iframe.ts` - Iframe integration
  - `share.ts` - Sharing functionality
- **Feature-based components**: `/components/` organized by functionality (chat, user, oauth, settings, common)
- **File-based routing**: `/pages/` directory for route definitions
- **Auto-imports**: Composables and utilities are auto-imported via Nuxt configuration

### Backend Architecture (Tauri/Rust)

- **Platform separation**: `/src-tauri/src/desktops/` for desktop, `/mobiles/` for mobile
- **Modular structure**:
  - `window.rs` - Window management and animations
  - `tray.rs` - System tray functionality
  - `commands.rs` - Tauri command handlers
  - `deeplink/` - OAuth deep link handling (modularized)
- **Plugin system**: Extensive Tauri plugin usage for native features

### State Management

- **Pinia stores**: Feature-based stores (`useChatStore`, `useUserStore`, `useSettingStore`)
- **Reactive persistence**: Settings automatically saved to local storage
- **Cross-platform sync**: State synchronization across devices

### OAuth Integration

- **Deep link handling**: Custom protocol `jiwuchat://oauth/callback`
- **Multi-provider support**: GitHub, GitLab, Google, WeChat
- **Desktop-specific**: Native OAuth flow with window management
- **Modularized**: OAuth logic in `/src-tauri/src/desktops/deeplink/`

## Configuration Files

### Key Config Files

- `nuxt.config.ts` - Nuxt configuration with SPA mode for Tauri
- `src-tauri/tauri.conf.json` - Tauri app configuration
- `src-tauri/Cargo.toml` - Rust dependencies and features
- `.env.development.local` / `.env.production.local` - Environment variables

### Build System

- Uses Vite with custom Rolldown optimization (`rolldown-vite@7.2.11`)
- IMPORTANT: pnpm overrides `vite` with `rolldown-vite` in package.json
- UnoCSS for atomic styling with extensive shortcuts (see uno.config.ts)
- Element Plus with auto-import and theming (light/dark modes)
- TypeScript strict mode enabled with bundler resolution
- Code splitting and chunk optimization configured

## Development Patterns

### Component Development

- Use Vue 3 Composition API consistently
- Follow Element Plus component patterns
- Implement responsive design (mobile-first)
- Use UnoCSS utility classes for styling

### API Integration

- Type-safe API calls via composables in `/composables/api/`
- Error handling with toast notifications
- Loading states management
- Request/response interceptors

### Rust Backend Development

- Platform-specific compilation with `#[cfg()]` attributes
- Modular architecture (see deeplink module as example)
- Error handling with `Result<T, E>` pattern
- Tauri command pattern for frontend-backend communication

### Testing

Currently no test infrastructure exists. When implementing tests:

- Use Vitest for Vue components and composables
- Use cargo test for Rust code
- E2E tests with Playwright for critical flows

## Platform-Specific Notes

### Desktop Development

- Window management through `desktops/window.rs`
- System tray integration required
- Deep link registration for OAuth
- Native file system access

### Mobile Development

- Requires Android Studio for Android development
- Requires Xcode for iOS development (macOS only)
- Touch-optimized UI components
- Platform-specific native plugins

### Web Development

- SPA mode for Tauri compatibility
- Static site generation for deployment
- Progressive Web App features
- Cross-origin handling for APIs

## Common Issues

### Tauri Build Issues

- Ensure Rust toolchain is up to date (`rustup update`)
- Clear cargo cache: `cd src-tauri && cargo clean`
- Check platform prerequisites in Tauri docs

### Dependency Issues

- Use pnpm exclusively (required by project)
- Clear cache: `rm -rf node_modules pnpm-lock.yaml && pnpm install`
- Node.js version managed by Volta configuration

### OAuth Deep Link Issues

- Desktop: Check protocol registration in Tauri config
- Test with: `open "jiwuchat://oauth/callback?platform=test"`
- Debug through modularized handlers in `deeplink/` module

## Project Goals

This is a production-ready chat application with enterprise-level features including AI integration, real-time communication, and cross-platform compatibility. Code should maintain high quality standards with proper error handling, type safety, and responsive design.

## 项目 commit 风格规范

Follow Conventional Commits format with commitlint validation:

```text
<type>(<scope>): <subject>

<body>
```

### Commit Types

- `feat` - 新功能 (new feature)
- `fix` - 修复bug (bug fix)
- `docs` - 文档变更 (documentation)
- `style` - 代码格式 (formatting, no code change)
- `refactor` - 重构 (refactoring)
- `perf` - 性能优化 (performance)
- `test` - 增加测试 (tests)
- `chore` - 构建/工具变动 (build/tooling)
- `revert` - 回退 (revert)
- `build` - 打包 (build)
- `ci` - CI配置 (CI configuration)

### Rules

- Type must be lowercase
- Header max length: 100 characters
- No period at end of subject
- Do NOT include footer content
- Do NOT mention who generated the commit

**Example**: `feat(chat): add message editing feature`

## Vue 组件开发规范

### Props 定义规范

- **使用解构默认值**：使用 `defineProps` 直接解构并设置默认值，不使用 `withDefaults`
- **类型定义分离**：将类型定义放在普通 `<script lang="ts">` 块中，逻辑放在 `<script setup lang="ts">` 块中

```vue
<!-- 正确写法 -->
<script lang="ts">
export interface MyComponentProps {
  name?: string
  count?: number
}
</script>

<script setup lang="ts">
const { name = 'default', count = 0 } = defineProps<MyComponentProps>()
</script>

<!-- 避免使用 withDefaults -->
<script setup lang="ts">
// ❌ 不推荐
const props = withDefaults(defineProps<MyComponentProps>(), {
  name: 'default',
  count: 0
})
</script>
```

### 样式规范

- **避免 BEM 命名**：不使用 BEM 嵌套写法 (`&__element`, `&--modifier`)
- **使用 UnoCSS 工具类**：优先使用 `uno.config.ts` 中定义的 shortcuts
- **常用颜色类**：
  - 背景：`card-bg-color`, `bg-color`, `bg-color-2`, `bg-color-3`
  - 文字：`text-color`, `text-small`, `text-small-color`, `text-mini`
  - 边框：`border-default`
- **动态样式**：使用 computed 生成类名，避免 `:deep()` 嵌套选择器

## WebSocket Architecture

- **Core**: `/composables/hooks/ws/useWsCore.ts` - WebSocket connection management
- **Notifications**: `/composables/hooks/ws/useWsNotification.ts` - Real-time notifications
- **Store**: `/composables/store/useWsStore.ts` - Connection state management
- **Worker**: `/public/useWsWorker.js` - Background WebSocket worker

## TipTap Editor Integration

- **Main Component**: `/components/common/Editor/index.vue`
- **Extensions**: Markdown, mentions (@), tables, task lists, drag handle, placeholder, resize image
- **Utilities**: `/components/common/Editor/utils.ts` for editor helpers
- **Types**: `/components/common/Editor/types.ts` for TypeScript definitions
