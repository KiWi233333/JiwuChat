<script lang="ts" setup>
/**
 * 折叠消息
 */
defineProps<{
  modelValue?: string
}>();
const emit = defineEmits<{
  (e: "toggle", value: boolean): void
}>();
</script>


<template>
  <div class="max-w-full flex truncate !items-center">
    <p class="msg-poper flex-1 truncate">
      {{ (modelValue || '').slice(0, 50) }}
    </p>
    <span class="mx-2 flex-shrink-0 btn-info text-mini" @click="emit('toggle', false)">展开
      <i i-solar:alt-arrow-down-line-duotone p-2 />
    </span>
  </div>
</template>

<style lang="scss" scoped>
.text {
  --at-apply: "flex items-center";
}
</style>
