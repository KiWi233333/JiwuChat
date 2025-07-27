<script lang="ts" setup>
/**
 * 其他未适配消息
 */
const { data } = defineProps<{
  data: ChatMessageVO<TextBodyMsgVO | ImgBodyMsgVO>
  prevMsg: Partial<ChatMessageVO<TextBodyMsgVO>>
  index: number
}>();
</script>

<template>
  <ChatMsgTemplate :data="data" :prev-msg="prevMsg" :index="index">
    <template #body>
      <!-- 内容 -->
      <p class="msg-popper msg-wrap">
        {{ data.message.content }}
      </p>
      <span class="border-default-hover card-default rounded-2rem px-2 py-1 text-xs">
        未适配该消息，请升级客户端查看
      </span>
    </template>
  </ChatMsgTemplate>
</template>

<style lang="scss" scoped>
@use './msg.scss';
</style>
