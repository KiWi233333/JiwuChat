# JiwuChat Project Context

## Project Overview

**JiwuChat** is a lightweight, cross-platform Instant Messaging (IM) application built with **Tauri 2** and **Nuxt 4**. It is designed to provide a seamless chat experience across Desktop (Windows, MacOS, Linux), Mobile (Android, iOS), and Web platforms.

The application features advanced capabilities including:

- **AI Integration:** Support for multiple AI models (DeepSeek, Gemini, Kimi, etc.) for private and group chats.
- **Real-time Communication:** WebRTC-based audio/video calls and screen sharing.
- **Rich Media:** Support for text, images, files, and markdown.
- **Cross-Platform Sync:** Message synchronization across devices.
- **Customization:** Dark/Light modes, themes, and extensions.

## Tech Stack

| Category                | Technology            | Description                                                |
| :---------------------- | :-------------------- | :--------------------------------------------------------- |
| **Frontend Framework**  | **Nuxt 4** (Vue 3)    | The core web framework used for the UI.                    |
| **Application Wrapper** | **Tauri 2** (Rust)    | Provides the native container for Desktop and Mobile apps. |
| **UI Library**          | **Element Plus**      | Component library for the user interface.                  |
| **Styling**             | **UnoCSS** & **Sass** | Utility-first CSS engine and preprocessor.                 |
| **State Management**    | **Pinia**             | Store for managing application state.                      |
| **Language**            | **TypeScript**        | Primary language for frontend logic.                       |
| **Backend/Native**      | **Rust**              | Used by Tauri for system interactions.                     |
| **Package Manager**     | **pnpm**              | Strict dependency management (requires version >= 10.0.0). |

## Directory Structure

- **`app/`**: The main source directory for the Nuxt application.
  - `pages/`: Application routes/views.
  - `components/`: Reusable Vue components.
  - `composables/`: Shared logic and state (Vue composition API).
  - `assets/`: Static assets and global styles.
  - `layouts/`: Page layouts.
  - `plugins/`: Nuxt plugins.
- **`src-tauri/`**: The Tauri project directory containing Rust configuration and code.
  - `tauri.conf.json`: Main Tauri configuration file.
  - `Cargo.toml`: Rust dependencies.
  - `src/`: Rust source code for native capabilities.
- **`scripts/`**: Custom Node.js scripts for development, building, and maintenance.
- **`.doc/`**: Documentation resources and images.
- **`public/`**: Public static assets served directly.

## Development & Usage

### Prerequisites

- **Node.js**: >= 20.0.0
- **pnpm**: >= 10.0.0
- **Rust**: Required for Tauri development.
- **Tauri CLI**: Installed via `pnpm tauri`.

### Key Commands

| Command            | Description                                           |
| :----------------- | :---------------------------------------------------- |
| **Development**    |                                                       |
| `pnpm dev:tauri`   | Start the app in Desktop development mode (Tauri).    |
| `pnpm dev:desktop` | Alias for `dev:tauri`.                                |
| `pnpm dev:nuxt`    | Start the app in Web development mode (Browser only). |
| `pnpm dev:android` | Start the app in Android development mode.            |
| `pnpm dev:ios`     | Start the app in iOS development mode.                |
| **Building**       |                                                       |
| `pnpm build`       | Build the application for production (Web & Desktop). |
| `pnpm build:nuxt`  | Build only the web version.                           |
| `pnpm build:tauri` | Build only the Tauri (Desktop) version.               |
| **Quality**        |                                                       |
| `pnpm lint`        | Run ESLint to check code quality.                     |
| `pnpm lint:fix`    | specific fix for linting errors.                      |
| `pnpm commitlint`  | specific check for commit message format.             |

## Coding Conventions

- **Vue Style**: Uses `<script setup lang="ts">` for components.
- **Styling**: Prefers **UnoCSS** utility classes within templates. Complex styles or overrides use SCSS in the `<style>` block.
- **Imports**: Auto-imports are configured for composables and utilities via Nuxt.
- **Linting**: Strict linting rules are enforced via `@antfu/eslint-config`.
- **Commits**: Follows **Conventional Commits** standard (e.g., `feat:`, `fix:`, `chore:`), enforced by Husky and commitlint.

## Configuration Files

- **`nuxt.config.ts`**: Configuration for Nuxt, including modules (Element Plus, UnoCSS, Pinia), SSR settings (disabled), and build options.
- **`src-tauri/tauri.conf.json`**: Configuration for the Tauri application, including window settings, permissions, and bundle info.
- **`uno.config.ts`**: Configuration for UnoCSS, defining shortcuts, theme colors, and presets.
- **`package.json`**: Defines scripts and dependencies. Note the `engines` field enforcing Node and pnpm versions.
