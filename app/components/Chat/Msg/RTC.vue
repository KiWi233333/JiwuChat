<script lang="ts" setup>
/**
 * RTC消息
 */
defineProps<{
  data: ChatMessageVO<RtcBodyMsgVO>
  prevMsg?: ChatMessageVO
  index: number
}>();
const chat = useChatStore();
</script>


<template>
  <ChatMsgTemplate
    :prev-msg="prevMsg"
    :index="index"
    :data="data"
    v-bind="$attrs"
  >
    <template #body>
      <div ctx-name="rtc" class="msg-popper msg-wrap min-w-6em flex cursor-pointer items-center leading-1em hover:op-80" @click="data.message.body?.type && chat.rollbackCall(data.message.roomId, data.message.body?.type, data)">
        <i ctx-name="rtc" class="icon p-2.4" :class="data.message.body?.type === CallTypeEnum.AUDIO ? 'i-solar:end-call-outline' : 'i-solar:videocamera-record-outline'" />
        {{ data.message.content }}
      </div>
    </template>
  </ChatMsgTemplate>
</template>

<style lang="scss" scoped>
@use './msg.scss';

.icon {
  margin: 0 0.2em 0.1em 0;
}
.self {
  .msg-popper {

    .icon {
      order: 1;
      margin: 0 0 0.1em 0.4em;
    }
  }
}
</style>
