# Icon 规范

## 格式

使用 UnoCSS presetIcons + Iconify，**class 格式**为：

```text
i-{collection}:{icon-name}
```

- `collection`：图标集名称（如 solar、carbon、ri）。
- `icon-name`：该集合内的图标名（如 `settings-linear`、`close`、`user-line`）。

## 常见集合

| 前缀        | 说明          |
| ----------- | ------------- |
| `i-solar:`  | Solar 图标集  |
| `i-carbon:` | Carbon 图标集 |
| `i-ri:`     | Remix Icon    |

## 使用方式

- **模板中直接写 class**：`class="i-solar:settings-linear"`、`class="i-carbon:close"`。
- **动态 class**：`:class="'i-carbon:close'"` 或 `:class="isPlaying ? 'i-solar:stop-bold' : 'i-solar:play-bold'"`。
- **通过组件 prop 传图标**：`icon="i-ri:user-line"`（与 class 格式一致）。

## 示例

```vue
<i class="i-solar:upload-minimalistic-linear p-4" />

<i :class="isPlaying ? 'i-solar:stop-bold' : 'i-solar:play-bold'" class="icon p-1" />

<CommonIconTip icon="i-ri:user-line" tip="用户" />
```

- 尺寸、间距等仍用 UnoCSS 工具类（如 `p-4`、`h-6 w-6`），与图标 class 并列即可。
