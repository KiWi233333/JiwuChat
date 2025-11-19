<script lang="ts" setup>
const {
  status,
  showText = true,
  dotClass = "block w-0.8em h-0.8em rounded-1/2",
  textCalss = "ml-1",
} = defineProps<{
  status?: WsStatusEnum
  showText?: boolean
  textCalss?: string
  dotClass?: string
}>();

const statusMap: Record<WsStatusEnum, { text: string, color: string, icon?: string }> = {
  [WsStatusEnum.CONNECTION]: {
    text: "连接中",
    color: "bg-gray-500",
    icon: "i-solar:menu-dots-outline",
  },
  [WsStatusEnum.OPEN]: {
    text: "在线",
    color: "bg-theme-info",
  },
  [WsStatusEnum.SAFE_CLOSE]: {
    text: "离线",
    color: "bg-theme-danger",
  },
  [WsStatusEnum.CLOSE]: {
    text: "离线",
    color: "bg-theme-danger",
  },
};
const statusText = computed(() => status !== undefined ? statusMap[status]?.text : "未知");
</script>

<template>
  <div flex items-center>
    <span
      :class="[status !== undefined ? statusMap?.[status]?.color : '', dotClass]"
    />
    <span v-if="showText" :class="textCalss">{{ statusText }}</span>
  </div>
</template>

<style scoped lang="scss">
</style>
