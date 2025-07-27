<script setup lang="ts">
import { appKeywords, appName } from "@/constants/index";
import { WsStatusEnum } from "~/types/chat/WsType";

useSeoMeta({
  title: `极物AI - ${appName}`,
  description: `${appName} - 极物聊天 开启你的极物之旅！`,
  keywords: appKeywords,
});
definePageMeta({
  key: route => route.fullPath,
});
const setting = useSettingStore();
const user = useUserStore();

const INIT_MSG = {
  fromUser: {
    userId: "1739333818150862850",
    avatar: "image/2023-12-27/1653240351484801026/fab3eab2-e721-4e82-a98f-0bdbdb6e0068",
    gender: Gender.DEFAULT,
    nickName: "极物AI客服",
  },
  message: {
    id: 1,
    roomId: 0,
    sendTime: Date.now(),
    content: "你好！欢迎光临极物聊天，有什么可以帮您的吗？",
    type: MessageType.AI_CHAT,
    body: {},
  },
};

const scollRef = useTemplateRef("scollRef");
const formRef = useTemplateRef("formRef");
const inputRef = useTemplateRef("inputRef");
const msgList = useLocalStorage<ChatMessageVO[]>(`ai_chat_history_${user.userInfo.id}`, []);
const status = ref<WsStatusEnum>(WsStatusEnum.CLOSE);
const isChat = computed(() => status.value === WsStatusEnum.OPEN);
const form = ref({
  role: "user",
  content: "",
});

const body = ref({
  ws: null as WebSocket | null,
});

const dto = ref({
  header: {
    app_id: XUN_FEI_APP_ID,
    uid: user.userInfo.id,
  },
  parameter: {
    chat: {
      domain: "general",
      temperature: 0.8,
      top_k: 4,
      max_tokens: 2048,
    },
  },
  payload: {
    message: {
      text: [{
        role: "user",
        content: "",
      }],
    },
  },
});

// Buffer and rendering control
const textBuffer = ref<string[]>([]);
const currentMessageId = ref<number | null>(null);
let renderInterval: NodeJS.Timeout | null = null;

const COUNT = 2;
function startRendering() {
  if (renderInterval)
    return;

  renderInterval = setInterval(() => {
    if (textBuffer.value.length > 0 && currentMessageId.value) {
      const msg = msgList.value.find(p => p.message.id === currentMessageId.value);
      if (msg && textBuffer.value?.[0]) {
        const chunk = textBuffer.value[0].slice(0, COUNT);
        msg.message.content += chunk;
        textBuffer.value[0] = textBuffer.value[0].slice(COUNT);
        if (textBuffer.value[0].length === 0) {
          textBuffer.value.shift();
        }
        scrollBottom();
      }
    }
  }, 20);
}

function stopRendering() {
  if (renderInterval) {
    clearInterval(renderInterval);
    renderInterval = null;
  }
}

function onSubmit() {
  if (status.value === WsStatusEnum.OPEN || !form.value.content || form.value.content.length < 1 || isChat.value)
    return;

  formRef.value?.validate((action: boolean) => {
    if (!action)
      return;
    sendMsg(form.value.content, user.userInfo.id);
    form.value.content = "";
  });
}

function onStop() {
  if (status.value === WsStatusEnum.OPEN)
    return;
  body.value.ws?.close();
  scrollBottom();
  status.value = WsStatusEnum.SAFE_CLOSE;
}

function sendMsg(msg: string, id: string) {
  if (body.value.ws && body.value.ws.OPEN === 1)
    return;

  textBuffer.value = [];
  body.value.ws = new WebSocket(XUN_FEI_WSS_URL);

  body.value.ws.onopen = async (e) => {
    status.value = WsStatusEnum.OPEN;
    if (dto?.value?.payload?.message?.text?.[0])
      dto.value.payload.message.text[0].content = msg;
    dto.value.header.uid = id;
    body.value.ws?.send(JSON.stringify(dto.value));
    await nextTick();
    scrollBottom();
  };

  body.value.ws.onclose = async () => {
    stopRendering();
    // Update with full text if buffer remains
    if (currentMessageId.value && textBuffer.value.length > 0) {
      const msg = msgList.value.find(p => p.message.id === currentMessageId.value);
      if (msg) {
        msg.message.content += textBuffer.value.join("");
        textBuffer.value = [];
      }
    }
    setTimeout(() => {
      status.value = WsStatusEnum.SAFE_CLOSE;
    }, 300);
    body.value.ws = null;
    currentMessageId.value = null;
    await nextTick();
    scrollBottom();
    inputRef.value?.focus();
  };

  body.value.ws.onerror = () => {
    stopRendering();
    body.value.ws = null;
    setTimeout(async () => {
      status.value = WsStatusEnum.CLOSE;
      await nextTick();
      scrollBottom();
      inputRef.value?.focus();
    }, 300);
  };

  body.value.ws.onmessage = (e) => {
    if (e.data) {
      const data = JSON.parse(e.data);
      status.value = WsStatusEnum.OPEN;
      const text = data?.payload?.choices?.text || [];
      let newContent = "";
      text.forEach((p: any) => {
        if (p && p.role === "assistant")
          newContent += p.content;
      });

      if (newContent) {
        textBuffer.value.push(newContent);
        const sid = data.header.sid;

        if (!currentMessageId.value || currentMessageId.value !== sid) {
          currentMessageId.value = sid;
          const existingMsg = msgList.value.find(p => p.message.id === sid);
          if (!existingMsg) {
            msgList.value.push({
              fromUser: {
                userId: "1739333818150862850",
                avatar: "image/2023-12-27/1653240351484801026/fab3eab2-e721-4e82-a98f-0bdbdb6e0068",
                gender: Gender.DEFAULT,
                nickName: "极物AI客服",
              },
              message: {
                id: sid,
                roomId: 0,
                sendTime: Date.now(),
                content: "",
                type: MessageType.AI_CHAT,
                body: {},
              },
            });
          }
          startRendering();
        }
      }
      scrollBottom();
    }
  };

  msgList.value.push({
    fromUser: {
      userId: user.userInfo.id,
      avatar: user.userInfo.avatar,
      gender: user.userInfo.gender,
      nickName: user.userInfo.nickname,
    },
    message: {
      id: Date.now(),
      roomId: 0,
      sendTime: Date.now(),
      content: msg,
      type: MessageType.TEXT,
      body: {},
    },
  });
}

function scrollBottom(animate = true) {
  if (!scollRef.value?.wrapRef?.scrollTo) {
    return;
  }
  if (animate) {
    scollRef.value?.wrapRef?.scrollTo({
      top: scollRef?.value?.wrapRef?.scrollHeight + 20 || 0,
      behavior: "smooth",
    });
  }
  else {
    scollRef.value?.setScrollTop(scollRef?.value?.wrapRef?.scrollHeight + 20 || 0);
  }
}

function handleNewChat() {
  if (isChat.value)
    return ElMessage.warning("正在聊天中，请先结束当前对话！");

  body.value.ws?.close();
  body.value.ws = null;
  status.value = WsStatusEnum.CLOSE;
  msgList.value = [INIT_MSG];
  textBuffer.value = [];
  stopRendering();
  nextTick(() => {
    scrollBottom(false);
  });
}

function active() {
  if (!setting.isMobileSize)
    inputRef.value?.focus();

  if (msgList.value.length === 0)
    msgList.value.push(INIT_MSG);

  nextTick(() => {
    scrollBottom(false);
  });
}

onMounted(() => active());
onActivated(() => active());
onBeforeUnmount(() => {
  if (status.value === WsStatusEnum.OPEN)
    onStop();
});
onDeactivated(() => {
  if (status.value === WsStatusEnum.OPEN)
    onStop();
});
</script>

<template>
  <div class="h-full w-full flex flex-1 flex-col sm:(px-4 pb-4)">
    <!-- header -->
    <p class="nav-padding-top-6 my-4 pl-4 text-[var(--el-color-primary)] font-600 tracking-0.2em sm:pl-0">
      <i class="i-solar:ghost-bold mr-2 p-0.8em" />
      极物AI
      <!-- <span float-right mr-3 rounded bg-theme-primary px-2 py-1 text-0.65rem text-light>AI生成内容，仅供参考！</span> -->
    </p>
    <!-- 内容 -->
    <el-scrollbar ref="scollRef" wrap-class="shadow-sm shadow-inset" view-class="shadow-sm shadow-inset h-full  p-2 md:p-4" class="relative bg-color-2 sm:card-rounded-df">
      <!-- 消息适配器 -->
      <div class="pb-24">
        <ChatAIJiwuMsg
          v-for="(msg, i) in msgList" :id="`chat-msg-${msg.message.id}`"
          :key="msg.message.id"
          :index="i"
          :data="msg"
          :prev-msg="i > 0 ? msgList[i - 1] : undefined"
        >
          <template #actions>
            <svg v-if="isChat && i === msgList.length - 1" class="absolute bottom-0.75em right-0.75em h-1.2em w-1.2em animate-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" fill-rule="evenodd"><path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" /><path fill="currentColor" d="M12 4.5a7.5 7.5 0 1 0 0 15a7.5 7.5 0 0 0 0-15M1.5 12C1.5 6.201 6.201 1.5 12 1.5S22.5 6.201 22.5 12S17.799 22.5 12 22.5S1.5 17.799 1.5 12" opacity=".1" /><path fill="currentColor" d="M12 4.5a7.46 7.46 0 0 0-5.187 2.083a1.5 1.5 0 0 1-2.075-2.166A10.46 10.46 0 0 1 12 1.5a1.5 1.5 0 0 1 0 3" /></g></svg>
          </template>
        </ChatAIJiwuMsg>
      </div>
      <div class="form">
        <el-form
          ref="formRef"
          class="form-wrapper"
          :model="form"
          @submit.prevent="onSubmit"
        >
          <div class="group relative h-2rem w-2rem shrink-0">
            <CardElImage
              :src="user.userInfo.avatar ? BaseUrlImg + user.userInfo.avatar : ''"
              class="h-full w-full cursor-pointer rounded-1/2 shadow"
            />
            <div
              class="absolute-center-center h-full w-full flex-row-c-c btn-primary-text border-default-hover rounded-full bg-color-br op-0 transition-opacity group-hover:op-100"
              @click="handleNewChat"
            >
              <el-tooltip content="新对话" placement="top">
                <i i-carbon:add p-3 />
              </el-tooltip>
            </div>
          </div>
          <el-form-item
            prop="content" class="w-full" :rules="[{
              required: true,
              message: '',
              trigger: 'change',
            }]"
            style="margin: 0;padding: 0;"
          >
            <el-input
              ref="inputRef"
              v-model.lazy="form.content"
              type="textarea"
              :row="1"
              :maxlength="2048"
              :minlength="1"
              resize="none"
              :autosize="true"
              style="max-height: 16em;"
              :disabled="isChat" placeholder="快开始对话吧 ✨"
              class="content card-rounded-df"
              @keydown.enter.prevent="onSubmit"
            />
          </el-form-item>
          <BtnElButton
            class="group ml-a"
            style="height: 2rem !important;"
            :class="isChat ? 'animate-pulse' : ''"
            :icon-class="`hidden sm:block mr-1 ${isChat ? 'i-solar:menu-dots-bold-duotone ' : 'i-solar:map-arrow-right-bold-duotone'}`"
            :type="isChat ? 'danger' : 'info'"
            @click="isChat ? onStop() : onSubmit()"
          >
            {{ isChat ? "结束" : "发送" }}
          </BtnElButton>
        </el-form>
      </div>
    </el-scrollbar>
  </div>
</template>

<style lang="scss" scoped>
.form {
  --at-apply: "absolute bottom-0 w-full left-0 sm:p-4 ";
  .form-wrapper {
    --at-apply: "flex border-default-t sm:(border-default shadow-sm card-rounded-df) items-end gap-2 p-4  sm:gap-4 bg-color-br ";
  }
  :deep(.content.el-textarea) {
    .el-textarea__inner {
      box-shadow: none !important;
      outline: none !important;
      min-height: 2rem;
      border-radius: inherit;
      max-height: 10em;
      --at-apply: "bg-color-2";
    }
  }
}
</style>
