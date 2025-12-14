<script setup lang="ts">
defineProps<{
  message: string
  subMessage: string
  type?: "error" | "expired"
}>();

defineEmits<{
  (e: "retry"): void
  (e: "back"): void
}>();
</script>

<template>
  <div class="oauth-status-card flex-row-c-c flex-col px-8 py-10 text-center">
    <!-- 图标区域 -->
    <div class="status-icon mb-5">
      <i
        class="block h-18 w-18"
        :class="type === 'expired' ? 'i-solar:clock-circle-bold text-theme-warning' : 'i-solar:danger-triangle-bold text-theme-danger'"
      />
    </div>

    <!-- 文字信息 -->
    <h2 class="mb-2 text-lg text-color font-bold">
      {{ message }}
    </h2>
    <p class="mb-8 px-2 text-mini leading-relaxed">
      {{ subMessage }}
    </p>

    <!-- 操作按钮 -->
    <div class="w-full flex-row-c-c gap-3">
      <el-button
        type="danger"
        text
        size="small"
        bg
        @click="$emit('retry')"
      >
        重新授权
      </el-button>
      <el-button
        text
        bg
        size="small"
        @click="$emit('back')"
      >
        返回登录
      </el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
</style>

