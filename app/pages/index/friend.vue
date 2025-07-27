<script lang="ts" setup>
import { appKeywords } from "@/constants/index";

useSeoMeta({
  title: "好友 - 极物聊天",
  description: "极物聊天 - 极物聊天 开启你的极物之旅！",
  keywords: appKeywords,
});
const chat = useChatStore();
const theFriendOpt = computed({
  get: () => chat.theFriendOpt,
  set: (val) => {
    chat.theFriendOpt = val;
  },
});
const { history, undo, clear } = useRefHistory(theFriendOpt, {
  deep: true,
  capacity: 10,
});
async function clearHistory() {
  chat.showTheFriendPanel = false;
  clear?.();
}
const isEmptyPanel = computed(() => chat.theFriendOpt.type !== FriendOptType.Empty);
</script>

<template>
  <div class="h-full w-full flex flex-1">
    <div
      class="w-full transition-all sm:(relative mx-auto w-320px border-default-r p-0)"
    >
      <!-- 好友列表 -->
      <ChatFriendTabs class="nav-padding-top-6 relative mx-a h-full flex-shrink-0 p-4 pb-0" />
    </div>
    <div
      class="bg z-1 h-full flex-1 flex-shrink-0 flex-col bg-color-2 sm:card-bg-color-2"
      :class="chat.showTheFriendPanel ? 'flex absolute sm:(p-0 relative) left-0 w-full' : 'hidden sm:flex'"
    >
      <template v-if="isEmptyPanel">
        <div
          class="i-solar:alt-arrow-left-line-duotone absolute right-18 top-6 z-1000 hidden btn-danger p-2.6 sm:right-14 sm:top-11 sm:block"
          title="关闭"
          @click="undo()"
        />
        <div
          class="i-carbon:close absolute right-6 top-6 z-1000 block scale-110 btn-danger p-2.6 sm:right-3 sm:top-11"
          title="关闭"
          @click="clearHistory"
        />
        <!-- 面板 -->
        <Transition
          name="page-fade"
          mode="out-in"
          appear
        >
          <ChatFriendMainType
            key="chat-friend-main-type"
            :data="chat.theFriendOpt"
            class="nav-padding-top-6 relative z-999 mx-a h-full w-full flex-1 flex-shrink-0 sm:!bg-transparent"
          />
        </Transition>
      </template>
      <div
        v-else
        key="chat-friend-empty"
        class="flex-row-c-c flex-1 flex-shrink-0 bg-color-2"
      >
        <div data-fades class="h-full w-full flex flex-col items-center justify-center text-gray-600 op-80 dark:(text-gray-300 op-50)">
          <i i-solar:users-group-two-rounded-bold-duotone class="mb-2 h-12 w-12" />
          <small>找到你想要聊天的朋友吧 ☕</small>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.main {
  height: 100%;
  width: 100%;
}

.bg {
  background-image: linear-gradient(160deg, #eaf3ff 0%, transparent, transparent, transparent, transparent, transparent, transparent);
}
.dark .bg {
  background-image: linear-gradient(160deg, #262626 0%, transparent, transparent, transparent, transparent, transparent, transparent, transparent);
}
</style>
