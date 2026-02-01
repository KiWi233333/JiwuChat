
<script lang="ts" setup>
const chat = useChatStore();
const setting = useSettingStore();
</script>

<template>
  <div class="h-full flex flex-1 overflow-x-hidden">
    <ChatContactList
      class="transition-anima absolute left-0 top-0 h-full w-full flex-1 scale-100 sm:(relative left-auto top-auto flex-none transform-none) !sm:w-320px"
      :class="{
        'contact-list-hidden': !chat.isOpenContact,
      }"
    />
    <!-- 聊天框 移动端动画 -->
    <ChatContent
      v-if="chat.theRoomId"
      class="transition-anima absolute left-0 top-0 z-99 h-100dvh flex-1 border-default-3-l sm:(relative left-auto top-auto w-1/4 transform-none)"
      :class="{
        'translate-x-full': chat.isOpenContact,
      }"
    />
    <!-- 空白 -->
    <div v-else-if="!setting.isMobileSize" data-fades class="h-full w-full flex flex-col items-center justify-center rounded-0 card-bg-color-2 text-gray-600 sm:border-default-l dark:(text-gray-500)">
      <i i-solar:chat-line-bold-duotone class="mb-2 h-12 w-12" />
      <small>快开始聊天吧 ✨</small>
    </div>
  </div>
</template>

<style lang="scss">
.main-box {
  --at-apply: "relative py-4 flex-1  w-full  flex overflow-hidden !p-0 bg-color";
}

$ios-transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1); // 优化后的 iOS 风格曲线，前后缓冲更自然
$page-transition-duration: 0.5s;

.transition-anima {
  transition:
    transform $page-transition-duration $ios-transition-timing-function,
    opacity $page-transition-duration ease;
}

@media (max-width: 640px) {
  .contact-list-hidden {
    transform: translateX(-30%);
    opacity: 0.8;
  }
}
</style>
