<script setup lang="ts">
import { MessageContent } from ".";

const {
  data,
} = defineProps<{
  data: ChatMessageVO<any>;
}>();
</script>

<template>
  <p v-if="data.message.content?.trim?.()" class="msg-box msg-wrap whitespace-pre-wrap break-words" v-bind="$attrs">
    <MessageContent :msg="data" />
  </p>
</template>
