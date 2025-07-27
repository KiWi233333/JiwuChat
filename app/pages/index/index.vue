
<script lang="ts" setup>
const chat = useChatStore();
const setting = useSettingStore();
</script>

<template>
  <div class="h-full flex flex-1 overflow-x-hidden">
    <ChatContactList
      class="transition-anima absolute left-0 top-0 h-full w-full flex-1 scale-100 sm:(relative left-auto top-auto flex-none transform-none) !sm:w-320px"
      :class="{
        '-translate-x-1/2 css-will-change': !chat.isOpenContact,
      }"
    />
    <!-- 聊天框 移动端动画 -->
    <ChatContent
      v-if="chat.theRoomId"
      class="transition-anima absolute left-0 top-0 z-99 h-full flex-1 border-default-3-l sm:(relative left-auto top-auto w-1/4 transform-none)"
      :class="{
        'translate-x-full css-will-change': chat.isOpenContact,
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
.transition-anima {
  transition: transform 0.3s ease-in-out;
}
.css-will-change {
  will-change: transform;
}
</style>
