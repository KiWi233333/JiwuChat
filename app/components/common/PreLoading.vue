<script lang="ts" setup>
withDefaults(defineProps<{
  message?: string
  icon?: string
}>(), {
  message: "加载中...",
  icon: "i-tabler:loader animate-spin animate-duration-2000 op-40",
});
</script>

<template>
  <div
    flex-row-c-c flex-col gap-4
  >
    <span class="h-1.8rem w-1.8rem" :class="icon" />
    {{ message }}
  </div>
</template>

<style scoped lang="scss"></style>
