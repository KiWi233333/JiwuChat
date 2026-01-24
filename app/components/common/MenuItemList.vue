<script lang="ts">
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
</script>

<script setup lang="ts">
const { items, variant = "card", showArrow = true, size = "medium" } = defineProps<{
  items: MenuItemConfig[]
  variant?: "card" | "list"
  showArrow?: boolean
  size?: "small" | "medium" | "large"
}>();
</script>

<template>
  <div class="menu-item-list" :class="`menu-item-list--${variant}`">
    <CommonMenuItemCard
      v-for="(item, index) in items"
      :key="index"
      :item="item"
      :variant="variant"
      :show-arrow="showArrow"
      :size="size"
    />
  </div>
</template>

<style scoped lang="scss">
.menu-item-list {
  display: flex;
  flex-direction: column;

  &--card {
    gap: 0.5rem;
  }

  &--list {
    gap: 0;
  }
}
</style>
