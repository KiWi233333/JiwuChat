<script lang="ts" setup>
/**
 * 文本消息
 */
const {
  data,
  showTranslation = false,
} = defineProps<{
  data: ChatMessageVO<SoundBodyMsgVO>
  prevMsg: Partial<ChatMessageVO<TextBodyMsgVO>>
  index: number
  showTranslation?: boolean
}>();

const chat = useChatStore();
// 具体
const body: Partial<SoundBodyMsgVO> = data.message.body || {};
const theSecond = ref(body.second);
const getSoundText = computed(() => {
  if (!theSecond.value)
    return "0\"";
  if (theSecond.value <= 60)
    return `${theSecond.value % 60}"`;
  else if (theSecond.value <= 3600)
    return `${Math.floor(theSecond.value / 60)}'${theSecond.value % 60}"`;
});

const getSoundTextRaw = computed(() => {
  if (!body.second)
    return "0\"";
  if (body.second <= 60)
    return `${body.second % 60}"`;
  else if (body.second <= 3600)
    return `${Math.floor(body.second / 60)}'${body.second % 60}"`;
});

// 点击播放音频
function playSound(newUrl?: string) {
  if (chat.playSounder?.url === newUrl && chat.playSounder?.state === "play") {
    chat.playSounder?.audio?.pause();
    chat.playSounder.state = "pause";
    chat.playSounder.currentSecond = 0;
    return;
  }
  if (chat.playSounder?.url !== newUrl)
    resetPlaySounder();

  const audio = new Audio(BaseUrlSound + newUrl);
  audio.play();
  chat.playSounder = {
    url: newUrl,
    state: "loading",
    currentSecond: 0,
    duration: body?.second || 0,
    audio,
  };
  theSecond.value = 0;
  audio.addEventListener("timeupdate", onTimeupdate);
  audio.addEventListener("ended", resetPlaySounder);
  audio.addEventListener("loadeddata", onLoadeddata);
  audio.addEventListener("pause", resetPlaySounder);
}
function onLoadeddata() {
  chat.playSounder.state = "play";
}
function onTimeupdate() {
  if (chat.playSounder?.state === "play") {
    const currentSecond = Math.floor(chat.playSounder.audio?.currentTime || 0);
    if (currentSecond !== chat.playSounder?.currentSecond) {
      chat.playSounder.currentSecond = currentSecond;
      theSecond.value = currentSecond;
    }
  }
}
// 重置播放器
function resetPlaySounder() {
  if (chat.playSounder) {
    chat.playSounder.audio?.pause();
    if (chat.playSounder.audio) {
      chat.playSounder.audio.src = "";
      chat.playSounder.audio.removeEventListener("timeupdate", onTimeupdate);
      chat.playSounder.audio.removeEventListener("ended", resetPlaySounder);
      chat.playSounder.audio.removeEventListener("loadeddata", onLoadeddata);
      chat.playSounder.audio.removeEventListener("pause", resetPlaySounder);
    }
    chat.playSounder.state = "stop";
    chat.playSounder.currentSecond = 0;
    chat.playSounder.audio = undefined;
    chat.playSounder.url = "";
  }
  theSecond.value = body?.second || 0;
}
</script>

<template>
  <ChatMsgTemplate
    :prev-msg="prevMsg"
    :index="index"
    :data="data"
    v-bind="$attrs"
  >
    <template #body>
      <div
        ctx-name="sound"
        class="msg-popper min-w-6em cursor-pointer hover:op-80"
        :class="{ 'animate-pulse': chat.playSounder?.url === body?.url && chat.playSounder?.state === 'play' }"
      >
        <p ctx-name="sound" class="flex items-center" @click="playSound(body?.url)">
          <i class="pointer-events-none inline-block h-4 w-4" :class="chat.playSounder?.url === body.url && chat.playSounder?.state === 'loading' ? 'i-solar:menu-dots-bold-duotone' : 'i-solar:volume-loud-outline'" />
          <span class="pointer-events-none mx-1">{{ chat.playSounder?.url === body.url ? getSoundText : getSoundTextRaw }}</span>
        </p>
        <small v-if="body?.translation && showTranslation" pointer-events-none ctx-name="sound-translation" class="mt-2 block border-t-(1px #8585828e solid) pt-1.5">
          {{ body?.translation }}
        </small>
      </div>
    </template>
  </ChatMsgTemplate>
</template>

<style lang="scss" scoped>
@use "./msg.scss";
</style>
