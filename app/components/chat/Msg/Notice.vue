<script lang="ts" setup>
import { MSG_CTX_NAMES } from "~/constants/msgContext";

/**
 * 系统消息
 */
defineProps<{
  data: ChatMessageVO<GroupNoticeBodyMsgVO>
  prevMsg: Partial<ChatMessageVO>
  index: number
}>();
</script>

<template>
  <ChatMsgTemplate
    :prev-msg="prevMsg"
    :index="index"
    :data="data"
    v-bind="$attrs"
  >
    <template #body>
      <div class="group msg-box notice text-left text-0.9rem" :ctx-name="MSG_CTX_NAMES.CONTENT">
        <div :ctx-name="MSG_CTX_NAMES.CONTENT" mb-2 border-default-b pb-2 text-left text-small dark:text-gray-300>
          <i :ctx-name="MSG_CTX_NAMES.CONTENT" class="i-carbon:bullhorn mr-1 p-2 text-[--el-color-warning] font-500 group-hover:animate-pulse" /> 群通知
        </div>
        <div :ctx-name="MSG_CTX_NAMES.CONTENT" class="msg-wrap max-w-20em min-w-14em text-color leading-1.6em">
          {{ data?.message?.content }}
        </div>
      </div>
      <small
        v-if="data?.message?.body?.noticeAll"
        :ctx-name="MSG_CTX_NAMES.MENTION_LIST"
        class="flex-ml-a notice-all"
      >
        @所有人
      </small>
    </template>
  </ChatMsgTemplate>
</template>

<style lang="scss" scoped>
@use "./msg.scss";
</style>
