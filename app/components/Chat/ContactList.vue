<script lang="ts" setup>
import type { ChatContactVO } from "@/composables/api/chat/contact";
import ContextMenu from "@imengyu/vue3-context-menu";
import { RoomType } from "@/composables/api/chat/contact";
import { STOP_TRANSITION_KEY } from "~/init/setting";

const props = defineProps<{
  dto?: ContactPageDTO
}>();
const isLoading = ref<boolean>(false);
const setting = useSettingStore();
const user = useUserStore();
const chat = useChatStore();
const ws = useWsStore();
const isReload = ref(false);
const visiblePopper = ref(false);
const pageInfo = ref({
  cursor: undefined as undefined | string,
  isLast: false,
  size: 20,
});
const historyContactId = useLocalStorage<number | undefined>(() => `${user.userId}-history-contact-id`, undefined);
const isLoadRoomMap: Record<number, boolean> = {};
const currentRoomIndex = computed(() => chat.getContactList.findIndex(room => room.roomId === chat.theRoomId));
// 滚动顶部触发
const scrollbarRef = useTemplateRef("scrollbarRef");
const isScrollTop = ref(true);
function onScroll(e: {
  scrollTop: number;
  scrollLeft: number;
}) {
  isScrollTop.value = e.scrollTop === 0;
}

function handleEndReached() {
  if (!isLoading.value && !pageInfo.value.isLast) {
    loadData(props.dto);
  }
}
/**
 * 加载会话列表
 */
async function loadData(dto?: ContactPageDTO) {
  if (isLoading.value || pageInfo.value.isLast)
    return;
  isLoading.value = true;
  const { data } = await getChatContactPage({
    pageSize: pageInfo.value.size,
    cursor: pageInfo.value.cursor,
  }, user.getToken);
  if (!data) {
    return;
  }
  if (data && data.list) {
    for (const item of data.list) {
      chat.refreshContact(item);
    }
  }
  pageInfo.value.isLast = data.isLast;
  pageInfo.value.cursor = data.cursor || undefined;
  isLoading.value = false;
  return data.list;
}

// 刷新
async function reload(size: number = 20, dto?: ContactPageDTO, isAll: boolean = true, roomId?: number) {
  if (isReload.value)
    return;
  isReload.value = true;
  if (isAll) {
    pageInfo.value = {
      cursor: undefined,
      isLast: false,
      size,
    };
    if (setting.isMobileSize) { // 移动端
      chat.isOpenGroupMember = false;// 关闭群成员列表
      setting.isOpenContactSearch = true;// 打开搜索框
    }
    // const list = await loadData(dto || props.dto);
    try {
      await loadData(dto || props.dto);
    }
    catch (error) {
      console.error("加载会话列表失败", error);
      isReload.value = false;
    }
    // 默认加载首个会话
    if (!setting.isMobileSize && historyContactId.value && chat.contactMap[historyContactId.value]) {
      chat.setContact(chat.contactMap[historyContactId.value]);
    }
    else {
      chat.setContact();
      chat.isOpenContact = true;
    }
  }
  else if (roomId) { // 刷新某一房间
    refreshItem(roomId);
  }
  nextTick(() => {
    isReload.value = false;
  });
}

// 同步
const isSyncing = ref(false);
async function fetchContacts() {
  if (isLoading.value || isSyncing.value)
    return;
  isLoading.value = true;
  isSyncing.value = true;
  try {
    const { data } = await getChatContactPage({
      pageSize: chat.getContactList.length,
      cursor: null,
    }, user.getToken);
    if (!data) {
      return;
    }
    if (data && data.list) {
      for (const item of data.list) {
        chat.refreshContact(item);
      }
    }
    isLoading.value = false;
    isSyncing.value = false;
  }
  catch (error) {
    console.log(error);
    isLoading.value = false;
    isSyncing.value = false;
  }
}

// 刷新某一房间
async function refreshItem(roomId: number) {
  if (!roomId || isLoadRoomMap[roomId])
    return;
  isLoadRoomMap[roomId] = true;
  try {
    const item = chat.contactMap[roomId] as ChatContactVO | undefined;
    if (item?.type !== undefined && item.type !== null)
      return;
    if (item?.type === RoomType.GROUP) {
      const res = await getChatContactInfo(roomId, user.getToken, RoomType.GROUP);
      if (res)
        chat.refreshContact(res.data);
    }
  }
  catch (error) {
    console.log(error);
  }
  finally {
    delete isLoadRoomMap[roomId];
  }
}

// 状态错误
const online = useOnline();
const isAnimateDelay = ref(true);
const showWsStatusTxt = computed(() => {
  if (!online.value) {
    return setting.isMobileSize ? "网络已断开" : "当前网络不可用";
  }
  if (ws.status !== WsStatusEnum.OPEN) {
    return ws.status === WsStatusEnum.CONNECTION ? (isAnimateDelay.value ? "" : "正在重新连接...") : "连接已断开";
  }
  if (!user.isLogin) {
    return "登录失效";
  }
  return "";
});
function handleOfflineReload() {
  if (ws.status !== WsStatusEnum.OPEN) {
    ws.reload();
  }
}

// 右键菜单
function onContextMenu(e: MouseEvent, item: ChatContactVO) {
  e.preventDefault();
  const isPin = !!chat.contactMap?.[item.roomId]?.pinTime;
  const isShield = !!chat.contactMap?.[item.roomId]?.shieldStatus;
  const opt = {
    x: e.x,
    y: e.y,
    theme: setting.contextMenuTheme,
    items: [
      // 置顶功能
      {
        customClass: "group",
        icon: isPin ? "i-solar:pin-bold-duotone  group-hover:(i-solar:pin-outline scale-110)" : "i-solar:pin-outline group-hover:i-solar:pin-bold-duotone",
        label: isPin ? "取消置顶" : "置顶",
        onClick: () => chat.setPinContact(item.roomId, isPin ? isTrue.FALESE : isTrue.TRUE),
      },
      // 免打扰功能
      {
        customClass: "group",
        icon: isShield ? "i-carbon:notification-filled group-hover:i-carbon:notification" : "i-carbon:notification-off group-hover:(i-carbon:notification-off-filled scale-110)",
        label: isShield ? "取消免打扰" : "免打扰",
        onClick: () => chat.setShieldContact(item.roomId, !isShield ? isTrue.TRUE : isTrue.FALESE),
      },
      {
        customClass: "group",
        divided: "up",
        icon: "i-solar:trash-bin-minimalistic-outline group-btn-danger group-hover:i-solar:trash-bin-minimalistic-bold-duotone",
        label: "不显示聊天",
        onClick: () => {
          chat.deleteContactConfirm(item.roomId, () => {
          });
        },
      },
    ] as any,
  };
  // 群聊
  if (item.type === RoomType.GROUP) {
    // 在第一个后插入
    opt.items.splice(1, 0, {
      customClass: "group",
      icon: "i-solar:user-speak-broken group-btn-warning group-hover:i-solar:user-speak-bold-duotone",
      label: "邀请好友",
      onClick: () => {
        chat.inviteMemberForm = {
          show: true,
          roomId: item.roomId,
          uidList: [],
        };
      },
    });
  }
  else if (item.type === RoomType.SELFT) {
    opt.items.splice(1, 0, {
      customClass: "group",
      icon: "i-solar:user-outline group-btn-info group-hover:i-solar:user-bold-duotone",
      label: "联系TA",
      onClick: async () => {
        // 跳转到好友页面
        const friendId = chat.contactMap?.[item.roomId]?.targetUid;
        if (!friendId) {
          await chat.reloadContact(item.roomId);
        }
        chat.setTheFriendOpt(FriendOptType.User, {
          id: chat.contactMap?.[item.roomId]?.targetUid,
        });
        navigateTo({
          path: "/friend",
          query: {
            dis: 1,
          },
        });
      },
    });
  }

  ContextMenu.showContextMenu(opt);
}

// 跳转好友页面
async function toFriendPage() {
  visiblePopper.value = false;
  await nextTick();
  await navigateTo("/friend");
  setTimeout(async () => {
    chat.setTheFriendOpt(FriendOptType.Empty);
    const com = document?.getElementById?.(applyUserSearchInputDomId);
    if (com) {
      com?.focus();
    }
  }, 200);
}

function onClickContact(room: ChatContactVO) {
  chat.isOpenContact = false;
  historyContactId.value = room.roomId;
  chat.onChangeRoom(room.roomId);
}

// 监听当前选中的房间ID变化
watch(() => chat.theRoomId, (newRoomId) => {
  if (newRoomId) {
    // 查找当前选中的联系人元素
    const selectedElement = document.querySelector(`#contact-${newRoomId}`);
    if (selectedElement) {
      // 检查元素是否在视图中可见
      const rect = selectedElement.getBoundingClientRect();
      const scrollContainer = scrollbarRef.value?.scrollbarRef?.wrapRef;
      if (scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect();
        // 如果元素不在视图中，则滚动到可见位置
        if (rect.top < containerRect.top || rect.bottom > containerRect.bottom) {
          selectedElement.scrollIntoView({
            // behavior: "smooth",
            block: "nearest",
          });
        }
      }
    }
  }
}, { immediate: false });

const RoomTypeTagType: Record<number, "" | "primary" | "info" | any> = {
  [RoomType.AICHAT]: "warning",
};

// @unocss-include
const menuList = [
  {
    label: "添加好友",
    icon: "i-tabler:user-plus",
    onClick: () => {
      toFriendPage();
    },
  },
  {
    label: "发起群聊",
    icon: "i-solar:chat-round-dots-outline",
    onClick: () => {
      visiblePopper.value = false;
      chat.inviteMemberForm = {
        show: true,
        roomId: undefined,
        uidList: [],
      };
    },
  },
];

onMounted(() => {
  reload();

  // 监听
  mitter.on(MittEventType.WS_SYNC, ({ lastDisconnectTime, reconnectTime }) => {
    // 重连
    console.log(`会话同步，时延：${reconnectTime - lastDisconnectTime}ms`);
    fetchContacts();
  });
  setTimeout(() => {
    isAnimateDelay.value = false;
  }, 1500);
});
</script>

<template>
  <div
    class="group main main-bg-color"
  >
    <!-- 搜索群聊 -->
    <div
      class="nav-padding-top-6 header"
      :class="setting.isMobileSize && !setting.isOpenContactSearch ? '!h-0 overflow-y-hidden' : ''"
    >
      <ElInput
        id="search-contact"
        v-model.lazy="chat.searchKeyWords"
        class="mr-2 text-0.8rem hover:op-80"
        style="height: 2rem;"
        name="search-content"
        type="text"
        clearable
        autocomplete="off"
        :prefix-icon="ElIconSearch"
        minlength="2"
        maxlength="30"
        placeholder="搜索"
      />
      <!-- 添加 -->
      <MenuPopper
        v-model:visible="visiblePopper"
        placement="bottom-end"
        transition="popper-fade"
        trigger="click"
        :menu-list="menuList"
      >
        <template #reference>
          <div class="icon">
            <i i-carbon:add-large p-2 />
          </div>
        </template>
      </MenuPopper>
    </div>
    <div class="relative w-full flex-row-c-c">
      <div v-if="isSyncing" data-fade style="--anima: latter-slice-bottom;" class="absolute top-4 z-2 flex-row-c-c rounded bg-color-br px-2 py-1 text-mini text-theme-primary shadow-lg">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 animate-spin select-none" viewBox="0 0 24 24"><g fill="none" fill-rule="evenodd"><path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" /><path fill="currentColor" d="M12 4.5a7.5 7.5 0 1 0 0 15a7.5 7.5 0 0 0 0-15M1.5 12C1.5 6.201 6.201 1.5 12 1.5S22.5 6.201 22.5 12S17.799 22.5 12 22.5S1.5 17.799 1.5 12" opacity=".1" /><path fill="currentColor" d="M12 4.5a7.46 7.46 0 0 0-5.187 2.083a1.5 1.5 0 0 1-2.075-2.166A10.46 10.46 0 0 1 12 1.5a1.5 1.5 0 0 1 0 3" /></g></svg>
        &nbsp;同步中...
      </div>
      <!-- 已断开 -->
      <div v-else-if="showWsStatusTxt" class="w-full flex-row-c-c bg-[#fa5151] bg-op-10 py-4 text-xs text-theme-danger dark:bg-op-06" @click="handleOfflineReload">
        <i i-solar:link-broken-broken mr-2 p-2 />
        {{ showWsStatusTxt }}
      </div>
    </div>
    <!-- 会话列表 -->
    <ListVirtualScrollList
      ref="scrollbarRef"
      :overscan="20"
      :items="chat.getContactList"
      :item-height="setting.isMobileSize ? '4.2rem' : '4.5rem'"
      max-height="100%"
      wrap-class="w-full relative h-full sm:(p-2)"
      :class-name="['contact-list', isAnimateDelay ? STOP_TRANSITION_KEY : '']"
      item-class="contact-item"
      :get-item-key="(room) => room.roomId"
      :selected-index="currentRoomIndex"
      enable-pull-to-refresh
      @refresh="reload"
      @scroll="onScroll"
      @end-reached="handleEndReached"
      @item-click="onClickContact"
    >
      <!-- 添加骨架屏 -->
      <template #pre>
        <div v-if="isReload" key="skeleton" class="main-bg-color absolute left-0 top-0 z-2 h-100vh w-full flex-1 overflow-y-hidden">
          <div v-for="i in 10" :key="i" class="contact-sky">
            <div class="h-10 w-10 flex-shrink-0 flex-shrink-0 rounded-full bg-color object-cover" />
            <!-- 信息 -->
            <div class="info-skeleton">
              <div class="nickname-skeleton h-3 w-8em rounded bg-color" />
              <div class="mt-4 h-3 w-10em rounded bg-color" />
            </div>
          </div>
        </div>
      </template>
      <template #default="{ item: room }">
        <div
          :id="`contact-${room.roomId}`"
          class="contact"
          :class="{
            'is-pin': room.pinTime,
            'is-checked': room.roomId === chat.theRoomId,
            'is-shield': room.shieldStatus === isTrue.TRUE,
          }"
          @contextmenu.stop="onContextMenu($event, room)"
        >
          <el-badge
            :hidden="!room.unreadCount"
            :max="99"
            :offset="[-5, 5]"
            :value="room.unreadCount"
            class="badge h-10 w-10 flex-shrink-0"
          >
            <CardElImage
              :error-class="contactTypeIconClassMap[(room as ChatContactVO).type]"
              :default-src="room.avatar"
              fit="cover"
              class="h-full w-full rounded-full card-bg-color-2 object-cover shadow"
            />
          </el-badge>
          <div class="flex flex-1 flex-col justify-between truncate">
            <div flex truncate>
              <p class="text truncate text-black dark:text-white">
                {{ room.name }}
              </p>
              <!-- AI机器人 -->
              <i v-if="RoomTypeTagType[room.type]" i-ri:robot-2-line class="ai-icon" />
              <span class="text ml-a w-fit flex-shrink-0 text-right text-0.7em text-color leading-2em">
                {{ formatContactDate(room.activeTime) }}
              </span>
            </div>
            <p class="text mt-1 flex text-small">
              <small
                class="h-1.5em flex-1 truncate"
                :class="{ 'text-[var(--el-color-info)] font-500': room.unreadCount && room.shieldStatus !== isTrue.TRUE }"
              >
                {{ room.text }}
              </small>
              <small v-if="room.shieldStatus === isTrue.TRUE" class="text i-carbon:notification-off ml-1 flex-shrink-0 overflow-hidden text-3 text-small" />
              <small v-if="room.pinTime" class="text i-solar:pin-bold-duotone ml-1 flex-shrink-0 overflow-hidden text-3 text-color" />
            </p>
          </div>
        </div>
      </template>

      <template #empty>
        <div v-if="!isReload || !isLoading" data-fades class="flex-row-c-c flex-col py-10vh text-small">
          <i class="i-solar:chat-round-bold-duotone mb-4 p-5" />
          <span>快去找人聊天吧！</span>
        </div>
      </template>
    </ListVirtualScrollList>
  </div>
</template>

<style lang="scss" scoped>
.main {
  --at-apply: "z-4 h-full flex flex-shrink-0 flex-col select-none overflow-hidden border-0 border-0 rounded-0 sm:(relative left-0 top-0 w-1/4 pl-0)";
}
.main-bg-color {
  --at-apply: "bg-color-3 sm:(bg-white dark:bg-[#111111])";
}

.contact-sky {
  --at-apply: "h-17 op-60 bg-color-2 dark:bg-transparent flex items-center gap-3 p-4 sm:(h-17 border-transparent p-3 w-full text-color card-rounded-df mb-2 )  w-full text-sm  cursor-pointer  !hover:bg-[#f8f8f8] !dark:hover:bg-[#151515]";
}

.contact-list {
  --at-apply: "sm:p-2 p-0";

  .contact {
    // transition: background-color 100ms ease-in-out;
    --at-apply: "h-full bg-color sm:(bg-transparent) dark:bg-transparent flex items-center gap-3 p-4 sm:(h-17 border-transparent p-3 w-full text-color card-rounded-df mb-2)  w-full text-sm  cursor-pointer  !hover:bg-[#f8f8f8] !dark:hover:bg-[#151515]";
    .text {
      --at-apply: "transition-none";
    }

    .ai-icon {
      --at-apply: "mx-0.5em pt-0.2em h-1.4em w-1.4em text-theme-primary dark:text-theme-info";
    }
    &.is-pin {
      --at-apply: "bg-light-4 dark:bg-dark-8";
    }
    &.is-checked {
      --at-apply: "!sm:(bg-[var(--el-color-primary-light-9)] dark:bg-[var(--el-color-primary-light-3)] hover:op-90) ";
      .text {
        --at-apply: "dark:text-white";
      }
      // .ai-icon {
      //   --at-apply: "sm:!text-white";
      // }
    }

    :deep(.el-badge__content) {
      --at-apply: "border-none p-0 min-w-4 h-4 px-1 text-0.7rem";
    }
    &.is-shield {
      :deep(.el-badge__content) {
        --at-apply: "bg-gray text-white border-none dark:(bg-dark-2)";
      }
    }
  }
}
.header {
  --at-apply: "sm:(h-20 px-4) bg-color sm:(bg-white dark:bg-[#111111]) h-14 px-3 flex-row-c-c flex-shrink-0 transition-200 transition-height";
  :deep(.el-input) {
    .el-input__wrapper {
      --at-apply: "!shadow-none !outline-none !input-bg-color";
    }
  }
  .icon {
    --at-apply: "h-2rem px-2 w-2rem  !btn-primary-bg flex-row-c-c input-bg-color";
  }
}
// 影响高度变化
@media screen and (max-width: 768px) {
  .contact {
    border-top: 1px solid #7e7e7e0e !important;
    border-bottom: 1px solid transparent !important;
    border-left: 1px solid transparent !important;
    border-right: 1px solid transparent !important;
  }
}

:deep(.el-scrollbar__bar) {
  right: 1px;
  // --at-apply: "!hidden sm:block";
  --el-scrollbar-bg-color: #9292928a;

  &:active {
    --el-scrollbar-bg-color: #9292928a;
  }


  .el-scrollbar__thumb {
    width: 6px;
  }
}
.reload {
  transition: none !important;
  * {
    transition: none !important;
  }
}
</style>
