<script lang="ts" setup>
/**
 * 文本消息
 */
defineProps<{
  data: ChatMessageVO<TextBodyMsgVO>
  prevMsg: Partial<ChatMessageVO<TextBodyMsgVO>>
  index: number
}>();
</script>

<template>
  <ChatMsgTemplate
    :prev-msg="prevMsg"
    :index="index"
    :data="data"
    v-bind="$attrs"
  />
</template>

<style lang="scss" scoped>
@use "./msg.scss";
</style>
