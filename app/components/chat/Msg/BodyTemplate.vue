<script setup lang="ts">
import { useRenderMsg } from ".";

const {
  data,
} = defineProps<{
  data: ChatMessageVO<any>;
}>();
// 渲染消息
const { renderMessageContent } = useRenderMsg(data);
</script>

<template>
  <p v-if="data.message.content" class="msg-popper msg-wrap whitespace-pre-wrap break-words" v-bind="$attrs">
    <component :is="renderMessageContent" />
  </p>
</template>
