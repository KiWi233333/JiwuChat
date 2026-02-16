# 样式规范（UnoCSS 与布局）

## 单位

- **尺寸一律用 rem**：spacing、font-size、宽高、定位等用 rem，避免 px，保证可缩放与一致性。
- 例外：与设计稿或第三方库强绑定的数值可保留 px，但需有明确理由。

## 布局

- **响应式**：优先 `grid` + `minmax` 做列表/卡片布局，少用固定 flex 宽度。
- 常用 UnoCSS 布局类见 `uno.config.ts`（如 `flex-row-c-c`、`flex-row-bt-c`、`absolute-center` 等）。

## UnoCSS（主样式手段）

- **Shortcuts 优先**：颜色、边框、常用模式用 `uno.config.ts` 中的 shortcuts，保证深色模式与设计一致。
- **动态类名**：用 computed 生成 class，避免在模板里拼长串；尽量少用 `:deep()`。

### 常用 shortcuts 速查

| 用途     | 类名示例                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------ |
| 背景     | `card-bg-color`, `bg-color`, `bg-color-2`, `bg-color-3`, `bg-color-inverse`                      |
| 文字     | `text-color`, `text-small`, `text-small-color`, `text-mini`, `text-mini-50`                      |
| 边框     | `border-default`, `border-default-b`, `border-default-t`, `border-default-l`, `border-default-r` |
| 按钮语义 | `btn-primary`, `btn-danger`, `btn-info`, `btn-success`, `btn-warning`, `btn-default`             |

完整列表以项目根目录 `uno.config.ts` 为准。

## 视觉与交互

- **卡片化**：列表项等用卡片语义，配合 hover（shadow、translate）增强可点击感。
- **装饰**：复杂装饰（背景图案等）用 SCSS/CSS 伪元素，保持 DOM 简洁。
- **主题**：所有涉及颜色的地方都要考虑深色模式，优先用 shortcuts 或 `dark:` 修饰符。

## 与 SCSS 的配合

- 组件内复杂样式写在 `<style lang="scss" scoped>` 中，通过 **`--at-apply`** 引用 UnoCSS（详见 [scss.md](scss.md)），不在 SCSS 里写裸 `@apply`。
