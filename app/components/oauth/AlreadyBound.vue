<script setup lang="ts">
defineProps<{
  message: string
  subMessage: string
}>();

defineEmits<{
  (e: "back"): void
  (e: "login"): void
}>();
</script>

<template>
  <div class="flex-row-c-c flex-col px-8 py-10 text-center">
    <div class="relative mb-6 h-20 w-20">
      <div class="h-20 w-20 flex-row-c-c rounded-full bg-theme-warning bg-op-10">
        <i class="i-solar:shield-warning-bold h-10 w-10 text-theme-warning" />
      </div>
      <div class="absolute h-8 w-8 flex-row-c-c border border-default rounded-full bg-color shadow-sm -bottom-1 -right-1">
        <i class="i-solar:link-bold text-sm text-small" />
      </div>
    </div>

    <h2 class="mb-2 text-lg text-color font-bold">
      {{ message }}
    </h2>
    <p class="mb-6 px-2 text-small">
      {{ subMessage }}
    </p>

    <div class="w-full flex flex-col gap-3">
      <button class="w-full btn-primary-bg py-2.5" @click="$emit('back')">
        返回设置页
      </button>
      <button class="mt-2 btn-default-text text-small text-xs" @click="$emit('login')">
        切换账号登录
      </button>
    </div>
  </div>
</template>

