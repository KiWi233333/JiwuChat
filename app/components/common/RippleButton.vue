<!--
  波纹按钮组件
  封装了波纹效果的通用按钮组件
-->
<script lang="ts" setup>
import type { RippleOptions } from "@/composables/utils/useRipple";

interface Props {
  /**
   * 按钮类型
   */
  type?: "primary" | "success" | "warning" | "danger" | "info" | "text"
  /**
   * 按钮大小
   */
  size?: "large" | "default" | "small"
  /**
   * 是否禁用
   */
  disabled?: boolean
  /**
   * 波纹配置
   */
  rippleOptions?: RippleOptions
}

const props = withDefaults(defineProps<Props>(), {
  type: "primary",
  size: "default",
  disabled: false,
});

const emit = defineEmits<{
  (e: "click", event: MouseEvent): void
}>();

// 使用波纹效果
const { createRipple } = useRipple(props.rippleOptions);

function handleClick(event: MouseEvent) {
  if (!props.disabled) {
    createRipple(event);
    emit("click", event);
  }
}
</script>

<template>
  <button
    class="ripple-button"
    :class="[
      `ripple-button--${type}`,
      `ripple-button--${size}`,
      { 'is-disabled': disabled },
    ]"
    :disabled="disabled"
    @click="handleClick"
  >
    <slot />
  </button>
</template>

<style lang="scss" scoped>
.ripple-button {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  user-select: none;

  &--large {
    padding: 12px 24px;
    font-size: 16px;
  }

  &--small {
    padding: 6px 12px;
    font-size: 12px;
  }

  &--primary {
    background-color: var(--el-color-primary);
    color: white;

    &:hover:not(.is-disabled) {
      background-color: var(--el-color-primary-light-3);
    }
  }

  &--success {
    background-color: var(--el-color-success);
    color: white;

    &:hover:not(.is-disabled) {
      background-color: var(--el-color-success-light-3);
    }
  }

  &--warning {
    background-color: var(--el-color-warning);
    color: white;

    &:hover:not(.is-disabled) {
      background-color: var(--el-color-warning-light-3);
    }
  }

  &--danger {
    background-color: var(--el-color-danger);
    color: white;

    &:hover:not(.is-disabled) {
      background-color: var(--el-color-danger-light-3);
    }
  }

  &--info {
    background-color: var(--el-color-info);
    color: white;

    &:hover:not(.is-disabled) {
      background-color: var(--el-color-info-light-3);
    }
  }

  &--text {
    background-color: transparent;
    color: var(--el-text-color-primary);

    &:hover:not(.is-disabled) {
      background-color: var(--el-fill-color-light);
    }
  }

  &.is-disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>

