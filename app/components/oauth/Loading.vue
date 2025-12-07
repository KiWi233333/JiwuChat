<script setup lang="ts">
defineProps<{
  message: string
  subMessage: string
  icon: string
}>();

defineEmits<{
  (e: "cancel"): void
}>();
</script>

<template>
  <div class="oauth-loading-card flex-row-c-c flex-col px-8 py-10 text-center">
    <!-- 加载图标 -->
    <div class="status-icon relative mb-8">
      <div class="loading-ring" />
      <div class="loading-ring-active" />
      <CardElImage error-root-class="hidden" :src="icon" alt="icon" class="relative z-10 h-20 w-20 flex-row-c-c rounded-full bg-color shadow-sm filter-drop-shadow" />
    </div>

    <!-- 文字信息 -->
    <h2 class="mb-2 text-lg text-color font-bold">
      {{ message }}
    </h2>
    <p class="mb-6 px-4 text-small leading-relaxed">
      {{ subMessage }}
    </p>

    <!-- 加载指示器 -->
    <div class="mb-6 flex-row-c-c gap-2 text-small">
      <img src="/images/icon/loaded-ball.svg" alt="loading" class="h-6 w-6">
    </div>

    <!-- 取消按钮 -->
    <el-button
      text
      bg
      size="small"
      class="cancel-btn"
      @click="$emit('cancel')"
    >
      取消操作
    </el-button>
  </div>
</template>

<style scoped lang="scss">
.oauth-loading-card {
  .status-icon {
    width: 5rem;
    height: 5rem;
  }

  .loading-ring,
  .loading-ring-active {
    --at-apply: "absolute inset-0 w-full h-full rounded-full border-4 border-theme-primary";
  }

  .loading-ring {
    --at-apply: "border-op-20";
  }

  .loading-ring-active {
    --at-apply: "animate-spin border-t-transparent";
  }

  .cancel-btn {
    --at-apply: "text-small op-60 hover:op-100";
  }
}
</style>

