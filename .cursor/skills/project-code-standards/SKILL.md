---
name: project-code-standards
description: Enforces project code conventions for Vue/Nuxt, TypeScript, styling (UnoCSS/SCSS), icons, composables, and commits. Use when writing or reviewing code in this repo, adding components, hooks, or styles, or when asked about project coding standards.
---

# 项目代码规范

本 Skill 约定本仓库的编码方式、Vue 组件、样式、图标、Composables 与类型、Commit 等规范。Agent 在编写或审查本仓库代码时应遵循并引用对应子文档。

## 规范文档索引

| 大类               | 文件                                         | 内容摘要                                                      |
| ------------------ | -------------------------------------------- | ------------------------------------------------------------- |
| 编码与命名         | [coding-style.md](coding-style.md)           | 缩进/引号/分号、ESLint、文件与函数命名、Commit 规范、Git 规则 |
| Vue 组件           | [vue-components.md](vue-components.md)       | Nuxt 路径即组件名、Props/Emits、类型分离、el-tooltip 坑点     |
| 样式               | [styling.md](styling.md)                     | rem、UnoCSS shortcuts、布局、动态类名、视觉与主题             |
| SCSS               | [scss.md](scss.md)                           | --at-apply、语义类名、避免 BEM、深色模式                      |
| 图标               | [icons.md](icons.md)                         | class 格式 `i-{collection}:{icon-name}`、常用集合与示例       |
| Composables 与类型 | [composables-types.md](composables-types.md) | api/hooks/store/utils 分工、Result&lt;T&gt;、types/ 目录      |
| 路由与页面         | [routing-pages.md](routing-pages.md)         | 文件路由、definePageMeta、layout、目录约定                    |
| 测试与工具         | [testing-tooling.md](testing-tooling.md)     | 当前测试策略、常用命令、Tauri/依赖/OAuth 常见问题             |
| 架构速查           | [architecture.md](architecture.md)           | app 目录、WebSocket/TipTap/Tauri 关键路径、配置与环境         |

## 快速检查清单

- **编码**：2 空格、双引号、分号；Vue 用 `PascalCase.vue`，composables 用 `useXxx.ts`；提交前 `pnpm run lint:fix`。
- **组件**：模板中组件名按 Nuxt 路径（如 `CommonIconTip`）；Props 解构+默认值，类型放单独 `<script lang="ts">`；el-tooltip 不同时用 `:content` 与 `#content`。
- **样式**：尺寸用 rem；优先 `uno.config.ts` shortcuts；scoped SCSS 里用 `--at-apply`，不用裸 `@apply`。
- **图标**：统一 `i-{collection}:{icon-name}`（如 `i-solar:settings-linear`、`i-ri:user-line`）。
- **Composables/类型**：API 返回 `Result<T>`，通用类型放 `app/types/`。
- **Commit**：Conventional Commits；**禁止**在未获用户明确要求时执行 `git commit`。

## 何时查阅子文档

- 新增或修改 **Vue 组件** → vue-components.md
- 写 **样式/SCSS** 或改 UnoCSS → styling.md、scss.md
- 使用或新增 **图标** → icons.md
- 新增 **composable、API、类型** → composables-types.md
- **提交信息** 或 **Git 行为** → coding-style.md
- 新增 **页面/路由** 或设 layout → routing-pages.md
- **测试、构建、Tauri/依赖问题** → testing-tooling.md
- 查 **目录结构或关键文件路径** → architecture.md
