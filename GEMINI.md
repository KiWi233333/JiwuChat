# JiwuChat 项目背景

本文件为 Gemini 等 AI 助手提供项目指导,帮助理解并参与 JiwuChat 项目开发。

## 项目概述

**JiwuChat** 是一个轻量级(~10MB)的跨平台即时通讯(IM)应用,基于 **Tauri 2.9+** 和 **Nuxt.js 4.2** 开发。致力于在桌面端(Windows、MacOS、Linux)、移动端(Android、iOS)以及 Web 平台提供无缝的聊天体验。

该应用包含以下先进特性:

- **AI 集成**:支持多种 AI 模型(如 DeepSeek、Gemini、Kimi AI、讯飞星火等),适用于私聊和群聊
- **实时通信**:基于 WebRTC 的音视频通话与屏幕共享
- **丰富媒体**:支持文本、图片、文件、视频、Markdown、富文本编辑等类型消息
- **跨端同步**:消息可在多设备间实时同步,支持阅读状态同步
- **个性化定制**:支持深/浅色模式、主题切换、字体设置及扩展功能
- **OAuth 认证**:支持多平台 OAuth 登录(GitHub、GitLab、Google、WeChat)

## 技术栈详情

| 类别            | 技术                           | 版本/说明                                 |
| :-------------- | :----------------------------- | :---------------------------------------- |
| **前端框架**    | **Nuxt.js** (Vue 3)            | 4.2,核心 Web UI 框架                      |
| **应用容器**    | **Tauri** (Rust)               | 2.9+,桌面和移动端原生壳,系统功能实现      |
| **UI 组件库**   | **Element Plus**               | 2.13.1,用户界面组件库                     |
| **样式**        | **UnoCSS** & **Sass**          | 原子化 CSS 引擎及预处理器                 |
| **状态管理**    | **Pinia**                      | 3.0.4,应用状态管理                        |
| **语言**        | **TypeScript**                 | 5.9.3,前端主要编程语言,strict 模式        |
| **后台/原生**   | **Rust**                       | 2021 edition,Tauri 原生系统交互           |
| **包管理**      | **pnpm**                       | 10.13.1(必需),严格依赖管理                |
| **Node.js**     | Node.js                        | 22.20.0(由 Volta 管理)                    |
| **构建工具**    | **Vite** + **Rolldown**        | rolldown-vite@7.2.11(pnpm overrides vite) |
| **富文本编辑**  | **TipTap**                     | 支持 markdown、@mentions、表格、任务列表  |
| **Markdown**    | **md-editor-v3**               | 5.8.4,Markdown 编辑器                     |
| **工具库**      | **VueUse**                     | 14.1.0,Vue Composition API 工具集         |
| **3D 图形**     | **ogl**                        | 1.0.11,用于 3D 渲染效果                   |
| **存储服务**    | **qiniu-js**                   | 3.4.3,七牛云对象存储                      |
| **代码质量**    | **ESLint** + **@antfu/eslint** | 9.39.2,代码风格检查                       |
| **Git Hooks**   | **Husky** + **lint-staged**    | 16.2.7,提交前代码检查                     |
| **Commit 规范** | **commitlint**                 | 20.3.0,Conventional Commits 规范          |

## 核心架构

### 前端架构(Nuxt.js)

- **Composables 优先设计**:业务逻辑集中在 `/app/composables/` 目录
  - `/composables/api/` - API 层,提供类型安全的 HTTP 客户端
  - `/composables/hooks/` - 可复用业务逻辑
    - `/hooks/msg/` - 消息处理逻辑
    - `/hooks/oauth/` - OAuth 认证逻辑
    - `/hooks/oss/` - 对象存储服务集成
    - `/hooks/ws/` - WebSocket 管理(包含不同协议适配器)
  - `/composables/store/` - Pinia 状态管理(useChatStore、useUserStore、useSettingStore、useWsStore)
  - `/composables/utils/` - 工具函数
  - `/composables/tauri/` - Tauri 特定集成
- **初始化系统**:`/app/init/` 处理应用启动
  - `system.ts` - 系统初始化
  - `setting/` - 设置初始化
  - `macos.ts` - macOS 特定设置
  - `iframe.ts` - Iframe 集成
  - `share.ts` - 分享功能
- **功能组件化**:`/components/` 按功能组织(chat、user、oauth、settings、common)
- **文件路由**:`/pages/` 目录定义路由
- **自动导入**:Composables 和工具函数通过 Nuxt 配置自动导入

### 后端架构(Tauri/Rust)

- **平台分离**:`/src-tauri/src/desktops/` 用于桌面端,`/mobiles/` 用于移动端
- **模块化结构**:
  - `window.rs` - 窗口管理和动画
  - `tray.rs` - 系统托盘功能
  - `commands.rs` - Tauri 命令处理器
  - `deeplink/` - OAuth 深度链接处理(已模块化)
    - `oauth.rs` - OAuth 回调处理
    - `handlers.rs` - 深度链接处理器
    - `types.rs` - 类型定义
- **插件系统**:广泛使用 Tauri 插件提供原生功能
  - autostart、deep-link、dialog、fs、notification、opener、os、process、shell、updater、upload、websocket 等

### 状态管理

- **Pinia Stores**:基于功能的 stores(useChatStore、useUserStore、useSettingStore、useWsStore)
- **响应式持久化**:设置自动保存到本地存储
- **跨平台同步**:设备间状态同步

### OAuth 集成

- **深度链接处理**:自定义协议 `jiwuchat://oauth/callback`
- **多平台支持**:GitHub、GitLab、Google、WeChat
- **桌面端特定**:原生 OAuth 流程,带窗口管理
- **模块化**:OAuth 逻辑位于 `/src-tauri/src/desktops/deeplink/`

### WebSocket 架构

- **核心**:`/composables/hooks/ws/useWsCore.ts` - WebSocket 连接管理
- **通知**:`/composables/hooks/ws/useWsNotification.ts` - 实时通知
- **状态**:`/composables/store/useWsStore.ts` - 连接状态管理
- **Worker**:`/public/useWsWorker.js` - 后台 WebSocket worker

### TipTap 编辑器集成

- **主组件**:`/components/common/Editor/index.vue`
- **扩展**:Markdown、mentions(@)、表格、任务列表、拖拽句柄、占位符、图片调整大小
- **工具**:`/components/common/Editor/utils.ts` - 编辑器辅助函数
- **类型**:`/components/common/Editor/types.ts` - TypeScript 类型定义

## 开发与使用说明

### 运行前提

- **Node.js**:>= 22.20.0(由 Volta 管理)
- **pnpm**:>= 10.13.1(必需)
- **Rust**:进行 Tauri 开发所需,推荐使用 rustup 管理
- **Tauri CLI**:可通过 `pnpm tauri` 使用

### 常用开发命令

| 命令分类       | 命令                          | 说明                                     |
| :------------- | :---------------------------- | :--------------------------------------- |
| **开发相关**   |                               |                                          |
|                | `pnpm dev:nuxt`               | 启动 Web 端开发模式(最常用)              |
|                | `pnpm dev:vscode:nuxt`        | 启动 Web 端开发模式(带 VS Code 代码检查) |
|                | `pnpm dev:tauri`              | 启动桌面开发模式(Tauri)                  |
|                | `pnpm dev:desktop`            | `dev:tauri` 的别名                       |
|                | `pnpm dev:android`            | 启动 Android 端开发模式                  |
|                | `pnpm dev:ios`                | 启动 iOS 端开发模式(仅 macOS)            |
|                | `pnpm prod:nuxt`              | 生产环境测试                             |
|                | `pnpm prod:nuxt:local`        | 本地生产环境测试                         |
| **构建相关**   |                               |                                          |
|                | `pnpm build`                  | 构建 Web 与桌面生产版本(完整构建)        |
|                | `pnpm build:nuxt`             | 仅构建 Web 版本(静态生成)                |
|                | `pnpm build:tauri`            | 仅构建 Tauri(桌面)版本                   |
|                | `pnpm build:android`          | 构建 Android APK                         |
|                | `pnpm build:ios`              | 构建 iOS IPA(仅 macOS)                   |
| **移动端初始** |                               |                                          |
|                | `pnpm android-init`           | 初始化 Android 平台(一次性)              |
|                | `pnpm ios-init`               | 初始化 iOS 平台(一次性,仅 macOS)         |
| **代码质量**   |                               |                                          |
|                | `pnpm lint`                   | 运行 ESLint 检查代码质量                 |
|                | `pnpm lint:fix`               | 自动修复代码格式错误(提交前运行)         |
|                | `pnpm commitlint`             | 检查提交信息格式                         |
|                | `cd src-tauri && cargo check` | Rust 代码类型检查                        |

### 环境配置

项目使用环境变量进行配置:

- `.env.development.local` - 开发环境配置
- `.env.production.local` - 生产环境配置

主要配置项:

- `VITE_API_BASE_URL` - API 基础地址
- `VITE_WS_URL` - WebSocket 地址
- 其他 VITE* 和 TAURI* 前缀的环境变量

## 编码规范

### Vue 组件开发规范

#### Props 定义

- **使用解构默认值**:使用 `defineProps` 直接解构并设置默认值,不使用 `withDefaults`
- **类型定义分离**:将类型定义放在普通 `<script lang="ts">` 块中,逻辑放在 `<script setup lang="ts">` 块中

```vue
<!-- ✅ 正确写法 -->
<script lang="ts">
export interface MyComponentProps {
  name?: string
  count?: number
}
</script>

<script setup lang="ts">
const { name = 'default', count = 0 } = defineProps<MyComponentProps>()
</script>

<!-- ❌ 不推荐:避免使用 withDefaults -->
<script setup lang="ts">
const props = withDefaults(defineProps<MyComponentProps>(), {
  name: 'default',
  count: 0
})
</script>
```

#### 样式规范

- **避免 BEM 命名**:不使用 BEM 嵌套写法(`&__element`、`&--modifier`)
- **使用 UnoCSS 工具类**:优先使用 `uno.config.ts` 中定义的 shortcuts
- **常用颜色类**:
  - 背景:`card-bg-color`、`bg-color`、`bg-color-2`、`bg-color-3`
  - 文字:`text-color`、`text-small`、`text-small-color`、`text-mini`
  - 边框:`border-default`
- **动态样式**:使用 computed 生成类名,避免 `:deep()` 嵌套选择器

### 代码风格

- **Vue 风格**:组件统一使用 `<script setup lang="ts">`
- **样式**:模板中优先使用 **UnoCSS** 工具类,复杂样式或覆盖使用 SCSS 写在 `<style>` 中
- **自动导入**:Nuxt 配置自动导入 composables 和工具函数,无需手动 import
- **Linter**:代码严格遵循 `@antfu/eslint-config` 规则
- **TypeScript**:启用 strict 模式,使用类型安全的 API 调用

### Git Commit 规范

采用 **Conventional Commits** 提交规范,由 Husky 与 commitlint 强制执行:

```text
<type>(<scope>): <subject>

<body>
```

#### Commit Types

- `feat` - 新功能(new feature)
- `fix` - 修复 bug(bug fix)
- `docs` - 文档变更(documentation)
- `style` - 代码格式(formatting,no code change)
- `refactor` - 重构(refactoring)
- `perf` - 性能优化(performance)
- `test` - 增加测试(tests)
- `chore` - 构建/工具变动(build/tooling)
- `revert` - 回退(revert)
- `build` - 打包(build)
- `ci` - CI 配置(CI configuration)

#### 规则

- Type 必须小写
- Header 最大长度:100 字符
- Subject 结尾不加句号
- **不要**包含 footer 内容
- **不要**说明是谁生成的 commit

**示例**:`feat(chat): 添加消息编辑功能`

## 核心配置文件

- **`nuxt.config.ts`**:Nuxt 配置,包括模块(Element Plus、UnoCSS、Pinia)、SSR 设置(已禁用 SPA 模式)和构建选项
- **`src-tauri/tauri.conf.json`**:Tauri 应用配置,包含窗口、权限、包信息、深度链接等
- **`src-tauri/Cargo.toml`**:Rust 依赖管理,包含 Tauri 插件和平台特定依赖
- **`uno.config.ts`**:UnoCSS 配置,定义快捷类/主题色及预设
- **`package.json`**:脚本和依赖定义,`engines` 字段约束 Node(>=20.0.0) 和 pnpm(>=10.0.0) 版本
- **`commitlint.config.ts`**:Commit 信息规范配置

## 平台特定注意事项

### 桌面端开发

- 窗口管理通过 `desktops/window.rs` 实现
- 系统托盘集成必需
- OAuth 需要深度链接注册
- 原生文件系统访问

### 移动端开发

- Android 开发需要 Android Studio
- iOS 开发需要 Xcode(仅 macOS)
- 触摸优化的 UI 组件
- 平台特定的原生插件

### Web 端开发

- SPA 模式以兼容 Tauri
- 静态站点生成用于部署
- PWA 功能
- API 跨域处理

## 常见问题

### Tauri 构建问题

- 确保 Rust 工具链是最新的:`rustup update`
- 清理 cargo 缓存:`cd src-tauri && cargo clean`
- 检查 Tauri 文档中的平台前提条件

### 依赖问题

- 项目必须使用 pnpm(不支持 npm/yarn)
- 清理缓存:`rm -rf node_modules pnpm-lock.yaml && pnpm install`
- Node.js 版本由 Volta 配置管理

### OAuth 深度链接问题

- 桌面端:检查 Tauri 配置中的协议注册
- 测试:`open "jiwuchat://oauth/callback?platform=test"`
- 通过 `deeplink/` 模块中的模块化处理器调试

## AI 助手交互规则

### 语言要求

- **对话交互**:全程必须使用**中文**
- **代码注释**:全部使用**中文**
- **文案内容**:全部使用**中文**
- **变量命名**:使用英文,但应语义清晰
- **类型定义**:使用英文,注释用中文

### 代码生成规则

1. **优先阅读现有代码**:生成前先阅读相关文件,理解现有架构
2. **遵循项目规范**:严格遵循本文档中的编码规范
3. **类型安全**:所有代码必须类型安全,避免使用 `any`
4. **错误处理**:适当的错误处理和用户提示
5. **性能考虑**:避免不必要的重渲染和计算
6. **安全性**:注意防范常见安全问题(XSS、SQL 注入等)

### 问题解决流程

1. **理解需求**:确保完全理解用户需求
2. **检查现有实现**:搜索项目中是否有类似实现
3. **设计方案**:提出解决方案并解释
4. **实现代码**:生成符合规范的代码
5. **测试验证**:提醒用户测试关键功能

## 项目目标

这是一个生产就绪的聊天应用,具有企业级功能,包括 AI 集成、实时通信和跨平台兼容性。代码应保持高质量标准,具有适当的错误处理、类型安全和响应式设计。
