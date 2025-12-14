<script setup lang="ts">
defineProps<{
  message: string
  subMessage: string
  countdown: number
}>();
</script>

<template>
  <div class="flex-row-c-c flex-col px-8 py-10 text-center">
    <div class="mb-6 h-20 w-20 flex-row-c-c rounded-full bg-theme-success">
      <i class="i-tabler:check h-10 w-10 text-light" />
    </div>

    <h2 class="mb-2 text-2xl text-color font-bold">
      {{ message }}
    </h2>
    <p class="mb-8 text-sm text-theme-success text-op-80">
      {{ subMessage }}
    </p>

    <div :class="{ 'op-0': !countdown }" class="flex-row-c-c gap-2 text-small text-xs transition-200">
      <i class="i-svg-spinners:ring-resize" />
      <span>{{ countdown }}秒后自动跳转</span>
    </div>
  </div>
</template>

