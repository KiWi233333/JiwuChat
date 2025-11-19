<script lang="ts" setup>
/**
 * 撤回消息
 */
const { data } = defineProps<{
  data: ChatMessageVO<RecallBodyDTO>;
  prevMsg?: Partial<ChatMessageVO<TextBodyMsgVO>>
}>();
const roomId = data.message?.roomId;
const chat = useChatStore();
const enoughEditMsgInfo = computed(() => chat.recallMsgMap[roomId] && chat.recallMsgMap[roomId].message.id === data.message.id ? chat.recallMsgMap[roomId] : undefined);

// 重新编辑消息
function editRecallMsg() {
  if (!enoughEditMsgInfo.value) {
    return;
  }
  if (enoughEditMsgInfo.value.message.type !== MessageType.TEXT || !enoughEditMsgInfo.value.message.content) {
    ElMessage.warning("非文字部分暂不支持重新编辑！");
    return;
  }

  // 设置编辑消息
  mitter.emit(MittEventType.MSG_FORM, {
    type: "update",
    payload: {
      roomId: enoughEditMsgInfo.value.message.roomId,
      msgType: MessageType.TEXT, // TODO: 暂时只支持文字消息
      content: enoughEditMsgInfo.value.message.content || "",
      body: {
      // ...enoughEditMsgInfo.message.body,
      },
    },
  });
  // 聚焦
  nextTick(() => mitter.emit(MittEventType.MSG_FORM, { type: "focus", payload: null }));
}
</script>

<template>
  <span class="recall block max-w-full max-w-full w-full truncate px-4 py-2 text-center text-wrap text-mini-50 font-500">
    {{ data?.message?.content }}
    <span v-if="enoughEditMsgInfo" class="edit ml-1 btn-info el-color-info" title="只能重新编辑文字消息" @click="editRecallMsg()">重新编辑</span>
  </span>
</template>

<style lang="scss" scoped>
</style>
