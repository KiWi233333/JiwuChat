<script lang="ts">
</script>

<script setup lang="ts">
import { NuxtLink } from "#components";

export interface MenuItemConfig {
  icon?: string
  title: string
  path?: string
  badge?: {
    value?: number | string
    isDot?: boolean
    hidden?: boolean
  }
  onClick?: (e?: MouseEvent) => void
  disabled?: boolean
}

const { item, showArrow = true, variant = "card", size = "medium" } = defineProps<{
  item: MenuItemConfig
  showArrow?: boolean
  variant?: "card" | "list"
  size?: "small" | "medium" | "large"
}>();

const emit = defineEmits<{
  (e: "click", event?: MouseEvent): void
}>();

function handleClick(e?: MouseEvent) {
  if (item.disabled)
    return;

  if (item.onClick) {
    item.onClick(e);
  }
  emit("click", e);
}
</script>

<template>
  <component
    :is="item.path && !item.disabled ? NuxtLink : 'div'"
    v-bind="item.path && !item.disabled ? { 'to': item.path, 'prefetch': true, 'prefetch-on': { visibility: true } } : {}"
    class="menu-item-card" :class="[
      `menu-item-card--${variant}`,
      `menu-item-card--${size}`,
      { 'menu-item-card--disabled': item.disabled },
    ]"
    @click="handleClick"
  >
    <el-badge
      v-if="item.badge"
      :value="item.badge.value"
      :is-dot="item.badge.isDot"
      :hidden="item.badge.hidden"
      class="menu-item-card__badge"
    >
      <i v-if="item.icon" :class="item.icon" class="menu-item-card__icon" />
    </el-badge>
    <i v-else-if="item.icon" :class="item.icon" class="menu-item-card__icon" />

    <span class="menu-item-card__title">{{ item.title }}</span>

    <i v-if="showArrow" class="menu-item-card__arrow i-ri:arrow-right-s-line" />
  </component>
</template>

<style scoped lang="scss">
.menu-item-card {
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  text-decoration: none;
  color: inherit;

  &--card {
    --at-apply: "rounded-lg card-bg-color transition-all-300 active:scale-98";
  }

  &--list {
    --at-apply: "transition-all-300";
  }

  // Size variants
  &--small {
    gap: 0.75rem;

    &.menu-item-card--card {
      padding: 0.75rem 1rem;
    }

    &.menu-item-card--list {
      padding: 0.75rem 0;
    }

    .menu-item-card__icon {
      --at-apply: "h-4 w-4";
    }

    .menu-item-card__title {
      --at-apply: "text-sm";
    }

    .menu-item-card__arrow {
      --at-apply: "h-4 w-4";
    }
  }

  &--medium {
    gap: 0.75rem;

    &.menu-item-card--card {
      padding: 1rem;
    }

    &.menu-item-card--list {
      padding: 0.75rem 0;
    }

    .menu-item-card__icon {
      --at-apply: "h-6 w-6";
    }

    .menu-item-card__title {
      --at-apply: "text-sm";
    }

    .menu-item-card__arrow {
      --at-apply: "h-4 w-4";
    }
  }

  &--large {
    gap: 1rem;

    &.menu-item-card--card {
      padding: 1.25rem 1.5rem;
    }

    &.menu-item-card--list {
      padding: 1rem 0;
    }

    .menu-item-card__icon {
      --at-apply: "h-8 w-8";
    }

    .menu-item-card__title {
      --at-apply: "text-base";
    }

    .menu-item-card__arrow {
      --at-apply: "h-5 w-5";
    }
  }

  &--disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  &__badge {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__icon {
    --at-apply: "flex-shrink-0";
  }

  &__title {
    --at-apply: "flex-1 truncate";
  }

  &__arrow {
    --at-apply: "text-small-color flex-shrink-0";
  }
}
</style>
