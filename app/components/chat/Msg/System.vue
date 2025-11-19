<script lang="ts" setup>
/**
 * 系统消息
 */
const { data } = defineProps<{
  data: ChatMessageVO<SystemBodyMsgVO>;
  prevMsg?: Partial<ChatMessageVO<TextBodyMsgVO>>
}>();
</script>

<template>
  <span class="system my-2 block max-w-full max-w-full w-full truncate px-4 text-center text-wrap text-mini-50 font-500">
    {{ data?.message?.content }}
  </span>
</template>

<style lang="scss" scoped>
</style>
