<script setup lang="ts">
import type { MenuItemConfig } from "~/components/common/MenuItemCard.vue";

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
