# Drawer 抽屉组件

一个功能完整的 Vue 3 抽屉组件,支持四个方向、拖拽关闭、弹性动画等特性。参考 Shadcn UI Drawer 设计,采用 Element Plus 的 Props 风格。

## 特性

- ✅ 支持四个方向(top, bottom, left, right)
- ✅ 可拖拽关闭,带弹性阻尼效果
- ✅ 可配置的拖拽手柄
- ✅ 流畅的过渡动画
- ✅ 支持键盘 ESC 关闭
- ✅ 支持点击遮罩层关闭
- ✅ 支持 destroyOnClose
- ✅ 背景联动效果(下沉/缩放)
- ✅ Element Plus 风格的 Props
- ✅ 完整的 TypeScript 支持
- ✅ 响应式设计

## 基础用法

```vue
<script setup lang="ts">
import Drawer from "@/components/common/Drawer.vue";

const visible = ref(false);
</script>

<template>
  <button @click="visible = true">
    打开抽屉
  </button>

  <Drawer v-model="visible" title="抽屉标题">
    <div>抽屉内容</div>
  </Drawer>
</template>
```

## 不同方向

```vue
<script setup lang="ts">
const bottomDrawer = ref(false);
const topDrawer = ref(false);
const leftDrawer = ref(false);
const rightDrawer = ref(false);
</script>

<template>
  <!-- 从底部弹出(默认) -->
  <Drawer v-model="bottomDrawer" direction="bottom" title="底部抽屉">
    <div>内容...</div>
  </Drawer>

  <!-- 从顶部弹出 -->
  <Drawer v-model="topDrawer" direction="top" title="顶部抽屉">
    <div>内容...</div>
  </Drawer>

  <!-- 从左侧弹出 -->
  <Drawer v-model="leftDrawer" direction="left" title="左侧抽屉">
    <div>内容...</div>
  </Drawer>

  <!-- 从右侧弹出 -->
  <Drawer v-model="rightDrawer" direction="right" title="右侧抽屉">
    <div>内容...</div>
  </Drawer>
</template>
```

## 自定义大小

```vue
<template>
  <!-- 固定高度 -->
  <Drawer v-model="visible" direction="bottom" size="400px">
    <div>内容...</div>
  </Drawer>

  <!-- 固定宽度 -->
  <Drawer v-model="visible" direction="right" size="500px">
    <div>内容...</div>
  </Drawer>

  <!-- 自动高度 -->
  <Drawer v-model="visible" direction="bottom" size="auto">
    <div>内容...</div>
  </Drawer>
</template>
```

## 拖拽配置

```vue
<template>
  <!-- 禁用拖拽 -->
  <Drawer
    v-model="visible"
    :show-handle="false"
    :drag-to-close="false"
  >
    <div>不可拖拽的抽屉</div>
  </Drawer>

  <!-- 自定义拖拽阈值 -->
  <Drawer
    v-model="visible"
    :close-threshold="150"
  >
    <div>需要拖拽 150px 才能关闭</div>
  </Drawer>
</template>
```

## 背景联动效果

抽屉打开时,可以让背景页面产生下沉和缩放效果,增强层次感:

```vue
<template>
  <!-- 启用背景联动(默认) -->
  <Drawer v-model="visible">
    <div>背景会自动下沉和缩放</div>
  </Drawer>

  <!-- 禁用背景联动 -->
  <Drawer v-model="visible" :body-lock="false">
    <div>背景不会变化</div>
  </Drawer>

  <!-- 自定义联动配置 -->
  <Drawer
    v-model="visible"
    :body-lock="{
      target: 'body',
      className: 'my-custom-lock',
      scale: 0.92,
      translateY: 3,
      borderRadius: 1.5
    }"
  >
    <div>自定义背景联动效果</div>
  </Drawer>

  <!-- 针对特定容器 -->
  <Drawer
    v-model="visible"
    :body-lock="{
      target: '#app',
      scale: 0.95,
      translateY: 2
    }"
  >
    <div>只对 #app 容器应用效果</div>
  </Drawer>
</template>
```

### BodyLockConfig 配置项

| 参数 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| target | 目标元素(选择器或元素) | `string \| HTMLElement` | `'.global-drawer-body-locked'` (来自 `DRAWER.BODY_LOCK_CLASS`) |
| className | 添加的类名 | `string` | `'drawer-body-locked'` |
| scale | 缩放比例 | `number` | `0.95` |
| translateY | Y轴偏移距离(rem) | `number` | `2` |
| borderRadius | 圆角大小(rem) | `number` | `1` |

**注意**: 默认的 `target` 使用了全局常量 `DRAWER.BODY_LOCK_CLASS`(定义在 `@/constants/ui.ts`)，它指向应用根元素的类名 `.global-drawer-body-locked`。这样可以确保背景联动效果应用到整个应用容器上。

## 使用插槽

```vue
<template>
  <Drawer v-model="visible">
    <!-- 自定义头部 -->
    <template #header>
      <div class="flex items-center justify-between">
        <h3>自定义头部</h3>
        <button @click="visible = false">关闭</button>
      </div>
    </template>

    <!-- 默认内容 -->
    <div>抽屉内容...</div>

    <!-- 自定义底部 -->
    <template #footer>
      <div class="flex gap-2">
        <button @click="handleConfirm">确认</button>
        <button @click="visible = false">取消</button>
      </div>
    </template>
  </Drawer>
</template>
```

## 事件监听

```vue
<script setup lang="ts">
function onOpen() {
  console.log("抽屉开始打开");
}

function onOpened() {
  console.log("抽屉已完全打开");
}

function onClose() {
  console.log("抽屉开始关闭");
}

function onClosed() {
  console.log("抽屉已完全关闭");
}

function onDragStart() {
  console.log("开始拖拽");
}

function onDragMove(offset: number) {
  console.log("拖拽中,偏移:", offset);
}

function onDragEnd() {
  console.log("拖拽结束");
}
</script>

<template>
  <Drawer
    v-model="visible"
    @open="onOpen"
    @opened="onOpened"
    @close="onClose"
    @closed="onClosed"
    @drag-start="onDragStart"
    @drag-move="onDragMove"
    @drag-end="onDragEnd"
  >
    <div>内容...</div>
  </Drawer>
</template>
```

## Props

| 参数 | 说明 | 类型 | 可选值 | 默认值 |
|------|------|------|--------|--------|
| model-value / v-model | 控制抽屉显示/隐藏 | `boolean` | - | `false` |
| direction | 抽屉方向 | `string` | `top` / `bottom` / `left` / `right` | `bottom` |
| show-handle | 是否显示拖拽手柄 | `boolean` | - | `true` |
| drag-to-close | 是否可以通过拖拽关闭 | `boolean` | - | `true` |
| close-threshold | 拖拽关闭的阈值(px) | `number` | - | `100` |
| close-on-click-modal | 是否点击遮罩层关闭 | `boolean` | - | `true` |
| close-on-press-escape | 是否按ESC关闭 | `boolean` | - | `true` |
| title | 抽屉标题 | `string` | - | - |
| size | 抽屉大小(宽度或高度) | `string \| number` | - | `auto` |
| custom-class | 自定义类名 | `string` | - | - |
| z-index | z-index(未设置时自动使用 Element Plus 管理) | `number` | - | `undefined` |
| modal-opacity | 遮罩层透明度 | `number` | `0-1` | `0.5` |
| duration | 动画时长(ms) | `number` | - | `500` |
| destroy-on-close | 关闭后销毁内容 | `boolean` | - | `false` |
| teleport-to | 传送目标 | `string \| HTMLElement` | - | `body` |
| body-lock | 背景联动效果配置 | `boolean \| BodyLockConfig` | - | `true` |

## Events

| 事件名 | 说明 | 回调参数 |
|--------|------|----------|
| open | 抽屉开始打开时触发 | - |
| opened | 抽屉打开动画结束后触发 | - |
| close | 抽屉开始关闭时触发 | - |
| closed | 抽屉关闭动画结束后触发 | - |
| drag-start | 开始拖拽时触发 | - |
| drag-move | 拖拽移动时触发 | `offset: number` |
| drag-end | 拖拽结束时触发 | - |

## Slots

| 插槽名 | 说明 |
|--------|------|
| default | 抽屉内容 |
| header | 自定义头部内容 |
| footer | 自定义底部内容 |

## 暴露的方法

| 方法名 | 说明 | 参数 |
|--------|------|------|
| open | 打开抽屉 | - |
| close | 关闭抽屉 | - |

## 样式定制

组件使用 UnoCSS shortcuts,支持自动的 Dark Mode。你可以通过 `custom-class` 属性或覆盖 CSS 变量来定制样式:

```vue
<template>
  <Drawer
    v-model="visible"
    custom-class="my-drawer"
  >
    <div>内容...</div>
  </Drawer>
</template>

<style>
.my-drawer {
  --drawer-duration: 500ms;
}

.my-drawer .drawer-body {
  padding: 2rem;
}
</style>
```

## 注意事项

1. **拖拽方向**: 拖拽只能朝关闭方向进行(例如 `bottom` 抽屉只能向下拖拽)
2. **拖拽阻尼**: 默认有 0.7 的阻尼系数,使拖拽更加流畅
3. **性能优化**: 拖拽时禁用过渡动画,提升性能
4. **触摸支持**: 同时支持鼠标和触摸事件
5. **键盘导航**: 支持 ESC 键关闭(可通过 `close-on-press-escape` 禁用)
6. **背景联动**: 默认启用背景联动效果,如不需要可设置 `:body-lock="false"` 禁用
7. **zIndex 管理**: 使用 Element Plus 的 `useZIndex` 自动管理层级,避免冲突

## 完整示例

参考 `DrawerDemo.vue` 查看完整的交互示例,包括:
- 动态数值调整
- 简单图表展示
- 底部操作按钮
- 拖拽关闭交互
