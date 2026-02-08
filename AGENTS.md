# Repository Guidelines

本仓库规范与 `CLAUDE.md`、`GEMINI.md` 保持一致；Agent 与 AI 协作者应遵循本文档及上述两文件中的编码、样式与提交规则。

## Project Structure

- `app/`: Nuxt (Vue 3 + TypeScript) application code.
  - `app/pages/` routes, `app/components/` UI components, `app/composables/` reusable logic, `app/types/` shared types.
- `src-tauri/`: Tauri 2 backend/packaging (Rust) and native resources.
- `public/`: static assets served as-is (e.g. `public/images/`, `public/sound/`).
- `scripts/`: Node utilities (notably `scripts/check-env.js`, run on `postinstall`).
- `.doc/` and `docs/`: screenshots and documentation content.

## Build, Test, and Development Commands

Use `pnpm` (see `package.json` engines/volta).

- `pnpm install`: installs deps; runs env/tooling checks and may create `.env.*.local` files.
- `pnpm run dev:nuxt`: run the web app locally (loads `.env.development.local`).
- `pnpm run dev:tauri`: run the desktop app (Nuxt + Tauri dev).
- `pnpm run build`: generate Nuxt output and build the Tauri desktop app.
- `pnpm run lint` / `pnpm run lint:fix`: ESLint check / auto-fix.

Tip: set `SKIP_CHECK_ENV=true` to bypass `postinstall` checks.

## Coding Style & Naming

- Indentation: 2 spaces. Quotes: double quotes. Semicolons: required.
- Prefer ESLint as the source of truth; run `pnpm run lint:fix` before pushing.
- Vue components: `PascalCase.vue`. Composables: `useXxx.ts`. API functions: camelCase, semantic names.

## Vue & Nuxt Conventions

- **Component name = path name**: Nuxt auto-registers by path under `components/` (e.g. `common/IconTip/index.vue` → use **`CommonIconTip`** in templates; `common/PageHeader.vue` → **`CommonPageHeader`**). Do not invent short names unless configured in nuxt.config.
- **Props**: Destructure with defaults in `defineProps<Props>()`; do **not** use `withDefaults`. Put types in a separate `<script lang="ts">` block.
- **Emits**: Use typed `defineEmits<{ (e: "eventName", payload?: Type): void }>()`.
- **el-tooltip pitfall**: Do not use both `:content="tip"` and `<template #content>`; use one or the other to avoid "Maximum call stack size exceeded".

## Composables & Types

- **Composables**: `api/` by domain (chat, user, res, sys); `hooks/` as `useXxx.ts` (msg, oauth, oss, ws); `store/` Pinia; `utils/` pure helpers; `tauri/` desktop-specific.
- **API**: Use `useHttp`; return types `Result<T>` from `types/result.ts`; add JSDoc.
- **Types**: Shared types and enums in `app/types/`; use `Result<T>` and `StatusCode` for API responses.

## Testing Guidelines

There is no dedicated JS test runner configured in `package.json` today.

- Minimum validation: `pnpm run lint` and a quick smoke run via `pnpm run dev:nuxt`.
- For Rust changes under `src-tauri/`: run `cargo fmt` and `cargo test` from `src-tauri/`.

## Commits & Pull Requests

**IMPORTANT: Agent Behavior**

- **NEVER** automatically commit changes.
- **ALWAYS** wait for explicit user confirmation or request before running `git commit`.
- The user prefers to handle commits manually.

Commits are enforced by commitlint/husky (Conventional Commits).

- Format: `type(scope): subject` (e.g. `feat(chat): add reply preview`).
- Scopes are lowercase; keep headers ≤ 100 chars.
- Common types: `feat`, `fix`, `docs`, `refactor`, `perf`, `chore`, `build`, `ci`.

PRs should include a clear description, linked issues (if any), and screenshots/GIFs for UI changes.

## Security & Configuration

- Keep secrets out of git; use `.env.development.local` / `.env.production.local` for overrides.
- Avoid changing generated output (`.nuxt/`, `dist/`, `.output/`) in PRs.

## UI Component Standards

Derived from component refactoring (e.g., `RobotList.vue`) and aligned with `CLAUDE.md`:

- **Styling (UnoCSS)**:
  - **Shortcuts first**: Use `uno.config.ts` shortcuts (e.g. `card-bg-color`, `border-default`, `text-small-50`, `btn-primary`) for colors, borders, and patterns; ensures dark mode and consistency.
  - **SCSS in components**: In `<style lang="scss" scoped>`, use **`--at-apply`** to apply UnoCSS utilities/shortcuts (avoid raw `@apply` to prevent linter/Unknown at rule issues). Group utilities into semantic class names (e.g. `.card-item`) instead of cluttering the template.
  - **No BEM**: Do not use BEM nesting (`&__element`, `&--modifier`).

- **Units & layout**:
  - **Use `rem`**: Strictly use `rem` for spacing, font-size, dimensions, positioning. Avoid `px`.
  - **Grid**: Prefer `grid` with `minmax` for responsive lists.

- **Visual & theming**:
  - **Card metaphor**: Card-based list items with hover (shadow, translate).
  - **Decoration**: Complex visuals via SCSS/CSS pseudo-elements.
  - **Dark mode**: Every color must have a dark counterpart (shortcuts or `dark:`).

- **Icons**:
  - Format: **`i-{collection}:{icon-name}`** (UnoCSS presetIcons + Iconify). Examples: `i-solar:xxx`, `i-carbon:xxx`, `i-ri:xxx`. Use as `class="i-solar:settings-linear"` or `icon="i-ri:user-line"` when passing to components.
