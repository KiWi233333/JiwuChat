# Vue 组件开发规范

## 组件命名与引用（Nuxt 特性）

- Nuxt 按 `components/` 下路径自动注册，**路径会转为 PascalCase 组件名**。
- 模板中必须使用该“路径名”，不要臆造短名（除非在 nuxt.config 中配置了自定义解析）。

| 文件路径                                  | 模板中使用的组件名 |
| ----------------------------------------- | ------------------ |
| `app/components/common/IconTip/index.vue` | `CommonIconTip`    |
| `app/components/common/PageHeader.vue`    | `CommonPageHeader` |
| `app/components/common/TextTip/index.vue` | `CommonTextTip`    |

## Props 定义

- **解构 + 默认值**：用 `defineProps` 解构并写默认值，**不要**用 `withDefaults`。
- **类型与逻辑分离**：类型放在普通 `<script lang="ts">`，逻辑放在 `<script setup lang="ts">`。

```vue
<script lang="ts">
export interface MyComponentProps {
  name?: string
  count?: number
}
</script>

<script setup lang="ts">
const { name = "default", count = 0 } = defineProps<MyComponentProps>();
</script>
```

## Emits

- 使用类型明确的 `defineEmits`：

```ts
const emit = defineEmits<{
  (e: "click", event: MouseEvent): void
  (e: "update", value: string): void
}>();
```

## 已知坑点

### el-tooltip

- **不要同时**传 `:content="tip"` 和 `<template #content>`，易导致 “Maximum call stack size exceeded”。
- 只二选一：要么用 `content` 传简单文案，要么只用 `#content` 插槽（含自定义或带滚动的内容）。

## 组件结构建议

- 单文件组件优先 `<script setup lang="ts">`。
- 需要对外暴露类型时，在第一个 `<script lang="ts">` 中 `export interface XxxProps`。
- 样式使用 scoped；UnoCSS 在 SCSS 中通过 `--at-apply` 引用（见 [scss.md](scss.md)）。
