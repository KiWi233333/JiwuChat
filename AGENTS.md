# Repository Guidelines

## Project Structure

- `app/`: Nuxt (Vue 3 + TypeScript) application code.
  - `app/pages/` routes, `app/components/` UI components, `app/composables/` reusable logic.
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

- Indentation: 2 spaces.
- Quotes: double quotes.
- Semicolons: required.
- Prefer ESLint as the source of truth; run `pnpm run lint:fix` before pushing.
- Naming: Vue components in `PascalCase.vue`, composables as `useXxx.ts`.

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

Derived from component refactoring (e.g., `RobotList.vue`), follow these standards for UI development:

- **Styling Engine (UnoCSS)**:
  - **Shortcuts First**: Always use `uno.config.ts` shortcuts (e.g., `card-bg-color`, `border-default`, `text-small-50`) for colors, borders, and common patterns to ensure automatic Dark Mode support and consistency.
  - **Composition**: Use `@apply` within `<style lang="scss" scoped>` to group utility classes into semantic class names (e.g., `.card-item`) rather than cluttering the HTML template.

- **Units & Responsiveness**:
  - **Use `rem`**: Strictly use `rem` for all dimensions (spacing, sizing, font-size, positioning). Avoid `px` to ensure scalability.
  - **Grid Layouts**: Prefer `grid` with `minmax` for responsive lists instead of fixed flex layouts.

- **Visual Design**:
  - **Card Metaphor**: Use card-based designs with hover effects (shadow, translate) for interactive list items.
  - **Decoration**: Implement complex visual decorations (like background patterns) using SCSS/CSS pseudo-elements to keep the DOM clean.
  - **Theming**: Ensure every color has a dark mode counterpart (handled via UnoCSS shortcuts or `dark:` modifiers).
