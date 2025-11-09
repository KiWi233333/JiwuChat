<script lang="ts" setup>
const setting = useSettingStore();
const chat = useChatStore();

const {
  pageInfo,
  isLoading,
  isReload,
  isSyncing,
  msgList,
  scrollbarRef,
  syncMessages,
  loadData,
  reload,
  onScroll,
  init,
} = useMessageList();

// 初始化
init();
// 监听
watch(() => setting.isMobileSize, (val, oldVal) => {
  nextTick(() => {
    chat.scrollBottom(false);
  });
});

onMounted(() => {
  // 监听WebSocket重连事件
  mitter.on(MittEventType.WS_SYNC, ({ lastDisconnectTime, reconnectTime }) => {
    console.log(`消息同步中，时间：${reconnectTime - lastDisconnectTime}ms`);
    syncMessages();
  });
});

// 清理事件监听
onBeforeUnmount(() => {
  mitter.off(MittEventType.WS_SYNC);
});

const delayShowReload = useDelayChange(isReload, 1000, true);

// 暴露
defineExpose({
  reload,
  syncMessages,
});
</script>

<template>
  <el-scrollbar
    ref="scrollbarRef"
    class="relative max-w-full min-h-0 flex-1"
    height="100%"
    wrap-class="px-0 shadow-inner-bg"
    view-class="pb-8 pt-4"
    @scroll="onScroll"
  >
    <div
      v-bind="$attrs"
      class="msg-list px-1 op-0 sm:px-2"
      :class="{ 'op-100  transition-(200 property-opacity)': !isReload }"
    >
      <!-- 同步指示器 -->
      <div v-if="isSyncing" data-fade style="--anima: latter-slice-bottom;" class="absolute top-4 z-2 flex-row-c-c rounded bg-color-br px-2 py-1 text-mini text-theme-primary shadow-lg">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 animate-spin select-none" viewBox="0 0 24 24"><g fill="none" fill-rule="evenodd"><path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" /><path fill="currentColor" d="M12 4.5a7.5 7.5 0 1 0 0 15a7.5 7.5 0 0 0 0-15M1.5 12C1.5 6.201 6.201 1.5 12 1.5S22.5 6.201 22.5 12S17.799 22.5 12 22.5S1.5 17.799 1.5 12" opacity=".1" /><path fill="currentColor" d="M12 4.5a7.46 7.46 0 0 0-5.187 2.083a1.5 1.5 0 0 1-2.075-2.166A10.46 10.46 0 0 1 12 1.5a1.5 1.5 0 0 1 0 3" /></g></svg>
        &nbsp;同步中...
      </div>
      <ListDisAutoIncre
        :auto-stop="false"
        :delay="800"
        :threshold-height="200"
        :immediate="false"
        :no-more="pageInfo?.isLast && !isReload"
        :loading="isLoading && !isReload"
        @load="loadData"
      >
        <template #load>
          <div class="div flex-row-c-c py-2 text-mini op-80">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 animate-spin select-none" viewBox="0 0 24 24"><g fill="none" fill-rule="evenodd"><path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" /><path fill="currentColor" d="M12 4.5a7.5 7.5 0 1 0 0 15a7.5 7.5 0 0 0 0-15M1.5 12C1.5 6.201 6.201 1.5 12 1.5S22.5 6.201 22.5 12S17.799 22.5 12 22.5S1.5 17.799 1.5 12" opacity=".1" /><path fill="currentColor" d="M12 4.5a7.46 7.46 0 0 0-5.187 2.083a1.5 1.5 0 0 1-2.075-2.166A10.46 10.46 0 0 1 12 1.5a1.5 1.5 0 0 1 0 3" /></g></svg>
            &nbsp;加载中...
          </div>
        </template>
        <!-- 消息适配器 -->
        <ChatMsgMain
          v-for="(msg, i) in msgList"
          :id="`chat-msg-${msg.message.id}`"
          :key="msg.message.id"
          :index="i"
          :data="msg"
          :prev-msg="msgList?.[i - 1] || {}"
        />
      </ListDisAutoIncre>
    </div>
    <!-- 骨架屏 -->
    <div v-if="setting.settingPage.animation.msgListSkeleton && delayShowReload" class="msg-list absolute bottom-0 left-0 z-1 w-full flex flex-col animate-(fade-in duration-200) overflow-hidden bg-color-3 px-2 pb-8 transition-(200 opacity)">
      <ChatMsgSkeleton v-for="i in 6" :key="i" />
      <svg v-show="setting.settingPage.animation.msgListSkeleton && delayShowReload" xmlns="http://www.w3.org/2000/svg" class="absolute bottom-4 right-4 z-1 h-5 w-5 animate-spin select-none" viewBox="0 0 24 24"><g fill="none" fill-rule="evenodd"><path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" /><path fill="currentColor" d="M12 4.5a7.5 7.5 0 1 0 0 15a7.5 7.5 0 0 0 0-15M1.5 12C1.5 6.201 6.201 1.5 12 1.5S22.5 6.201 22.5 12S17.799 22.5 12 22.5S1.5 17.799 1.5 12" opacity=".1" /><path fill="currentColor" d="M12 4.5a7.46 7.46 0 0 0-5.187 2.083a1.5 1.5 0 0 1-2.075-2.166A10.46 10.46 0 0 1 12 1.5a1.5 1.5 0 0 1 0 3" /></g></svg>
    </div>
  </el-scrollbar>
</template>

<style lang="scss" scoped>
.shadow-inner-bg {
  box-shadow:
    rgba(0, 0, 0, 0.1) 0px 2px 8px 0px inset,
    rgba(0, 0, 0, 0.1) 0px -2px 8px 0px inset;
}
// .msg-list { // 禁止复用
// }
.isReload {
  .animate {
    animation: none !important;
  }
}
</style>
