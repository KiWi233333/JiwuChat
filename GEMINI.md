# JiwuChat 项目背景

## 项目概述

**JiwuChat** 是一个轻量级的跨平台即时通讯（IM）应用，基于 **Tauri 2** 和 **Nuxt 4** 开发。致力于在桌面端（Windows、MacOS、Linux）、移动端（Android、iOS）以及 Web 平台提供无缝的聊天体验。

该应用包含以下先进特性：

- **AI 集成**：支持多种 AI 模型（如 DeepSeek、Gemini、Kimi 等），适用于私聊和群聊。
- **实时通信**：基于 WebRTC 的音视频通话与屏幕共享。
- **丰富媒体**：支持文本、图片、文件、Markdown 等类型消息。
- **跨端同步**：消息可在多设备间实时同步。
- **个性化定制**：支持深/浅色模式、主题及扩展功能。

## 技术栈

| 类别            | 技术                  | 说明                             |
| :-------------- | :-------------------- | :------------------------------- |
| **前端框架**    | **Nuxt 4** (Vue 3)    | 核心 Web UI 框架                 |
| **应用容器**    | **Tauri 2** (Rust)    | 桌面和移动端原生壳，系统功能实现 |
| **UI 组件库**   | **Element Plus**      | 用户界面组件库                   |
| **样式**        | **UnoCSS** & **Sass** | 原子化 CSS 引擎及预处理器        |
| **状态管理**    | **Pinia**             | 应用状态管理                     |
| **语言**        | **TypeScript**        | 前端主要编程语言                 |
| **后台 / 原生** | **Rust**              | Tauri 原生系统交互               |
| **包管理**      | **pnpm**              | 严格依赖管理（需版本 >= 10.0.0） |

## 目录结构

- **`app/`**: Nuxt 应用主目录。
  - `pages/`：页面路由与视图。
  - `components/`：可复用的 Vue 组件。
  - `composables/`：共享逻辑与状态（Vue 组合式 API）。
  - `assets/`：静态资源及全局样式。
  - `layouts/`：页面布局。
  - `plugins/`：Nuxt 插件。
- **`src-tauri/`**: Tauri 项目目录，包含 Rust 配置及代码。
  - `tauri.conf.json`：Tauri 主配置文件。
  - `Cargo.toml`：Rust 依赖管理。
  - `src/`：Rust 原生功能源码。
- **`scripts/`**: 自定义 Node.js 脚本（开发、构建、维护）。
- **`.doc/`**: 文档资源与图片。
- **`public/`**: 公共静态资源，直接被服务。

## 开发与使用说明

### 运行前提

- **Node.js**: >= 20.0.0
- **pnpm**: >= 10.0.0
- **Rust**: 进行 Tauri 开发所需
- **Tauri CLI**: 可通过 `pnpm tauri` 安装

### 常用命令

| 命令               | 说明                            |
| :----------------- | :------------------------------ |
| **开发相关**       |                                 |
| `pnpm dev:tauri`   | 启动桌面开发模式（Tauri）       |
| `pnpm dev:desktop` | `dev:tauri` 的别名              |
| `pnpm dev:nuxt`    | 启动 Web 端开发模式（仅浏览器） |
| `pnpm dev:android` | 启动 Android 端开发模式         |
| `pnpm dev:ios`     | 启动 iOS 端开发模式             |
| **构建相关**       |                                 |
| `pnpm build`       | 构建 Web 与桌面生产版本         |
| `pnpm build:nuxt`  | 仅构建 Web 版本                 |
| `pnpm build:tauri` | 仅构建 Tauri（桌面）版本        |
| **代码质量**       |                                 |
| `pnpm lint`        | 运行 ESLint 检查代码质量        |
| `pnpm lint:fix`    | 自动修复代码格式错误            |
| `pnpm commitlint`  | 检查提交信息格式                |

## 编码规范

- **Vue 风格**：组件统一使用 `<script setup lang="ts">`。
- **样式**：模板中优先使用 **UnoCSS** 工具类，复杂样式或覆盖使用 SCSS 写在 `<style>` 中。
- **自动导入**：Nuxt 配置自动导入 composables 和工具函数。
- **Linter**：代码严格遵循 `@antfu/eslint-config` 规则。
- **提交**：采用 **Conventional Commits** 提交规范（如 `feat:`、`fix:`、`chore:`），由 Husky 与 commitlint 强制执行。

## 配置文件

- **`nuxt.config.ts`**：Nuxt 配置，包括模块（Element Plus、UnoCSS、Pinia）、SSR 设置（已禁用）和构建选项。
- **`src-tauri/tauri.conf.json`**：Tauri 应用配置，包含窗口、权限、包信息等。
- **`uno.config.ts`**：UnoCSS 配置，定义快捷类/主题色及预设。
- **`package.json`**：脚本和依赖定义，`engines` 字段约束 Node 和 pnpm 版本。

## 交互规则

- **语言要求**：对话交互及代码注释全程必须使用**中文**。
