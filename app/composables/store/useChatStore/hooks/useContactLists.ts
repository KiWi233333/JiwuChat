/** 缓存时间 5分钟 */
const CONTACT_CACHE_TIME = 5 * 60 * 1000;

/**
 * 好友/群组 列表加载管理（分页、缓存）
 * @returns 好友/群组 列表加载管理
 */
export function createContactListsModule() {
  const friendList = ref<ChatUserFriendVO[]>([]);
  const friendPageInfo = ref<PageInfo>({ cursor: undefined, isLast: false, size: 10 });
  const friendIsLoading = ref<boolean>(false);
  const friendIsReload = ref<boolean>(true);
  const friendLastLoadTime = ref<number | undefined>(undefined);

  const groupList = ref<ChatRoomGroupVO[]>([]);
  const groupPageInfo = ref<PageInfo>({ cursor: undefined, isLast: false, size: 10 });
  const groupIsLoading = ref<boolean>(false);
  const groupIsReload = ref<boolean>(true);
  const groupLastLoadTime = ref<number | undefined>(undefined);

  async function loadFriendList() {
    if (friendIsLoading.value || friendPageInfo.value.isLast)
      return;
    friendIsLoading.value = true;
    try {
      const { data } = await getChatFriendPage(friendPageInfo.value.size, friendPageInfo.value.cursor || null, useUserStore().getToken);
      if (data?.list)
        friendList.value.push(...(data.list as any[]));
      friendPageInfo.value.isLast = data.isLast;
      friendPageInfo.value.cursor = (data.cursor as any) || undefined;
    }
    catch (e) { console.error(e); }
    finally { friendIsLoading.value = false; }
  }

  async function reloadFriendList() {
    friendPageInfo.value.cursor = undefined;
    friendPageInfo.value.isLast = false;
    friendLastLoadTime.value = Date.now();
    friendList.value = [];
    friendIsReload.value = true;
    await loadFriendList();
    friendIsReload.value = false;
  }

  async function loadGroupRoomList() {
    if (groupIsLoading.value || groupPageInfo.value.isLast)
      return;
    groupIsLoading.value = true;
    try {
      const { data } = await getChatGroupRoomPage(groupPageInfo.value.size, groupPageInfo.value.cursor || null, useUserStore().getToken);
      if (data?.list)
        groupList.value.push(...(data.list as any[]));
      groupPageInfo.value.isLast = data.isLast;
      groupPageInfo.value.cursor = (data.cursor as any) || undefined;
    }
    catch (e) { console.error(e); }
    finally { groupIsLoading.value = false; }
  }

  async function reloadGroupRoomList() {
    groupPageInfo.value.cursor = undefined;
    groupPageInfo.value.isLast = false;
    groupLastLoadTime.value = Date.now();
    groupList.value = [];
    groupIsReload.value = true;
    await loadGroupRoomList();
    groupIsReload.value = false;
  }

  async function ensureGroupListFresh(type: "friend" | "group") {
    const now = Date.now();
    if (type === "friend") {
      if (!friendLastLoadTime.value || (now - friendLastLoadTime.value > CONTACT_CACHE_TIME))
        await reloadFriendList();
    }
    else {
      if (!groupLastLoadTime.value || (now - groupLastLoadTime.value > CONTACT_CACHE_TIME))
        await reloadGroupRoomList();
    }
  }

  const friendManager: MemberListManager<ChatUserFriendVO> = {
    list: friendList,
    pageInfo: friendPageInfo,
    isLoading: friendIsLoading,
    isReload: friendIsReload,
    lastLoadTime: friendLastLoadTime,
    load: loadFriendList,
    reload: reloadFriendList,
    ensureFresh: async () => ensureGroupListFresh("friend"),
  };

  const groupManager: MemberListManager<ChatRoomGroupVO> = {
    list: groupList,
    pageInfo: groupPageInfo,
    isLoading: groupIsLoading,
    isReload: groupIsReload,
    lastLoadTime: groupLastLoadTime,
    load: loadGroupRoomList,
    reload: reloadGroupRoomList,
    ensureFresh: async () => ensureGroupListFresh("group"),
  };

  return {
    // data
    friendList,
    friendPageInfo,
    friendIsLoading,
    friendIsReload,
    friendLastLoadTime,
    groupList,
    groupPageInfo,
    groupIsLoading,
    groupIsReload,
    groupLastLoadTime,
    // managers
    friendManager,
    groupManager,
    // methods
    loadFriendList,
    reloadFriendList,
    loadGroupRoomList,
    reloadGroupRoomList,
    ensureGroupListFresh,
  };
}


