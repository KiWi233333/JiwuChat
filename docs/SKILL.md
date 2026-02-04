---
name: jiwuchat-quickstart
description: JiwuChat 项目快速入门知识库 - 基于 Tauri 2.9+ 和 Nuxt.js 4.0 的跨平台聊天应用
version: 1.0.0
source: local-git-analysis
analyzed_commits: 200
generated_at: 2026-02-05
---

# JiwuChat 快速入门知识库

## 项目概述

JiwuChat 是一款基于 **Tauri 2.9+** 和 **Nuxt.js 4.0** 构建的跨平台聊天应用，支持桌面端、Web 端和移动端。应用体积轻量（约 10MB），集成 AI 对话、WebRTC 通话、多平台 OAuth 认证等功能。

### 技术栈速览

| 层级            | 技术            | 版本    |
| --------------- | --------------- | ------- |
| 前端框架        | Nuxt.js + Vue 3 | 4.3.0   |
| 类型系统        | TypeScript      | 5.9.3   |
| UI 组件库       | Element Plus    | 2.13.2  |
| 原子化 CSS      | UnoCSS          | 66.5.3  |
| 状态管理        | Pinia           | 3.0.4   |
| 桌面端          | Tauri (Rust)    | 2.9+    |
| 富文本编辑器    | TipTap          | -       |
| Markdown 编辑器 | md-editor-v3    | 5.8.4   |
| 包管理器        | pnpm            | 10.13.1 |
| Node.js         | (Volta 管理)    | 22.20.0 |
| 构建工具        | Vite + Rolldown | 7.2.11  |

---

## 快速开始

### 环境要求

```bash
# Node.js 22.20.0 (由 Volta 自动管理)
# pnpm 10.13.1 (必须使用 pnpm)
# Rust 工具链 (桌面端开发必需)
```

### 安装依赖

```bash
pnpm install
```

### 开发命令

```bash
# Web 开发 (最常用)
pnpm run dev:nuxt

# 带 VS Code 调试器的 Web 开发
pnpm run dev:vscode:nuxt

# 桌面端开发
pnpm run dev:tauri
# 或
pnpm run dev:desktop

# 移动端开发
pnpm run dev:android
pnpm run dev:ios  # 仅 macOS

# 生产环境测试
pnpm run prod:nuxt
pnpm run prod:nuxt:local
```

### 构建命令

```bash
# 完整生产构建 (Web + 桌面)
pnpm run build

# 仅 Web
pnpm run build:nuxt

# 仅桌面端
pnpm run build:tauri
```

### 代码质量

```bash
# 代码检查和修复 (提交前运行)
pnpm run lint:fix

# Rust 类型检查
cd src-tauri && cargo check
```

---

## 项目目录结构

```txt
JiwuChat/
├── app/                          # Nuxt.js 前端源码 (srcDir)
│   ├── assets/                   # 静态资源 (styles, fonts, images)
│   │   └── styles/               # 全局样式文件
│   │       ├── base.scss         # 基础样式
│   │       ├── animate/          # 动画样式
│   │       ├── element/          # Element Plus 主题覆盖
│   │       ├── overrides.scss    # 组件样式覆盖
│   │       └── patterns/         # 背景图案样式
│   ├── components/               # Vue 组件 (按功能分组)
│   │   ├── auth/                 # 认证相关组件
│   │   ├── btn/                  # 按钮组件
│   │   ├── chat/                 # 聊天核心组件
│   │   │   ├── AI/               # AI 对话组件
│   │   │   ├── ContactList/      # 联系人列表
│   │   │   ├── Dialog/           # 对话框
│   │   │   ├── Friend/           # 好友面板
│   │   │   ├── Message/          # 消息表单和列表
│   │   │   ├── Msg/              # 消息类型组件
│   │   │   ├── Preview/          # 预览组件
│   │   │   └── Room/             # 房间/群组组件
│   │   ├── common/               # 通用组件
│   │   │   ├── Drawer/           # 抽屉组件
│   │   │   ├── Emoji/            # 表情选择器
│   │   │   ├── List/             # 列表组件 (虚拟滚动等)
│   │   │   └── Popup/            # 弹窗组件
│   │   ├── menu/                 # 菜单组件
│   │   ├── setting/              # 设置组件
│   │   └── user/                 # 用户相关组件
│   ├── composables/              # 组合式函数 (核心业务逻辑)
│   │   ├── api/                  # API 层
│   │   │   ├── chat/             # 聊天 API (friend, group, rtc, room, ai)
│   │   │   ├── community/        # 社区 API
│   │   │   ├── res/              # 资源/OSS API
│   │   │   ├── sys/              # 系统 API (api-key)
│   │   │   └── user/             # 用户 API (info, safe, wallet, address, bills)
│   │   ├── hooks/                # 可复用业务逻辑 Hooks
│   │   │   ├── msg/              # 消息处理 (队列, 文件上传, WebRTC, 弹窗)
│   │   │   ├── oauth/            # OAuth 认证
│   │   │   ├── oss/              # OSS 文件上传
│   │   │   └── ws/               # WebSocket 管理
│   │   │       ├── adapters/     # 协议适配器 (浏览器/Tauri)
│   │   │       ├── useWsCore.ts  # WebSocket 核心连接
│   │   │       └── useWsNotification.ts # 实时通知
│   │   ├── store/                # Pinia 状态管理
│   │   │   ├── useChatStore/     # 聊天状态 (核心)
│   │   │   │   └── hooks/        # 模块化 hooks
│   │   │   ├── useUserStore.ts   # 用户状态
│   │   │   ├── useSettingStore.ts# 设置状态
│   │   │   └── useWsStore.ts     # WebSocket 状态
│   │   ├── tauri/                # Tauri 专用集成
│   │   │   ├── setting.ts        # 桌面端设置
│   │   │   ├── extension.ts      # 扩展功能
│   │   │   └── tray.ts           # 系统托盘
│   │   └── utils/                # 工具函数
│   │       ├── useCheck.ts       # 校验工具
│   │       ├── useCrypto.ts      # 加密工具
│   │       ├── useDB.ts          # IndexedDB 操作
│   │       ├── useDelay.ts       # 延迟/防抖
│   │       ├── useSseRequest.ts  # SSE 请求
│   │       ├── useUrl.ts         # URL 处理
│   │       └── useWebToast.ts    # Toast 提示
│   ├── constants/                # 常量定义
│   ├── directives/               # 自定义指令
│   ├── init/                     # 应用初始化
│   │   ├── system.ts             # 系统初始化
│   │   ├── macos.ts              # macOS 专用
│   │   ├── iframe.ts             # iframe 集成
│   │   ├── share.ts              # 分享功能
│   │   └── setting/              # 设置初始化
│   │       ├── autostart.ts      # 开机自启
│   │       ├── font.ts           # 字体设置
│   │       ├── hotkey.ts         # 快捷键
│   │       ├── theme.ts          # 主题
│   │       ├── update.ts         # 更新检测
│   │       ├── visibility.ts     # 窗口可见性
│   │       └── window.ts         # 窗口管理
│   ├── middleware/               # 路由中间件
│   ├── pages/                    # 页面路由 (文件路由)
│   │   ├── index.vue             # 首页 (聊天主界面)
│   │   ├── login.vue             # 登录页
│   │   ├── extend.vue            # 扩展页
│   │   ├── index/                # 聊天子页面
│   │   ├── desktop/              # 桌面端专属页面
│   │   ├── oauth/                # OAuth 回调页面
│   │   ├── user/                 # 用户页面
│   │   └── msg/                  # 消息页面
│   ├── plugins/                  # Nuxt 插件
│   │   ├── error-handler.ts      # 错误处理
│   │   ├── right-menu.ts         # 右键菜单
│   │   └── markdown.ts           # Markdown 渲染
│   ├── types/                    # 类型定义
│   │   ├── chat/                 # 聊天类型
│   │   │   └── WsType.ts         # WebSocket 消息类型
│   │   ├── user/                 # 用户类型
│   │   └── tauri.ts              # Tauri 类型
│   ├── utils/                    # 工具函数
│   └── windows/                  # 窗口管理
│       ├── index.ts              # 窗口定义
│       └── actions.ts            # 窗口操作
├── src-tauri/                    # Tauri Rust 后端
│   ├── src/
│   │   ├── main.rs               # 入口文件
│   │   ├── lib.rs                # 库文件
│   │   ├── desktops/             # 桌面端模块
│   │   │   ├── mod.rs            # 模块导出
│   │   │   ├── setup.rs          # 应用设置
│   │   │   ├── window.rs         # 窗口管理和动画
│   │   │   ├── tray.rs           # 系统托盘
│   │   │   ├── commands.rs       # Tauri 命令
│   │   │   └── deeplink/         # OAuth 深度链接
│   │   │       ├── mod.rs        # 模块导出
│   │   │       ├── handlers.rs   # 链接处理器
│   │   │       ├── oauth.rs      # OAuth 逻辑
│   │   │       └── types.rs      # 类型定义
│   │   └── mobiles/              # 移动端模块
│   │       ├── mod.rs
│   │       ├── setup.rs
│   │       ├── window.rs
│   │       ├── commands.rs
│   │       └── deeplink/         # 移动端深度链接
│   ├── capabilities/             # 权限配置
│   ├── icons/                    # 应用图标
│   ├── tauri.conf.json           # Tauri 主配置
│   ├── tauri.*.conf.json         # 平台特定配置
│   └── Cargo.toml                # Rust 依赖
├── public/                       # 静态资源
│   └── useWsWorker.js            # WebSocket Worker
├── config/                       # 配置文件
├── scripts/                      # 构建脚本
├── nuxt.config.ts                # Nuxt 配置
├── uno.config.ts                 # UnoCSS 配置
├── package.json                  # 项目依赖
├── CLAUDE.md                     # Claude Code 指南
└── README.md                     # 项目说明
```

---

## 核心架构模式

### 1. Composables 优先架构

业务逻辑集中在 `/app/composables/` 目录，通过 Nuxt 自动导入:

```typescript
// composables/api/chat/friend.ts - API 调用示例
export function getFriendList(token: string) {
  return useHttp.get<Result<FriendVO[]>>(
    '/chat/friend/list',
    {},
    {
      headers: { Authorization: token }
    }
  )
}

// 页面/组件中直接使用 (自动导入)
const { data } = await getFriendList(userToken)
```

### 2. 模块化 Store 设计

`useChatStore` 采用组合式模块拆分:

```typescript
// composables/store/useChatStore/index.ts
export const useChatStore = defineStore('chat', () => {
  const ui = createUIModule() // UI 状态
  const compose = createComposeInputModule() // 输入框状态
  const contacts = createContactsModule() // 联系人管理
  const messages = createMessagesModule() // 消息管理
  const members = createMembersModule() // 群成员管理
  const rtc = createRtcModule() // WebRTC 通话

  return { ...ui, ...compose, ...contacts, ...messages, ...members, ...rtc }
})
```

### 3. 平台适配层

桌面端和移动端通过 Rust 模块分离:

```rust
// src-tauri/src/desktops/mod.rs
pub mod setup;
pub mod window;
pub mod tray;
pub mod commands;
pub mod deeplink;

// src-tauri/src/mobiles/mod.rs
pub mod setup;
pub mod window;
pub mod commands;
pub mod deeplink;
```

### 4. WebSocket 架构

```txt
useWsCore.ts          # WebSocket 连接核心
    ↓
adapters/             # 协议适配器
├── browserAdapter    # 浏览器原生 WebSocket
└── tauriAdapter      # Tauri WebSocket 插件
    ↓
useWsNotification.ts  # 消息通知处理
    ↓
useWsStore.ts         # 连接状态管理
```

---

## Commit 规范

项目使用 Conventional Commits + commitlint 校验:

```text
<type>(<scope>): <subject>

# 类型说明
feat      # 新功能
fix       # Bug 修复
docs      # 文档变更
style     # 代码格式 (不影响逻辑)
refactor  # 重构
perf      # 性能优化
test      # 测试
chore     # 构建/工具变动
revert    # 回退
build     # 打包
ci        # CI 配置
```

**示例**:

```bash
feat(chat): 添加消息编辑功能
fix(router): 修复页面跳转状态丢失问题
refactor(drawer): 重构抽屉组件以提升可维护性
style(components): 更新对话框和滑动按钮样式
chore(deps): 升级依赖包版本
```

---

## Vue 组件开发规范

### Props 定义

使用解构默认值，类型分离:

```vue
<script lang="ts">
export interface MyComponentProps {
  name?: string
  count?: number
}
</script>

<script setup lang="ts">
const { name = 'default', count = 0 } = defineProps<MyComponentProps>()
</script>
```

### 样式规范

优先使用 UnoCSS 工具类，避免 BEM:

```vue
<template>
  <!-- 推荐: 使用 UnoCSS shortcuts -->
  <div class="card-bg-color rounded p-4">
    <span class="text-color text-small">内容</span>
  </div>
</template>
```

**常用 UnoCSS Shortcuts**:

| 类名                                     | 作用                |
| ---------------------------------------- | ------------------- |
| `card-bg-color`                          | 卡片背景 (适配暗色) |
| `bg-color` / `bg-color-2` / `bg-color-3` | 背景色层级          |
| `text-color`                             | 主文本颜色          |
| `text-small` / `text-mini`               | 次要文本            |
| `border-default`                         | 默认边框            |
| `btn-primary` / `btn-danger`             | 按钮样式            |
| `flex-row-c-c`                           | 居中 flex           |

---

## 常用文件位置

| 用途              | 路径                                    |
| ----------------- | --------------------------------------- |
| 聊天状态管理      | `app/composables/store/useChatStore/`   |
| 用户状态          | `app/composables/store/useUserStore.ts` |
| WebSocket 管理    | `app/composables/hooks/ws/`             |
| API 调用          | `app/composables/api/`                  |
| 消息组件          | `app/components/chat/Msg/`              |
| Element Plus 主题 | `app/assets/styles/element/`            |
| UnoCSS 配置       | `uno.config.ts`                         |
| Tauri 桌面端      | `src-tauri/src/desktops/`               |
| Tauri 移动端      | `src-tauri/src/mobiles/`                |

---

## 常见问题排查

### Tauri 构建失败

```bash
# 更新 Rust 工具链
rustup update

# 清理 Cargo 缓存
cd src-tauri && cargo clean
```

### 依赖问题

```bash
# 清理并重装
rm -rf node_modules pnpm-lock.yaml && pnpm install
```

### OAuth 深度链接测试

```bash
# macOS 测试
open "jiwuchat://oauth/callback?platform=test"
```

---

## 关键依赖说明

| 包名                   | 用途                                                         |
| ---------------------- | ------------------------------------------------------------ |
| `@tauri-apps/api`      | Tauri 前端 API                                               |
| `@tauri-apps/plugin-*` | Tauri 插件 (autostart, dialog, fs, notification, updater 等) |
| `element-plus`         | UI 组件库                                                    |
| `@vueuse/core`         | Vue 组合式工具集                                             |
| `pinia`                | 状态管理                                                     |
| `qiniu-js`             | 七牛云 OSS 上传                                              |
| `md-editor-v3`         | Markdown 编辑器                                              |
| `rolldown-vite`        | 构建工具 (pnpm overrides)                                    |

---

## 开发工作流

1. **启动开发服务器**: `pnpm run dev:nuxt`
2. **修改代码**: 热更新自动生效
3. **代码检查**: `pnpm run lint:fix`
4. **提交代码**: 遵循 Conventional Commits 规范
5. **构建测试**: `pnpm run build:nuxt`

**提示**: 不要自动提交，用户偏好手动提交代码。
