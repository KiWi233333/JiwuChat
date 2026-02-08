<script lang="ts" setup>
import { appKeywords } from "@/constants/index";

useSeoMeta({
  title: "好友 - 极物聊天",
  description: "极物聊天 - 极物聊天 开启你的极物之旅！",
  keywords: appKeywords,
});
const chat = useChatStore();
const setting = useSettingStore();

// 移动端：用路由模拟页面标签，返回键可关闭右侧面板
const isMobileSize = computed(() => setting.isMobileSize);

// 移动端：右侧面板使用与路由一致的滑入/滑出动画（受设置项控制）
const friendPanelTransitionName = computed(() => {
  const enabled = setting.isMobileSize && !setting.settingPage.isCloseAllTransition && setting.settingPage.animation.pageTransition;
  return enabled ? "friend-panel-slide" : "friend-panel-fade";
});

// 离开动画进行中，避免外层立即 hidden 导致滑出动画被裁掉（含浏览器返回关闭）
const isPanelLeaving = ref(false);
watch(() => chat.showTheFriendPanel, (visible) => {
  if (!visible) {
    isPanelLeaving.value = true;
  }
}, { flush: "sync" });
function onPanelAfterLeave() {
  isPanelLeaving.value = false;
}

/**
 * 关闭面板
 */
function closePanel() {
  if (setting.isMobileSize && friendPanelTransitionName.value === "friend-panel-slide") {
    isPanelLeaving.value = true;
  }
  chat.showTheFriendPanel = false;
  chat.setTheFriendOpt(FriendOptType.Empty, {});
}

/**
 * 是否为空面板
 */
const isEmptyPanel = computed(() => chat.theFriendOpt.type !== FriendOptType.Empty);

/**
 * 右侧面板是否可见
 */
const isRightColumnVisible = computed(() => chat.showTheFriendPanel || isPanelLeaving.value);

/**
 * 左侧面板样式类
 */
const leftColumnClass = computed(() => [
  isMobileSize.value ? (chat.showTheFriendPanel ? "-translate-x-30" : "") : "",
  "w-full transition-all",
  "sm:(relative mx-auto w-320px shrink-0 border-default-r p-0)",
]);

/**
 * 右侧面板样式类
 */
const rightColumnClass = computed(() => {
  const isVisible = isMobileSize.value ? isRightColumnVisible.value : chat.showTheFriendPanel;
  return [
    "right-column-outer z-1 h-full min-w-0 flex-1 flex-col fixed top-0 left-0 sm:(card-bg-color-2 static)",
    isVisible ? "flex absolute sm:(p-0 relative) left-0 w-full" : "hidden sm:flex",
  ];
});
</script>

<template>
  <div class="h-full w-full flex flex-1">
    <!-- 左侧列表面板 -->
    <div :class="leftColumnClass">
      <ChatFriendTabs class="nav-padding-top-6 relative mx-a h-full flex-shrink-0 p-4 pb-0 sm:px-2.5" />
    </div>

    <!-- 右侧详情面板 -->
    <div :class="rightColumnClass">
      <Transition
        :name="friendPanelTransitionName"
        mode="out-in"
        @after-leave="onPanelAfterLeave"
      >
        <div
          v-if="chat.showTheFriendPanel"
          key="friend-panel"
          class="bg right-column-inner h-full min-w-0 w-full flex-1 flex-col bg-color-2 sm:card-bg-color-2"
        >
          <template v-if="isEmptyPanel">
            <!-- 关闭按钮 (Mobile Only) -->
            <div
              class="i-carbon:close absolute right-6 top-6 z-1000 block scale-110 btn-danger p-2.6 sm:right-6 sm:top-11"
              title="关闭"
              @click="closePanel"
            />
            <!-- 内容区 -->
            <Transition
              name="main-panel-fade"
            >
              <ChatFriendMainType
                :key="`${chat.theFriendOpt?.type}_${chat.theFriendOpt?.data?.id || Date.now()}`"
                :data="chat.theFriendOpt"
                class="nav-padding-top-6 relative z-999 mx-a h-full w-full flex-1 flex-shrink-0 bg-color sm:!bg-transparent"
              />
            </Transition>
          </template>
        </div>
      </Transition>

      <!-- 空状态 -->
      <div
        v-if="!chat.showTheFriendPanel && !setting.isMobileSize"
        key="chat-friend-empty"
        class="flex-row-c-c flex-1 flex-shrink-0 select-none bg-color-2"
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
$ios-transition-timing: cubic-bezier(0.25, 0.75, 0.1, 1);
$page-transition-duration: 0.4s;

.main {
  height: 100%;
  width: 100%;
}

.bg {
  background-image: linear-gradient(
    160deg,
    #eaf3ff 0%,
    transparent,
    transparent,
    transparent,
    transparent,
    transparent,
    transparent
  );
}
.dark .bg {
  background-image: linear-gradient(
    160deg,
    #262626 0%,
    transparent,
    transparent,
    transparent,
    transparent,
    transparent,
    transparent,
    transparent
  );
}

/* 移动端：右侧面板滑入/滑出（类似路由 push/pop） */
.right-column-inner {
  transform: translateZ(0);
  will-change: transform;
  backface-visibility: hidden;
}
.friend-panel-slide-enter-active,
.friend-panel-slide-leave-active {
  transition: transform $page-transition-duration $ios-transition-timing;
}
.friend-panel-slide-enter-from {
  transform: translateX(100%);
}
.friend-panel-slide-leave-to {
  transform: translateX(100%);
}

/* 非移动端或关闭动画时使用短渐变 */
.friend-panel-fade-enter-active,
.friend-panel-fade-leave-active {
  transition: opacity 0.2s ease-out;
}
.friend-panel-fade-enter-from,
.friend-panel-fade-leave-to {
  opacity: 0;
}
.friend-panel-fade-enter-to,
.friend-panel-fade-leave-from {
  opacity: 1;
}

.main-panel-fade-enter-active,
.main-panel-fade-leave-active {
  transition: all 0.2s ease-out;
  transform-origin: top center;
}
.main-panel-fade-enter-from,
.main-panel-fade-leave-to {
  opacity: 0;
  filter: blur(4px);
}
.main-panel-fade-enter-to,
.main-panel-fade-leave-from {
  opacity: 1;
}
</style>
