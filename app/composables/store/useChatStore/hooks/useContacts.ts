export interface ContactsContext {
  // 共享
  contactMap: Ref<Record<number, ChatContactExtra>>
  theRoomId: Ref<number | undefined>
}

/**
 * 联系人与会话相关逻辑
 * @param ctx 上下文
 * @returns 联系人与会话相关逻辑
 */
export function createContactsModule(ctx: ContactsContext) {
  const user = useUserStore();
  const setting = useSettingStore();

  // 关键词与会话面板开关
  const searchKeyWords = ref("");
  const isOpenContact = ref(true);
  // 更新会话摘要
  const updateContactList = ref<{ [key: number]: boolean }>({});

  // 申请未读数
  const applyUnReadCount = useLocalStorage(() => `applyUnReadCount_${user.userId}`, 0);

  // 当前会话与类型判断
  const theRoomId = ctx.theRoomId;
  const contactMap = ctx.contactMap;
  const theContact = computed<Partial<ChatContactExtra>>(() => theRoomId.value ? (contactMap.value?.[theRoomId.value] || {}) : {});
  const isAIRoom = computed(() => theContact.value.type === RoomType.AI_CHAT);
  const isGroupRoom = computed(() => theContact.value.type === RoomType.GROUP);
  const isFriendRoom = computed(() => theContact.value.type === RoomType.SELF);

  // 排序后的联系人
  const sortedContacts = computed(() => Object.values(contactMap.value).sort((a, b) => {
    const pinDiff = (b.pinTime || 0) - (a.pinTime || 0);
    if (pinDiff !== 0)
      return pinDiff;
    return b.activeTime - a.activeTime;
  }));

  // 过滤会话
  const getContactList = computed(() => {
    if (searchKeyWords.value) {
      const lowerCaseSearchKey = searchKeyWords.value.toLowerCase();
      return sortedContacts.value.filter(item => item.name.toLowerCase().includes(lowerCaseSearchKey));
    }
    return sortedContacts.value;
  });

  // 未读会话集合与红点
  const unReadContactList = computed(() => {
    const list = sortedContacts.value.filter(p => p.unreadCount && p.shieldStatus !== isTrue.TRUE);
    localStorage.setItem("unReadContactList", JSON.stringify(list));
    return list;
  });
  const isNewMsg = computed(() => unReadContactList.value.length > 0 || applyUnReadCount.value > 0);

  const totalUnreadCount = computed(() => {
    const contactUnread = unReadContactList.value.reduce((total, contact) => {
      return total + (contact.unreadCount || 0);
    }, 0);
    return contactUnread + applyUnReadCount.value;
  });

  // 总未读数量
  const dockBadge = useDockBadge();

  // 监听未读数量变化，自动更新 dock badge
  watch(totalUnreadCount, (newCount) => {
    if (setting.osType === "macos") {
      dockBadge.setDockBadgeCount(newCount);
    }
  }, { immediate: true });
  // 优化后的更新会话基础信息方法
  function refreshContact(vo: ChatContactVO, oldVo?: ChatContactExtra) {
    if (!vo?.roomId) {
      console.warn("refreshContact error: roomId is undefined");
      return;
    }

    // 合并新旧数据，优先保留旧数据中的消息相关字段
    const prev = oldVo || contactMap.value[vo.roomId] || {} as ChatContactExtra;
    // 只拷贝非空字段，避免污染
    const cleanVo: Record<string, any> = {};
    Object.keys(vo).forEach((key) => {
      const val = (vo as any)[key];
      if (val !== undefined && val !== null) {
        cleanVo[key] = val;
      }
    });

    // 保证消息相关字段不会被新数据覆盖
    contactMap.value[vo.roomId] = {
      ...prev,
      ...cleanVo,
      msgMap: prev.msgMap || {},
      msgIds: prev.msgIds || [],
      unreadMsgList: prev.unreadMsgList || [],
      isReload: prev.isReload || false,
      isLoading: prev.isLoading || false,
      pageInfo: prev.pageInfo || { cursor: undefined, isLast: false, size: 20 } as PageInfo,
    };
  }

  // 重新拉取会话基础信息（保留消息）
  async function reloadBaseContact(roomId: number, roomType: RoomType) {
    if (!roomId) {
      console.warn("reloadBaseContact error: roomId is undefined");
      return false;
    }
    const res = await getChatContactInfo(roomId, user.getToken, roomType)?.catch(() => {});
    if (res && res.code === StatusCode.SUCCESS) {
      const { msgMap = {}, msgIds = [] } = contactMap.value[roomId] || {};
      contactMap.value[roomId] = {
        ...contactMap.value[roomId],
        ...(res?.data || {}),
        msgMap,
        msgIds,
        unreadMsgList: contactMap.value?.[roomId]?.unreadMsgList || [],
        isReload: contactMap.value?.[roomId]?.isReload || false,
        isLoading: contactMap.value?.[roomId]?.isLoading || false,
        pageInfo: contactMap.value?.[roomId]?.pageInfo || { cursor: undefined, isLast: false, size: 20 } as PageInfo,
      };
    }
  }

  // 设置当前会话并按需刷新详情
  async function setContact(vo?: ChatContactVO) {
    if (!vo || !vo.roomId) {
      theRoomId.value = undefined;
      return;
    }
    contactMap.value[vo.roomId] = {
      ...contactMap.value[vo.roomId],
      ...(vo || {}),
      msgMap: contactMap.value?.[vo.roomId]?.msgMap || {},
      msgIds: contactMap.value?.[vo.roomId]?.msgIds || [],
      unreadMsgList: contactMap.value?.[vo.roomId]?.unreadMsgList || [],
      isReload: contactMap.value?.[vo.roomId]?.isReload || false,
      isLoading: contactMap.value?.[vo.roomId]?.isLoading || false,
      pageInfo: contactMap.value?.[vo.roomId]?.pageInfo || { cursor: undefined, isLast: false, size: 20 } as PageInfo,
    };
    const lastSaveTime = contactMap.value?.[vo.roomId]?.saveTime;
    theRoomId.value = vo.roomId;
    if (lastSaveTime && ((Date.now() - lastSaveTime) < 5 * 60 * 1000)) {
      return;
    }
    const res = await getChatContactInfo(vo.roomId, user.getToken, vo.type)?.catch(() => {});
    if (res && res.code === StatusCode.SUCCESS) {
      const { msgMap = {}, msgIds = [] } = contactMap.value[vo.roomId] || {};
      contactMap.value[vo.roomId] = {
        ...contactMap.value[vo.roomId],
        ...(res?.data || {}),
        msgMap,
        msgIds,
        unreadMsgList: contactMap.value?.[vo.roomId]?.unreadMsgList || [],
        isReload: contactMap.value?.[vo.roomId]?.isReload || false,
        isLoading: contactMap.value?.[vo.roomId]?.isLoading || false,
        pageInfo: contactMap.value?.[vo.roomId]?.pageInfo || { cursor: undefined, isLast: false, size: 20 } as PageInfo,
      };
    }
  }

  // 强刷指定会话
  async function reloadContact(roomId: number, callBack?: (contact: ChatContactDetailVO) => void) {
    try {
      const res = await getChatContactInfo(roomId, user.getToken);
      if (!res)
        throw new Error("reloadContact error: res is undefined");
      if (res.code !== StatusCode.SUCCESS) {
        ElMessage.closeAll("error");
        console.error(res.message);
        return;
      }
      refreshContact(res.data, contactMap.value[roomId]);
      callBack && callBack(res.data as ChatContactDetailVO);
    }
    catch {
      ElMessage.closeAll("error");
    }
    finally {
      delete updateContactList.value[roomId];
    }
  }
  function updateContact(roomId: number, data: Partial<ChatContactVO>, callBack?: (contact: ChatContactVO) => void) {
    if (updateContactList.value[roomId])
      return;
    updateContactList.value[roomId] = true;
    if (contactMap.value[roomId]) {
      contactMap.value[roomId].text = data.text || contactMap.value[roomId].text;
      contactMap.value[roomId].unreadCount = data.unreadCount !== undefined ? data.unreadCount : contactMap.value[roomId].unreadCount;
      contactMap.value[roomId].activeTime = data.activeTime ? data.activeTime : contactMap.value[roomId].activeTime;
      contactMap.value[roomId].name = data.name !== undefined ? data.name : contactMap.value[roomId].name;
      contactMap.value[roomId].avatar = data.avatar !== undefined ? data.avatar : contactMap.value[roomId].avatar;
      callBack && callBack(contactMap.value[roomId]);
      delete updateContactList.value[roomId];
    }
    else {
      reloadContact(roomId);
    }
  }

  // 打开/切换房间
  const onChangeRoom = async (newRoomId: number) => {
    if (!newRoomId || theRoomId.value === newRoomId)
      return;
    const item = contactMap.value[newRoomId];
    if (!item)
      return;
    theRoomId.value = newRoomId;
    await setContact(item);
  };

  // 向下/向上切换房间
  const onDownUpChangeRoom = useThrottleFn(async (type: "down" | "up") => {
    const currentIndex = getContactList.value.findIndex(p => p.roomId === theRoomId.value);
    const targetIndex = type === "down" ? currentIndex + 1 : currentIndex - 1;
    const targetRoom = getContactList.value[targetIndex];
    if (targetRoom?.roomId)
      await onChangeRoom(targetRoom.roomId);
  }, 100);

  // 删除会话（本地）
  async function removeContact(roomId: number) {
    if (roomId && roomId === theRoomId.value)
      await setContact();
    delete contactMap.value[roomId];
    isOpenContact.value = true;
  }

  // 主动删除会话（不影响接收）
  function deleteContactConfirm(roomId: number, successCallBack?: () => void) {
    ElMessageBox.confirm("是否删除该聊天（非聊天记录）？", {
      title: "提示",
      center: true,
      type: "warning",
      confirmButtonText: "删除",
      confirmButtonLoadingIcon: defaultLoadingIcon,
      confirmButtonClass: "el-button--danger",
      cancelButtonText: "取消",
      lockScroll: false,
      callback: async (action: string) => {
        if (action === "confirm") {
          const res = await deleteContact(roomId, user.getToken);
          if (res.code === StatusCode.SUCCESS) {
            removeContact(roomId);
            successCallBack && successCallBack();
          }
        }
      },
    });
  }

  // 置顶
  async function setPinContact(roomId: number, isPin: isTrue, callBack?: (contact?: Partial<ChatContactVO>) => void) {
    const res = await pinContact(roomId, isPin, user.getToken);
    if (res.code === StatusCode.SUCCESS && res.data) {
      resolvePinContact(res.data);
      callBack && callBack(contactMap.value[roomId]);
    }
    return isPin;
  }

  // 免打扰
  async function setShieldContact(roomId: number, shield: number, callBack?: (contact?: Partial<ChatContactVO>) => void) {
    const res = await shieldContact(roomId, shield, user.getToken);
    if (res.code === StatusCode.SUCCESS && res.data) {
      resolveUpdateContactInfo(res.data);
      callBack && callBack(contactMap.value[roomId]);
    }
    return shield;
  }

  // 从人或群发起聊天并跳转
  async function toContactSendMsg(type: "roomId" | "userId", id: string | number) {
    const setting = useSettingStore();
    let contact: ChatContactDetailVO | null = null;
    if (type === "userId") {
      const res = await getSelfContactInfoByFriendUid(id as string, user.getToken);
      if (!res)
        return;
      contact = res.data;
      if (res.code === StatusCode.DELETE_NOEXIST_ERR) {
        ElMessage.closeAll("error");
        const newRes = await restoreSelfContact(id as string, user.getToken);
        if (newRes.code !== StatusCode.SUCCESS)
          return;
        contact = newRes.data;
      }
    }
    else if (type === "roomId") {
      const res = await getChatContactInfo(id as number, user.getToken, RoomType.GROUP);
      if (!res)
        return;
      if (!res.data) {
        ElMessage.closeAll("error");
        const newRes = await restoreGroupContact(id as number, user.getToken);
        if (newRes.code !== StatusCode.SUCCESS)
          return;
        contact = newRes.data;
      }
      else {
        contact = (res.data || contactMap.value[id as number]) as ChatContactDetailVO;
      }
    }
    await nextTick();
    if (contact) {
      await setContact(contact);
    }
    await nextTick();
    await navigateTo({ path: "/" });
    if (setting.isMobileSize) {
      setTheFriendOpt(FriendOptType.Empty);
      isOpenContact.value = false;
    }
  }

  // 联系人面板管理
  const theFriendOpt = ref<TheFriendOpt>({ type: -1, data: {} });
  function setTheFriendOpt(type: FriendOptType, data?: any) {
    theFriendOpt.value = { type, data };
  }
  const showTheFriendPanel = computed({
    get: () => theFriendOpt.value.type !== FriendOptType.Empty,
    set: (val) => {
      if (!val)
        setTheFriendOpt(FriendOptType.Empty);
    },
  }) as Ref<boolean>;

  // 重置
  function resetContacts() {
    searchKeyWords.value = "";
    isOpenContact.value = true;
    theRoomId.value = undefined;
    contactMap.value = {} as any;
    theFriendOpt.value = { type: -1, data: {} };
    showTheFriendPanel.value = false;
    applyUnReadCount.value = 0 as any;
  }

  return {
    // state
    searchKeyWords,
    isOpenContact,
    theRoomId,
    contactMap,
    theContact,
    isAIRoom,
    isGroupRoom,
    isFriendRoom,
    getContactList,
    unReadContactList,
    isNewMsg,
    applyUnReadCount,
    totalUnreadCount,
    theFriendOpt,
    showTheFriendPanel,

    // methods
    refreshContact,
    reloadBaseContact,
    setContact,
    reloadContact,
    updateContact,
    onChangeRoom,
    onDownUpChangeRoom,
    removeContact,
    deleteContactConfirm,
    setPinContact,
    setShieldContact,
    toContactSendMsg,
    setTheFriendOpt,
    resetContacts,
  };
}


