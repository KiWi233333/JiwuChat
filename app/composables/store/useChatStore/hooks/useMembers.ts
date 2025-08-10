
export interface MembersContext {
  theRoomId: Ref<number | undefined>
  contactMap: Ref<Record<number, ChatContactExtra>>
  refreshContact?: (vo: ChatContactVO, oldVo?: ChatContactExtra) => void
}
/**
 * 群成员与群相关操作
 * @param ctx 上下文
 * @returns 群成员与群相关操作
 */
export function createMembersModule(ctx: MembersContext) {
  const user = useUserStore();
  const ws = useWsStore();

  // 房间 -> 成员缓存
  const roomMapCache = ref<Record<string, RoomChacheData>>({});
  const currentRoomCache = computed(() => {
    if (ctx.theRoomId.value !== undefined) {
      return roomMapCache.value[ctx.theRoomId.value] || {
        pageInfo: { cursor: undefined, isLast: false, size: 20 } as PageInfo,
        userList: [],
        isReload: false,
        isLoading: false,
        cacheTime: Date.now(),
      };
    }
    else {
      return {
        pageInfo: { cursor: undefined, isLast: false, size: 20 } as PageInfo,
        userList: [],
        isReload: false,
        isLoading: false,
        cacheTime: Date.now(),
      };
    }
  });

  const currentMemberList = computed<ChatMemberVO[]>({
    get: () => currentRoomCache.value?.userList || [],
    set: (newUserList) => {
      if (!ctx.theRoomId.value)
        return;
      if (!roomMapCache.value[ctx.theRoomId.value]) {
        roomMapCache.value[ctx.theRoomId.value] = {
          pageInfo: { cursor: undefined, isLast: false, size: 20 } as PageInfo,
          userList: newUserList,
          isReload: false,
          isLoading: false,
          cacheTime: Date.now(),
        };
      }
      else {
        // @ts-expect-error
        roomMapCache.value[ctx.theRoomId.value].newUserList = newUserList;
      }
    },
  });

  const isMemberLoading = computed({
    get: () => !!currentRoomCache?.value?.isLoading,
    set: (val) => {
      if (ctx.theRoomId.value && roomMapCache.value?.[ctx.theRoomId.value])
        roomMapCache.value[ctx.theRoomId.value]!.isLoading = val;
    },
  });
  const isMemberReload = computed({
    get: () => !!currentRoomCache?.value?.isReload,
    set: (val) => {
      if (ctx.theRoomId.value && roomMapCache.value?.[ctx.theRoomId.value])
        roomMapCache.value[ctx.theRoomId.value]!.isReload = val;
    },
  });

  const memberPageInfo = computed({
    get: () => currentRoomCache.value?.pageInfo || { cursor: undefined, isLast: false, size: 20 } as PageInfo,
    set: (newPageInfo) => {
      if (!ctx.theRoomId.value)
        return;
      if (!roomMapCache.value[ctx.theRoomId.value]) {
        roomMapCache.value[ctx.theRoomId.value] = {
          pageInfo: newPageInfo as PageInfo,
          userList: [],
          isReload: false,
          isLoading: false,
          cacheTime: Date.now(),
        };
        return;
      }
      roomMapCache.value[ctx.theRoomId.value]!.pageInfo = newPageInfo;
    },
  });

  const atMemberRoomMap = ref<Record<number, { time: number, uidList: string[], userMap: Record<string, AtChatMemberOption> }>>({});
  const isOpenGroupMember = ref(false);
  const groupMemberMap = shallowRef<Record<string, ChatMemberSeVO>>({});

  // 邀请或添加群成员
  const inviteMemberForm = ref<{ show: boolean, roomId: number | undefined, uidList: string[] }>({ show: false, roomId: undefined, uidList: [] });
  function inviteMemberFormReset() {
    inviteMemberForm.value = { show: false, roomId: undefined, uidList: [] };
  }

  // 成员变动消息
  watchDebounced(() => ws.wsMsgList?.memberMsg?.length, watchMemberChange, { immediate: false });
  async function watchMemberChange(len: number) {
    if (!len)
      return;
    for (const p of ws.wsMsgList.memberMsg) {
      const roomId = p.roomId;
      if (p.changeType === WSMemberStatusEnum.JOIN) {
        if (ctx.contactMap.value[roomId] || p.uid !== user.userId) {
          const exsitUser = roomMapCache.value[1]?.userList.find(item => item.userId === p.uid);
          if (exsitUser && roomMapCache.value[1]) {
            roomMapCache.value[1].userList.unshift(exsitUser);
            return;
          }
          mitter.emit(MittEventType.RELOAD_MEMBER_LIST, { type: "reload", payload: { roomId, userId: p.uid } });
          return;
        }
        setTimeout(() => {
          if (ctx.contactMap.value[roomId])
            return;
          getChatContactInfo(roomId, user.getToken, RoomType.GROUP)?.then((res) => {
            if (res) {
              const item = ctx.contactMap.value[roomId];
              ctx.refreshContact?.(res.data, ctx.contactMap.value[roomId]);
              if (!item)
                res.data.unreadCount = 1;
            }
          });
        }, 300);
      }
      else if (p.changeType === WSMemberStatusEnum.LEAVE) {
        if (user.userId === p.uid) {
          if (!ctx.contactMap.value[roomId])
            return;
          ctx.contactMap.value[roomId]!.selfExist = isTrue.FALESE;
          return;
        }
        if (!roomMapCache.value[roomId]?.userList)
          return;
        const index = roomMapCache.value[roomId]!.userList.findIndex(item => item.userId === p.uid);
        if (index !== -1)
          roomMapCache.value[roomId]!.userList.splice(index, 1);
      }
      else if (p.changeType === WSMemberStatusEnum.DEL) {
        await removeRoomCache(roomId);
      }
    }
    ws.wsMsgList.memberMsg.splice(0);
  }

  async function removeRoomCache(roomId: number) {
    delete roomMapCache.value[roomId];
  }

  // 退出或解散群
  function exitGroupConfirm(roomId?: number, isTheGroupOwner: boolean = false, successCallBack?: () => void) {
    if (!roomId)
      return;
    ElMessageBox.confirm(isTheGroupOwner ? "是否解散该群聊？" : "是否退出该群聊？", {
      title: "提示",
      center: true,
      type: "warning",
      confirmButtonText: isTheGroupOwner ? "解散" : "退出",
      confirmButtonLoadingIcon: defaultLoadingIcon,
      confirmButtonClass: "el-button--danger",
      cancelButtonText: "取消",
      lockScroll: false,
      callback: async (action: string) => {
        if (action === "confirm") {
          const res = await exitRoomGroup(roomId, user.getToken);
          if (res.code === StatusCode.SUCCESS) {
            ElMessage.success(isTheGroupOwner ? "群聊已解散！" : "退出群聊成功！");
            successCallBack && successCallBack();
          }
        }
      },
    });
  }

  function resetMembers() {
    atMemberRoomMap.value = {} as any;
    isOpenGroupMember.value = true;
    roomMapCache.value = {} as any;
    currentMemberList.value = [];
    isMemberLoading.value = false as any;
    isMemberReload.value = false as any;
    inviteMemberFormReset();
    groupMemberMap.value = {} as any;
  }

  return {
    // state
    atMemberRoomMap,
    isOpenGroupMember,
    roomMapCache,
    currentRoomCache,
    currentMemberList,
    isMemberLoading,
    isMemberReload,
    memberPageInfo,
    inviteMemberForm,
    groupMemberMap,

    // methods
    inviteMemberFormReset,
    exitGroupConfirm,
    removeRoomCache,
    resetMembers,
  };
}


