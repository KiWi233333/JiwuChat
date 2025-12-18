# useRipple - 波纹涟漪效果

高性能的 Material Design 风格波纹效果，支持多种使用方式。

## 特性

- ✅ 高性能：使用 CSS 动画和 GPU 加速
- ✅ 灵活配置：支持自定义颜色、持续时间、缩放比例
- ✅ 多种用法：Composable、指令、工具函数
- ✅ 自动清理：防止内存泄漏
- ✅ TypeScript 支持：完整的类型定义

## 使用方式

### 1. 使用 v-ripple 指令（推荐）

最简单的使用方式，适合大多数场景。

```vue
<template>
  <!-- 基础用法 -->
  <button v-ripple>
    点击我
  </button>

  <!-- 自定义颜色 -->
  <button v-ripple="{ color: 'rgba(255, 0, 0, 0.3)' }">
    红色波纹
  </button>

  <!-- 自定义持续时间 -->
  <button v-ripple="{ duration: 800 }">
    慢速波纹
  </button>

  <!-- 自定义缩放比例 -->
  <button v-ripple="{ scale: 3 }">
    大波纹
  </button>

  <!-- 禁用波纹 -->
  <button v-ripple="{ disabled: true }">
    无波纹
  </button>

  <!-- 组合配置 -->
  <button v-ripple="{ color: 'rgba(0, 255, 0, 0.4)', duration: 1000, scale: 3 }">
    自定义波纹
  </button>
</template>
```

### 2. 使用 useRipple Composable

适合需要在 JavaScript 中控制波纹的场景。

```vue
<script setup lang="ts">
const { createRipple } = useRipple({
  color: "rgba(var(--el-color-primary-rgb), 0.3)",
  duration: 600,
  scale: 2.5,
});

function handleClick(event: MouseEvent) {
  createRipple(event);
  // 其他业务逻辑...
}
</script>

<template>
  <div class="menu-item" @click="handleClick">
    菜单项
  </div>
</template>

<style scoped>
.menu-item {
  position: relative;
  overflow: hidden;
}
</style>
```

### 3. 使用 createRipple 工具函数

最灵活的使用方式，适合动态场景。

```vue
<script setup lang="ts">
import { createRipple } from "@/composables/utils/useRipple";

function handleClick(event: MouseEvent) {
  // 直接调用
  createRipple(event, {
    color: "rgba(255, 0, 0, 0.3)",
    duration: 800,
  });
}
</script>
```

### 4. 使用 addRippleEffect 工具函数

适合需要动态添加/移除波纹效果的场景。

```vue
<script setup lang="ts">
import { addRippleEffect } from "@/composables/utils/useRipple";

const buttonRef = ref<HTMLElement>();

onMounted(() => {
  if (buttonRef.value) {
    // 添加波纹效果，返回清理函数
    const cleanup = addRippleEffect(buttonRef.value, {
      color: "rgba(0, 0, 255, 0.3)",
    });

    // 需要时可以移除
    onBeforeUnmount(() => {
      cleanup();
    });
  }
});
</script>

<template>
  <button ref="buttonRef">
    动态波纹
  </button>
</template>
```

### 5. 使用 RippleButton 组件

封装好的按钮组件，开箱即用。

```vue
<template>
  <!-- 基础用法 -->
  <RippleButton @click="handleClick">
    点击我
  </RippleButton>

  <!-- 不同类型 -->
  <RippleButton type="primary">
    主要按钮
  </RippleButton>
  <RippleButton type="success">
    成功按钮
  </RippleButton>
  <RippleButton type="warning">
    警告按钮
  </RippleButton>
  <RippleButton type="danger">
    危险按钮
  </RippleButton>
  <RippleButton type="info">
    信息按钮
  </RippleButton>
  <RippleButton type="text">
    文本按钮
  </RippleButton>

  <!-- 不同大小 -->
  <RippleButton size="large">
    大按钮
  </RippleButton>
  <RippleButton size="default">
    默认按钮
  </RippleButton>
  <RippleButton size="small">
    小按钮
  </RippleButton>

  <!-- 自定义波纹 -->
  <RippleButton
    :ripple-options="{
      color: 'rgba(255, 255, 255, 0.5)',
      duration: 1000,
      scale: 3,
    }"
  >
    自定义波纹
  </RippleButton>

  <!-- 禁用状态 -->
  <RippleButton disabled>
    禁用按钮
  </RippleButton>
</template>
```

## 配置选项

```typescript
interface RippleOptions {
  /**
   * 波纹颜色，支持 CSS 颜色值
   * @default 'rgba(var(--el-color-primary-rgb), 0.3)'
   */
  color?: string

  /**
   * 波纹动画持续时间（毫秒）
   * @default 600
   */
  duration?: number

  /**
   * 波纹最大缩放比例
   * @default 2.5
   */
  scale?: number

  /**
   * 是否禁用波纹效果
   * @default false
   */
  disabled?: boolean
}
```

## 样式要求

使用波纹效果的元素需要满足以下条件：

1. `position: relative` 或其他非 `static` 定位
2. `overflow: hidden` 以裁剪波纹范围

如果使用 `v-ripple` 指令或工具函数，这些样式会自动添加。

## 性能优化

1. **GPU 加速**：使用 `transform` 和 `opacity` 属性
2. **自动清理**：动画结束后自动移除 DOM 元素
3. **单波纹限制**：每个元素最多只保留一个波纹效果
4. **事件优化**：使用事件委托和防抖

## 实际应用示例

### 底部菜单

```vue
<script setup lang="ts">
const { createRipple } = useRipple();

function handleMenuClick(event: MouseEvent, path: string) {
  createRipple(event);
  navigateTo(path);
}
</script>

<template>
  <div class="menu-item" @click="handleMenuClick($event, '/home')">
    <i class="icon" />
    <span>首页</span>
  </div>
</template>

<style scoped>
.menu-item {
  position: relative;
  overflow: hidden;
  cursor: pointer;
}
</style>
```

### 卡片列表

```vue
<template>
  <div
    v-for="item in list"
    :key="item.id"
    v-ripple="{ color: 'rgba(0, 0, 0, 0.1)' }"
    class="card"
    @click="handleCardClick(item)"
  >
    {{ item.title }}
  </div>
</template>

<style scoped>
.card {
  position: relative;
  overflow: hidden;
  padding: 16px;
  cursor: pointer;
}
</style>
```

### 图标按钮

```vue
<template>
  <button
    v-ripple="{ color: 'rgba(255, 255, 255, 0.3)', duration: 400 }"
    class="icon-button"
  >
    <i class="i-solar:heart-outline" />
  </button>
</template>

<style scoped>
.icon-button {
  position: relative;
  overflow: hidden;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: var(--el-color-primary);
  color: white;
  cursor: pointer;
}
</style>
```

## 注意事项

1. 波纹效果会自动注入全局 CSS 动画，无需手动添加
2. 如果元素已有 `position` 和 `overflow` 样式，指令会自动调整
3. 波纹颜色建议使用半透明色，以获得最佳视觉效果
4. 在移动端建议使用较短的持续时间（400-600ms）
5. 对于深色背景，建议使用浅色波纹；浅色背景使用深色波纹

## 浏览器兼容性

- Chrome/Edge: ✅ 完全支持
- Firefox: ✅ 完全支持
- Safari: ✅ 完全支持
- iOS Safari: ✅ 完全支持
- Android Chrome: ✅ 完全支持

## 相关资源

- [Material Design - Ripple](https://material.io/design/interaction/states.html#ripple)
- [CSS Transform Performance](https://web.dev/animations-guide/)

