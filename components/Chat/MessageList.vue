<script lang="ts" setup>
const chat = useChatStore();
const user = useUserStore();
const setting = useSettingStore();

// 消息
const pageInfo = computed({
  get: () => chat?.theContact?.pageInfo || {},
  set: (val: PageInfo) => {
    if (chat.theContact)
      chat.theContact.pageInfo = val;
  },
});
const isLoading = computed({
  get: () => !!chat?.theContact?.isLoading,
  set: (val: boolean) => {
    if (!chat.theContact)
      return;
    chat.theContact.isLoading = val;
  },
});
const isReload = computed({
  get: () => !!chat?.theContact?.isReload,
  set: (val: boolean) => {
    if (!chat.theContact)
      return;
    chat.theContact.isReload = val;
  },
});

// 滚动
const scrollbarRef = useTemplateRef("scrollbarRef");
const timer = ref<any>(0);

/**
 * 加载数据
 */
async function loadData(roomId?: number, call?: (data?: ChatMessageVO[]) => void) {
  roomId = roomId || chat.theRoomId;
  if (!roomId || !pageInfo.value) {
    return;
  }
  if (isLoading.value || isReload.value || pageInfo.value.isLast || !roomId)
    return;
  if (chat.isMsgListScroll) {
    return;
  }
  isLoading.value = true;
  const res = await getChatMessagePage(roomId, pageInfo.value.size, pageInfo.value.cursor, user.getToken).catch(() => {
    isLoading.value = false;
    pageInfo.value.isLast = false;
    pageInfo.value.cursor = undefined;
  });
  if (res?.code !== StatusCode.SUCCESS) {
    console.warn("加载消息失败");
    return;
  }
  const data = res.data;
  if (roomId !== chat.theRoomId || !chat.theContact)
    return;
    // 追加数据
  if (data?.list && data.list.length)
    chat?.theContact?.msgList?.unshift?.(...data.list);
  const oldSize = chat.scrollTopSize;
  nextTick(() => {
    // 更新滚动位置
    if (!chat.theContact)
      return;
    chat.saveScrollTop && chat.saveScrollTop();
    if (pageInfo.value.cursor === null && !chat?.theContact?.msgList?.length) { // 第一次加载默认没有动画
      chat.scrollBottom(false);
      call && call(chat.theContact.msgList || []);
    }
    else {
      // 更新滚动位置
      const newSize = chat.scrollTopSize;
      // 距离顶部
      const msgRangeSize = newSize - oldSize;
      if (msgRangeSize > 0)
        chat.scrollTop(msgRangeSize);
    }
    isLoading.value = false;
  });
  pageInfo.value.isLast = data.isLast;
  pageInfo.value.cursor = data.cursor || undefined;
}
// 重新加载
function reload(roomId?: number) {
  roomId = roomId || chat.theRoomId;
  if (!chat.theContact || !roomId)
    return;
  //  TODO:判断缓存是否超过 10 分钟
  // 重置滚动位置
  chat.scrollTopSize = 0;
  pageInfo.value = {
    cursor: undefined as undefined | string,
    isLast: false,
    size: 20,
  };
  chat.theContact.msgList?.splice?.(0);
  isReload.value = true;
  isLoading.value = true;
  getChatMessagePage(roomId, 20, null, user.getToken).then(async ({ data }) => {
    if (roomId !== chat.theRoomId)
      return;
    // 追加数据
    if (!data?.list?.length || !chat.theContact)
      return;
    chat.theContact.msgList = data.list;
    pageInfo.value.isLast = data.isLast;
    pageInfo.value.cursor = data.cursor || undefined;
    await nextTick();
    isLoading.value = false;
    isReload.value = false;
    chat.scrollBottom(false);
    chat.saveScrollTop && chat.saveScrollTop();
  }).catch(async () => {
    await nextTick();
    isLoading.value = false;
    isReload.value = false;
    chat.scrollBottom(false);
  })
  ;
}

const requestAnimationFrameFn = window?.requestAnimationFrame || (callback => setTimeout(callback, 16));

// 监听房间
watch(() => chat.theRoomId, async (val, oldVal) => {
  if (val) {
    // 消息阅读上报
    chat.setReadList(val);
    nextTick(() => {
      scrollbarRef.value && scrollBottom(false);
    });
    if (!chat.contactMap[val]?.msgList.length || chat.contactMap[val]?.lastMsgId !== chat.contactMap[val].lastMsgId) { // 会话判断是否同步
      requestAnimationFrameFn(() => {
        reload(val);
      });
    }
  }
  if (oldVal) { // 旧会话消息上报
    chat.setReadList(oldVal);
  }
}, {
  immediate: true,
});

/**
 * 滚动到指定消息
 * @Param msgId 消息id
 * @Param gapCount 偏移消息量（用于翻页）
 * @Param isAnimated 是否动画滚动
 */
function scrollReplyMsg(msgId: number, gapCount: number = 0, isAnimated: boolean = true) {
  if (!msgId)
    return;
  const offset = -10;
  const el = document.querySelector(`#chat-msg-${msgId}`) as HTMLElement;
  if (!el) {
    timer.value = setTimeout(() => {
      const el = document.querySelector(`#chat-msg-${msgId}`) as HTMLElement;
      if (el) {
        timer.value && clearTimeout(timer.value);
        timer.value = null;
        scrollReplyMsg(msgId, gapCount); // 递归翻页
      }
      else {
        scrollTop(0);
        scrollReplyMsg(msgId, gapCount);
      }
    }, 120);
  }
  else {
    timer.value = null;
    // 找到对应消息
    nextTick(() => {
      if (!el)
        return;
      if (el.classList.contains("reply-shaing")) {
        return;
      }
      clearTimeout(timer.value);
      scrollTop((el?.offsetTop || 0) + offset, isAnimated);
      el.classList.add("reply-shaing");
      timer.value = setTimeout(() => {
        el.classList.remove("reply-shaing");
        timer.value = null;
      }, 2000);
    });
  }
}

// 滚动到底部
function scrollBottom(animate = true) {
  if (!scrollbarRef?.value?.wrapRef?.scrollHeight) {
    return;
  }
  scrollTop(scrollbarRef?.value?.wrapRef?.scrollHeight, animate);
}

// 保存上一个位置
function saveScrollTop() {
  chat.scrollTopSize = scrollbarRef?.value?.wrapRef?.scrollHeight || 0;
}

// 滚动到指定位置
async function scrollTop(size: number, animated = false) {
  if (chat.isMsgListScroll) {
    return;
  }
  chat.isMsgListScroll = true;
  scrollbarRef.value?.wrapRef?.scrollTo({ // 缓动
    top: size || 0,
    behavior: animated ? "smooth" : undefined,
  });
  if (animated) {
    await nextTick();
    setTimeout(() => {
      chat.isMsgListScroll = false;
    }, 300);
  }
  else {
    chat.isMsgListScroll = false;
  }
}

// 滚动
const offset = computed(() => setting.isMobileSize ? -730 : -678);
const debounceReadList = useDebounceFn((theRoomId: number) => {
  chat.setReadList(theRoomId);
}, 500);

// 滚动事件
function onScroll(e: { scrollTop: number; scrollLeft: number; }) {
  // 滚动到底部
  if (chat.theRoomId && e.scrollTop >= (scrollbarRef?.value?.wrapRef?.scrollHeight || 0) + offset.value) {
    chat.shouldAutoScroll = chat.theContact?.msgList?.[(chat.theContact.msgList?.length || 0) - 1]?.message?.type === MessageType.AI_CHAT_REPLY; // ai消息是否为会话最后一条
    debounceReadList(chat.theRoomId);
  }
  else {
    chat.shouldAutoScroll = false;
  }
}
onMounted(() => {
  mitter.on(MittEventType.MSG_LIST_SCROLL, ({ type, payload }) => {
    switch (type) {
      case "scrollBottom":
        scrollBottom(payload?.animate);
        break;
      case "scrollReplyMsg":
        scrollReplyMsg(payload?.msgId, payload.gapCount, payload?.animate);
        break;
      case "saveScrollTop":
        saveScrollTop();
        break;
      case "scrollTop":
        scrollTop(payload?.size, payload?.animate);
        break;
    }
  });
});

onBeforeUnmount(() => {
  timer.value && clearTimeout(timer.value);
  timer.value = null;
  // 解绑事件
  mitter.off(MittEventType.MSG_LIST_SCROLL);
});

// 暴露
defineExpose({
  reload,
});
</script>

<template>
  <el-scrollbar
    ref="scrollbarRef"
    class="max-w-full flex-1"
    height="100%"
    wrap-class="px-0 shadow-inner-bg"
    view-class="pb-8 pt-4"
    @scroll="onScroll"
  >
    <div
      v-bind="$attrs"
      class="msg-list px-1 op-0 transition-(200 property-opacity) sm:px-2"
      :class="{ 'op-100': !isReload }"
    >
      <ListDisAutoIncre
        :auto-stop="false"
        :delay="800"
        :threshold-height="200"
        :immediate="false"
        :no-more="pageInfo.isLast && !isReload"
        :loading="isLoading && !isReload"
        @load="loadData"
      >
        <template #load>
          <div class="div flex-row-c-c py-2 op-80 text-mini">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 animate-spin select-none" viewBox="0 0 24 24"><g fill="none" fill-rule="evenodd"><path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" /><path fill="currentColor" d="M12 4.5a7.5 7.5 0 1 0 0 15a7.5 7.5 0 0 0 0-15M1.5 12C1.5 6.201 6.201 1.5 12 1.5S22.5 6.201 22.5 12S17.799 22.5 12 22.5S1.5 17.799 1.5 12" opacity=".1" /><path fill="currentColor" d="M12 4.5a7.46 7.46 0 0 0-5.187 2.083a1.5 1.5 0 0 1-2.075-2.166A10.46 10.46 0 0 1 12 1.5a1.5 1.5 0 0 1 0 3" /></g></svg>
            &nbsp;加载中...
          </div>
        </template>
        <!-- 消息适配器 -->
        <ChatMsgMain
          v-for="(msg, i) in chat.theContact.msgList"
          :id="`chat-msg-${msg.message.id}`"
          :key="msg.message.id"
          :index="i"
          :data="msg"
          :prev-msg="i > 0 ? chat.theContact?.msgList?.[i - 1] || {} : {}"
        />
      </ListDisAutoIncre>
    </div>
    <!-- 骨架屏 -->
    <!-- <div v-if="isReload" class="msg-list flex flex-col transition-(200 opacity)">
      <ChatMsgSkeleton v-for="i in 10" :key="i" />
    </div> -->
  </el-scrollbar>
</template>

<style lang="scss" scoped>
.shadow-inner-bg {
  box-shadow: rgba(0, 0, 0, 0.1) 0px 2px 8px 0px inset, rgba(0, 0, 0, 0.1) 0px -2px 8px 0px inset;
}
// .msg-list { // 禁止复用
// }
.isReload {
  .animate {
    animation: none !important;
  }
}
</style>
