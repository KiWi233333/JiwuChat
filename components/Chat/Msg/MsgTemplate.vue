<script lang="ts" setup>
import { useRenderMsg } from ".";

// import { dayjs } from "element-plus";

/**
 * 消息模板（默认文本）
 * ctx-name 用于右键菜单
 */
const { data } = defineProps<{
  data: ChatMessageVO<TextBodyMsgVO | ImgBodyMsgVO | RtcBodyMsgVO | GroupNoticeBodyMsgVO>;
  prevMsg?: Partial<ChatMessageVO<TextBodyMsgVO>>
  index: number
}>();
const emit = defineEmits(["clickAvatar"]);

const chat = useChatStore();
const user = useUserStore();
// 具体
interface TextBodyVO extends TextBodyMsgVO {
  _textTranslation?: Partial<TranslationVO>;
}
const msgId = computed(() => data.message?.id as number | undefined);
const body = computed(() => data.message?.body as Partial<TextBodyVO> | undefined);
const isSelf = user?.userInfo?.id && data?.fromUser?.userId === user?.userInfo?.id;

// 状态计算只在需要时进行
const sendStatus = computed(() => {
  if (typeof data.message.id === "string") {
    return chat.getMsgQueue(data.message.id as any)?.status;
  }
  return undefined;
});

// 计算是否需要显示回复
const showReply = computed(() => !!body.value?.reply);

const urlContentMap = body.value?.urlContentMap;
// 计算是否需要显示@提醒
const mentionList = body.value?.mentionList || [];
const showMentionMe = computed(() => !!mentionList.find(item => item.uid === user.userInfo?.id));

// 计算是否需要显示翻译
const showTranslation = computed(() => !!body.value?._textTranslation);

// 渲染消息
const { renderMessageContent } = useRenderMsg(data);
</script>

<template>
  <div class="msg" :class="{ self: isSelf }" v-bind="$attrs">
    <!-- 头像 -->
    <CardElImage
      ctx-name="avatar"
      error-class="i-solar:user-bold-duotone"
      load-class=" "
      :src="BaseUrlImg + data.fromUser.avatar"
      fit="cover"
      class="avatar h-2.4rem w-2.4rem flex-shrink-0 cursor-pointer border-default rounded-1/2 object-cover"
      @click="$emit('clickAvatar', data.fromUser.userId)"
    />
    <!-- 消息体 -->
    <div class="body">
      <!-- 昵称和插槽区域 -->
      <div class="flex-res">
        <small class="nickname flex-1 truncate" ctx-name="nickname">{{ data.fromUser.nickName }}</small>
        <slot name="name-after" />
        <!-- 发送状态 -->
        <ChatMsgSendStatus v-if="sendStatus" :status="sendStatus" :msg-id="data.message.id" />
      </div>

      <!-- 内容 - 使用渲染函数 -->
      <slot name="body-pre" :send-status="sendStatus" />
      <slot name="body" :send-status="sendStatus">
        <p v-if="data.message?.content" class="msg-popper msg-wrap whitespace-pre-wrap break-words" ctx-name="content">
          <component :is="renderMessageContent" />
        </p>
      </slot>

      <!-- 回复 -->
      <small
        v-if="showReply"
        title="点击跳转"
        ctx-name="reply"
        class="reply"
        @click="chat.scrollReplyMsg(body?.reply?.id || 0, body?.reply?.gapCount, false)"
      >
        <i class="reply-icon i-solar:forward-2-bold-duotone mr-1 p-2" />
        {{ `${body?.reply?.nickName} : ${body?.reply?.body?.substring(0, 50) || ''}` }}
      </small>

      <!-- URL -->
      <ChatUrlInfo
        v-for="(urlInfo, key) in urlContentMap"
        :key="key"
        ctx-name="urlContentMap"
        :url="String(key)"
        :data="urlInfo"
        class="url-info max-w-full w-14rem rounded-2 bg-color-br p-3 shadow-sm transition-200 sm:(max-w-16rem min-w-12rem) hover:(shadow)"
      />
      <!-- AT -->
      <small
        v-if="showMentionMe"
        ctx-name="mentionList"
        class="at-list flex-ml-a"
      >
        有人@我
      </small>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use './msg.scss';
</style>
