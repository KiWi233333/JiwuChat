<script lang="ts" setup>
import { ChatMsgAiAskMsg, ChatMsgAiReplyMsg, ChatMsgDelete, ChatMsgFile, ChatMsgImg, ChatMsgNotice, ChatMsgOther, ChatMsgRecall, ChatMsgRTC, ChatMsgSound, ChatMsgSystem, ChatMsgText, ChatMsgVideo } from "#components";
import { MessageType } from "@/composables/api/chat/message";
import { onMsgContextMenu } from ".";


/**
 * 消息适配器
 */
const { data, prevMsg, index } = defineProps<{
  data: ChatMessageVO
  prevMsg?: Partial<ChatMessageVO>
  index: number
  id?: string
}>();
const map: MsgComType = {
  [MessageType.TEXT]: ChatMsgText,
  [MessageType.RECALL]: ChatMsgRecall,
  [MessageType.DELETE]: ChatMsgDelete,
  [MessageType.IMG]: ChatMsgImg,
  [MessageType.VIDEO]: ChatMsgVideo,
  [MessageType.FILE]: ChatMsgFile,
  [MessageType.SYSTEM]: ChatMsgSystem,
  [MessageType.AI_CHAT]: ChatMsgAiAskMsg,
  [MessageType.SOUND]: ChatMsgSound,
  [MessageType.RTC]: ChatMsgRTC,
  [MessageType.AI_CHAT_REPLY]: ChatMsgAiReplyMsg,
  [MessageType.GROUP_NOTICE]: ChatMsgNotice, // 群通知消息
};
interface MsgComType {
  [property: number]: any
}
const msgRef = ref<InstanceType<typeof ChatMsgFile | typeof ChatMsgImg | typeof ChatMsgText | typeof ChatMsgVideo | typeof ChatMsgRecall | typeof ChatMsgDelete | typeof ChatMsgSystem | typeof ChatMsgSound | typeof ChatMsgRTC | typeof ChatMsgAiAskMsg | typeof ChatMsgOther | null>>();
const chat = useChatStore();

// 右键菜单
const showTranslation = ref(false);
// 是否显示时间
const showTime = prevMsg?.message?.sendTime && (data.message.sendTime - prevMsg?.message?.sendTime) > 300000; // 5分钟外显示时间

// 点击头像
function onClickAvatar() {
  if (!data.fromUser.userId)
    return;
  chat.setTheFriendOpt(FriendOptType.User, {
    id: data.fromUser.userId,
  });
  nextTick(() => {
    navigateTo({
      path: "/friend",
      query: {
        dis: 1,
      },
    });
  });
}

const conponentName = computed(() => map[data.message?.type || MessageType.TEXT] || ChatMsgOther);
</script>

<template>
  <p v-if="showTime" v-once :key="`${index}_time`" w-full py-2 text-center text-0.8em op-60>
    {{ formatFriendlyDate(new Date(data.message.sendTime)) }}
  </p>
  <component
    :is="conponentName"
    :id="id"
    ref="msgRef"
    :show-translation="showTranslation"
    :prev-msg="prevMsg"
    :index="index"
    :data="data"
    v-bind="$attrs"
    @click-avatar="onClickAvatar"
    @contextmenu="onMsgContextMenu($event, data, msgRef.onDownloadFileAndOpen)"
  />
</template>

<style lang="scss" scoped>
@use './msg.scss';
</style>
