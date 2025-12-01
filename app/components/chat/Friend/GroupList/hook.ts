
/**
 * 好友/群组列表
 *
 * @param type 好友/群组
 * @returns 好友/群组列表
 */
export function useGroupList(type: "friend" | "group") {
  const chat = useChatStore();
  const isFriendPanel = computed(() => type === "friend");

  // 统一从 store 的管理器读取状态
  const manager = computed(() => (isFriendPanel.value ? chat.friendManager : chat.groupManager));
  const isLoading = computed<boolean>(() => manager.value.isLoading as unknown as boolean);
  const isReload = computed<boolean>(() => manager.value.isReload as unknown as boolean);
  const lastLoadTime = computed<number | undefined>(() => manager.value.lastLoadTime as unknown as number | undefined);
  const pageInfo = computed<{ cursor?: string; isLast: boolean; size: number }>(() => manager.value.pageInfo as unknown as { cursor?: string; isLast: boolean; size: number });
  const list = computed<GroupListDataVO[]>({
    get: () => manager.value.list as unknown as GroupListDataVO[],
    set: (value: GroupListDataVO[]) => manager.value.list = value as any[],
  });

  // 行为代理到 store
  async function loadData() {
    await manager.value.load();
  }

  async function reloadData() {
    await manager.value.reload();
  }

  // 首次加载动画
  const isFirstLoad = ref(false);
  // 页面是否有焦点
  function checkIsFocus(p: GroupListDataVO) {
    return isFriendPanel.value
      ? chat.theFriendOpt?.data?.id === (p as ChatUserFriendVO).userId
      : chat.theFriendOpt?.data?.roomId === (p as ChatRoomGroupVO).roomId;
  }

  onMounted(async () => {
    await manager.value.ensureFresh();
    isFirstLoad.value = true;
  });
  onUnmounted(() => {
    isFirstLoad.value = false;
  });
  onDeactivated(() => {
    isFirstLoad.value = false;
  });
  // 页面激活 5分钟内不重新加载
  onActivated(async () => {
    await manager.value.ensureFresh();
  });

  return {
    isLoading,
    lastLoadTime,
    chat,
    pageInfo,
    list,
    isReload,
    loadData,
    reloadData,
    isFirstLoad,
    isFriendPanel,
    checkIsFocus,
  };
}


//  { type: "friend"; data: ChatUserFriendVO } | { type: "group"; data: ChatRoomGroupVO };
// 根据type判断数据类型
export type GroupListDataVO = ChatUserFriendVO | ChatRoomGroupVO;
