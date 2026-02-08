# IconTip 组件使用文档

一个功能丰富的图标提示组件,支持自定义插槽、多种样式和交互模式。

## 功能特性

- ✅ 基于 Element Plus Tooltip 封装
- ✅ 使用 Iconify 图标库,支持海量图标
- ✅ 支持自定义插槽(图标插槽、内容插槽)
- ✅ 移动端自动禁用 tooltip
- ✅ 支持多种交互状态(hover/click/focus)
- ✅ 支持长内容滚动
- ✅ UnoCSS 样式适配,自动支持深色模式
- ✅ TypeScript 完整类型支持

## 基础用法

### 默认信息图标

```vue
<IconTip tip="这是一条提示信息" />
```

### 自定义图标

```vue
<IconTip icon="ri:user-line" tip="用户信息" />

<IconTip icon="ri:settings-line" tip="设置" />

<IconTip icon="carbon:warning" tip="警告信息" />
```

### 尺寸

组件内通过类样式固定为 `1.2rem`，无需传 prop。需其他尺寸时由父级 class 控制（图标继承 font-size）：

```vue
<IconTip icon="ri:heart-line" tip="收藏" />

<span class="text-1.5rem"><IconTip icon="ri:star-line" tip="大号" /></span>
```

## 样式定制

### 背景样式

```vue
<!-- 无背景 -->
<IconTip icon="ri:help-line" tip="帮助" :background="false" />

<!-- 圆形背景 -->
<IconTip icon="ri:close-line" tip="关闭" round />

<!-- 激活状态(主题色背景) -->
<IconTip icon="ri:check-line" tip="已选中" active />
```

### Tooltip 主题

```vue
<!-- 深色主题(默认) -->
<IconTip icon="ri:moon-line" tip="深色模式" effect="dark" />

<!-- 浅色主题 -->
<IconTip icon="ri:sun-line" tip="浅色模式" effect="light" />
```

### 显示位置

```vue
<IconTip icon="ri:arrow-up-line" tip="上方" placement="top" />

<IconTip icon="ri:arrow-down-line" tip="下方" placement="bottom" />

<IconTip icon="ri:arrow-left-line" tip="左侧" placement="left" />

<IconTip icon="ri:arrow-right-line" tip="右侧" placement="right" />
```

## 高级功能

### 禁用状态

```vue
<IconTip icon="ri:lock-line" tip="已锁定" disabled />
```

### 长内容滚动

```vue
<IconTip
  icon="ri:article-line"
  tip="这是一段很长的文本内容,超过容器高度后会自动显示滚动条..."
  :enabled-scroll-content="true"
  popover-max-height="200px"
  popover-max-width="400px"
/>
```

### 点击触发

```vue
<IconTip
  icon="ri:more-line"
  tip="点击查看更多"
  trigger="click"
  @click="handleClick"
/>
```

### 自定义延迟

```vue
<!-- 立即显示,延迟 200ms 隐藏 -->
<IconTip
  icon="ri:time-line"
  tip="快速提示"
  :show-after="0"
  :hide-after="200"
/>
```

## 插槽定制

### 自定义图标插槽

```vue
<IconTip tip="自定义图标">
  <template #default>
    <img src="/logo.png" alt="logo" style="width: 16px; height: 16px;" />
  </template>
</IconTip>
```

### 自定义内容插槽

```vue
<IconTip icon="ri:user-line">
  <template #content>
    <div style="padding: 8px;">
      <h4>用户信息</h4>
      <p>姓名: 张三</p>
      <p>邮箱: zhangsan@example.com</p>
    </div>
  </template>
</IconTip>
```

### 复杂示例

```vue
<IconTip
  icon="ri:notification-line"
  :enabled-scroll-content="true"
  popover-max-height="300px"
>
  <template #content>
    <div class="notification-list">
      <div v-for="item in notifications" :key="item.id" class="notification-item">
        <span>{{ item.title }}</span>
        <span class="time">{{ item.time }}</span>
      </div>
    </div>
  </template>
</IconTip>
```

## 实际应用场景

### 表单字段说明

```vue
<el-form-item label="用户名">
  <el-input v-model="form.username" />
  <span class="text-0.875rem">
    <IconTip
      icon="ri:question-line"
      tip="用户名长度为 4-20 个字符,支持字母、数字和下划线"
    />
  </span>
</el-form-item>
```

### 工具栏按钮

```vue
<div class="toolbar">
  <IconTip icon="ri:save-line" tip="保存" @click="handleSave" />
  <IconTip icon="ri:delete-bin-line" tip="删除" @click="handleDelete" />
  <IconTip icon="ri:download-line" tip="下载" @click="handleDownload" />
  <IconTip icon="ri:share-line" tip="分享" @click="handleShare" />
</div>
```

### 状态指示器

```vue
<span class="text-0.75rem">
  <IconTip
    icon="ri:circle-fill"
    :tip="isOnline ? '在线' : '离线'"
    :active="isOnline"
    round
  />
</span>
```

### 功能开关

```vue
<IconTip
  icon="ri:notification-line"
  :tip="notificationEnabled ? '消息通知已开启' : '消息通知已关闭'"
  :active="notificationEnabled"
  round
  @click="toggleNotification"
/>
```

## Props 说明

| 属性                 | 类型    | 默认值                  | 说明                                    |
| -------------------- | ------- | ----------------------- | --------------------------------------- |
| icon                 | string  | `'ri:information-line'` | Iconify 图标名称                        |
| tip                  | string  | `''`                    | 提示文本内容                            |
| placement            | string  | `'top'`                 | tooltip 显示位置                        |
| effect               | string  | `'dark'`                | tooltip 主题(dark/light)                |
| disabled             | boolean | `false`                 | 是否禁用                                |
| round                | boolean | `false`                 | 是否圆形背景                            |
| active               | boolean | `false`                 | 是否激活状态                            |
| background           | boolean | `true`                  | 是否显示背景                            |
| enabledScrollContent | boolean | `false`                 | 是否启用滚动内容                        |
| popoverMaxWidth      | string  | `'300px'`               | 弹窗最大宽度                            |
| popoverMaxHeight     | string  | `'300px'`               | 弹窗最大高度                            |
| showAfter            | number  | `500`                   | 显示延迟(ms)                            |
| hideAfter            | number  | `0`                     | 隐藏延迟(ms)                            |
| trigger              | string  | `'hover'`               | 触发方式(hover/click/focus/contextmenu) |

## Events

| 事件名 | 参数                  | 说明           |
| ------ | --------------------- | -------------- |
| click  | `(event: MouseEvent)` | 点击图标时触发 |

## Slots

| 插槽名  | 说明                |
| ------- | ------------------- |
| default | 自定义图标内容      |
| content | 自定义 tooltip 内容 |

## 图标资源

本组件使用 Iconify 图标库,支持以下图标集:

- `ri:*` - Remix Icon (推荐)
- `carbon:*` - Carbon Design System
- `solar:*` - Solar Icon Set
- `tabler:*` - Tabler Icons

更多图标请访问: [https://icon-sets.iconify.design/](https://icon-sets.iconify.design/)

## 样式定制

组件使用 UnoCSS shortcuts,自动适配深色模式:

- `bg-color-inverse` - 响应式背景色
- `text-color` - 响应式文本色
- `bg-theme-primary` - 主题色背景

如需自定义样式,可以通过 class 或 style 覆盖。

## 注意事项

1. 移动端(<768px)会自动禁用 tooltip
2. 禁用状态下不会触发 click 事件
3. 图标名称必须是有效的 Iconify 图标标识
4. 使用自定义插槽时,需要自行控制图标尺寸
