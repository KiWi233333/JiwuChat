# SCSS 规范（scoped 组件内）

## 基本原则

- **避免 BEM 嵌套**：不使用 `&__element`、`&--modifier` 这类 BEM 嵌套写法。
- **语义类名**：用 SCSS 把多个 utility 组合成语义类（如 `.card-item`），而不是在模板里堆 class。
- **主题**：所有涉及颜色的地方都要考虑深色模式，优先用 UnoCSS shortcuts 或 `dark:` 修饰符。

## UnoCSS 在 SCSS 中的用法：`--at-apply`

- 在 `<style lang="scss" scoped>` 里用 **`--at-apply`** 引用 UnoCSS 工具类或 shortcuts。
- **不要**在 SCSS 里写裸 `@apply`，以免部分环境报 “Unknown at rule” 或与 Linter 冲突。

### 写法示例

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

- 多条 utility 可写多行 `--at-apply`，或合并为一行字符串。
- 可混用带引号的字符串与不带引号的 shortcut 名（如 `bg-color-inverse`）。

## 与模板的配合

- 模板中优先写语义类名（如 `class="icon-tip is-background"`），具体样式在 scoped SCSS 中用 `--at-apply` 组合 UnoCSS。
- 需要动态类名时，用 computed 返回类名字符串，避免在模板里拼长串。
