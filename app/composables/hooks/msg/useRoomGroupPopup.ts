import ContextMenu from "@imengyu/vue3-context-menu";
import { mitter, MittEventType } from "~/composables/utils/useMitt";


export function useRoomGroupPopup(opt: { editFormField: Ref<string>, }) {
  const { editFormField } = opt;

  // store
  const ws = useWsStore();
  const user = useUserStore();
  const chat = useChatStore();
  const setting = useSettingStore();


  // state
  const theUser = ref<ChatMemberVO>(); // 添加好友
  const showSearch = ref(false);
  const searchUserWord = ref("");
  // 计算
  const isTheGroupOwner = computed(() => chat.theContact?.member?.role === ChatRoomRoleEnum.OWNER);
  const isTheGroupPermission = computed(() => chat.theContact?.member?.role === ChatRoomRoleEnum.OWNER || chat.theContact?.member?.role === ChatRoomRoleEnum.ADMIN); // 是否有权限（踢出群聊、）

  const memberList = computed(() => {
    const str = searchUserWord.value.trim();
    const list = (chat.currentMemberList || []);
    if (str) {
      return list.filter(user => !!user?.nickName?.toLocaleLowerCase()?.includes(str));
    }
    return list.sort((a, b) => b.activeStatus - a.activeStatus);
  });

  const isNotExistOrNorFriend = computed(() => chat.theContact?.selfExist === isTrue.FALESE); // 自己不存在 或 不是好友  || chat.contactMap?.[chat.theRoomId!]?.isFriend === 0
  const theContactClone = ref<Partial<ChatContactDetailVO>>();
  const isLord = computed(() => chat.theContact.member?.role === ChatRoomRoleEnum.OWNER);
  const isLoading = computed(() => chat.roomMapCache[chat.theRoomId!]?.isLoading);
  const isReload = computed(() => chat.roomMapCache[chat.theRoomId!]?.isReload);
  const isLast = computed(() => chat.memberPageInfo.isLast);
  const isEmpty = computed(() => chat.currentMemberList?.length === 0);

  // 文本
  const TextMap = {
    name: "群名称",
    notice: "群公告",
    avatar: "群头像",
  };

  // 群头像
  const inputOssFileUploadRef = ref();
  const imgList = ref<OssFile[]>([]);
  function onSubmitImages(url: string) {
    if (url)
      submitUpdateRoom("avatar", url);
  }
  async function toggleImage() {
    if (!isLord.value) {
      ElMessage.warning("暂无权限！");
      return;
    }
    if (imgList.value.length > 0) {
      imgList.value = [];
      return;
    }
    await inputOssFileUploadRef.value?.resetInput();
  }

  /**
   * 修改群聊详情
   * @param field 修改字段
   * @param val 修改的值
   */
  async function submitUpdateRoom(field: "name" | "avatar" | "notice", val: string | undefined | null = "") {
    if (field === "name" && val && val.trim().length <= 0)
      return ElMessage.warning("请输入内容！");
    // 没有变化则不触发修改

    if ((field === "name" && chat.theContact?.[field] === val) || (field === "notice" && chat?.theContact?.roomGroup?.detail?.notice === val)) {
      editFormField.value = "";
      return;
    }
    const data = field === "notice"
      ? {
          detail: {
            [field]: val?.trim(),
          },
        }
      : {
          [field]: val?.trim(),
        } as UpdateRoomGroupDTO;

    ElMessageBox.confirm(`是否确认修改${TextMap[field]}？`, {
      title: TextMap[field] || "提示",
      center: true,
      confirmButtonText: "确认",
      cancelButtonText: "取消",
      confirmButtonClass: "el-button-primary",
      lockScroll: false,
      callback: async (action: string) => {
        if (action === "confirm") {
          const res = await updateGroupRoomInfo(chat.theRoomId!, data, user.getToken);
          if (res.code === StatusCode.SUCCESS && res.data === 1) {
          // 更新会话
            const item = chat.contactMap[chat.theRoomId!];
            if (field === "name") {
              if (item)
                item.name = val?.trim() as string;
              chat.theContact.name = val?.trim() as string;
            }
            else if (field === "avatar") {
              if (item)
                item.avatar = val?.trim() as string;
              chat.theContact.avatar = val?.trim() as string;
            }
            else if (field === "notice") {
              if (!chat.theContact?.roomGroup)
                return;
              if (!chat.theContact.roomGroup.detail)
                chat.theContact.roomGroup.detail = {};
              chat.theContact.roomGroup.detail.notice = val?.trim() as string;
            }
            editFormField.value = "";
          }
        }
        else {
          const data = JSON.parse(JSON.stringify(chat.theContact)) as ChatContactDetailVO;
          if (data.roomGroup && !data.roomGroup?.detail)
            data.roomGroup.detail = {};
          theContactClone.value = data;
          editFormField.value = "";
        }
      },
    });
  }

  /**
   * 加载数据
   */
  async function loadData(roomId?: number) {
    roomId = roomId || chat.theRoomId!;
    if (chat?.roomMapCache?.[roomId]?.isLoading || chat.roomMapCache[roomId]?.isReload || chat.memberPageInfo.isLast || chat.theContact.type !== RoomType.GROUP)
      return;
    chat.roomMapCache[roomId]!.isLoading = true;
    const { data } = await getRoomGroupUserPage(roomId, chat.roomMapCache[roomId]?.pageInfo.size || 20, chat.roomMapCache[roomId]?.pageInfo.cursor || undefined, user.getToken);
    chat.memberPageInfo.isLast = data.isLast;
    chat.memberPageInfo.cursor = data.cursor || undefined;
    if (data && data.list) {
      chat?.roomMapCache?.[roomId]!.userList.push(...data.list);
    }
    await nextTick();
    chat.roomMapCache[roomId]!.isLoading = false;
  }

  /**
   * 重新加载
   * @param roomId 房间id
   */
  async function reload(roomId?: number) {
    roomId = roomId || chat.theRoomId!;
    if (chat.roomMapCache[roomId]?.isLoading || chat.roomMapCache[roomId]?.isReload || chat.theContact.type !== RoomType.GROUP)
      return;
    chat.roomMapCache[roomId] = {
      isLoading: false,
      isReload: false,
      cacheTime: Date.now(),
      pageInfo: {
        cursor: undefined,
        isLast: false,
        size: 20,
      },
      userList: [],
    };
    // 动画
    try {
      chat.roomMapCache[roomId]!.isLoading = true;
      chat.roomMapCache[roomId]!.isReload = true;
      const { data } = await getRoomGroupUserPage(roomId, chat.roomMapCache[roomId]?.pageInfo.size || 20, chat.roomMapCache[roomId]?.pageInfo.cursor || undefined, user.getToken);
      if (roomId !== chat.theRoomId!) {
        return;
      }
      chat.memberPageInfo.isLast = data.isLast;
      chat.memberPageInfo.cursor = data.cursor || undefined;
      if (data && data.list) {
        chat?.roomMapCache?.[roomId]!.userList.push(...data.list);
      }
      chat.roomMapCache[roomId]!.isLoading = false;
      // isReload 状态也应该在 try 块的末尾更新，确保无论成功与否都重置
      chat.roomMapCache[roomId]!.isReload = false;
    }
    finally {
      await nextTick();
      if (chat.roomMapCache[roomId]) {
        chat.roomMapCache[roomId]!.isLoading = false;
        chat.roomMapCache[roomId]!.isReload = false;
      }
    }
  }


  /**
   * 切换管理员角色
   * @param dto 参数
   * @param type 转化类型
   */
  function toggleAdminRole(dto: ChatRoomAdminAddDTO, type: ChatRoomRoleEnum) {
    const isAdmin = type === ChatRoomRoleEnum.ADMIN;
    ElMessageBox.confirm(`是否将该用户${isAdmin ? "设为" : "取消"}管理员？`, {
      title: "提示",
      center: true,
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      lockScroll: false,
      callback: async (action: string) => {
        if (action === "confirm") {
          const fn = isAdmin ? addChatRoomAdmin : delChatRoomAdmin;
          const res = await fn(dto, user.getToken);
          if (res.code === StatusCode.SUCCESS) {
            ElMessage.success("操作成功！");
            // 更新缓存中的角色信息
            const index = chat.currentMemberList.findIndex(p => p.userId === dto.userId);
            if (index !== -1 && chat.currentMemberList[index])
              chat.currentMemberList[index].roleType = type;
          }
        }
      },
    });
  }

  /**
   * 上下线消息
   */
  watchThrottled(() => ws.wsMsgList.onlineNotice, (list: WSOnlineOfflineNotify[] = []) => {
  // 上下线消息
    list.forEach((p) => {
      if (!p.changeList)
        return;
      for (const item of (chat.roomMapCache?.[chat.theRoomId!]?.userList || [])) {
        for (const k of p.changeList) {
          if (k.userId === item.userId) {
            item.activeStatus = k.activeStatus;
            const find = chat.currentMemberList?.find(p => p.userId === item.userId);
            if (find)
              find.activeStatus = k.activeStatus; // 更新缓存中的状态
            break;
          }
        }
      }
    });
  }, {
    deep: true,
    immediate: true,
  });

  watch(() => chat.theContact, (val) => {
    if (!val)
      return;
    const data = JSON.parse(JSON.stringify(val)) as ChatContactDetailVO;
    if (data.roomGroup && !data.roomGroup?.detail)
      data.roomGroup.detail = {};
    theContactClone.value = data;
  }, { deep: true, immediate: true });

  watch(() => chat?.theContact?.avatar, (val) => {
    if (val) {
      imgList.value = [{
        id: BaseUrlImg + val,
        key: val,
        file: {} as File,
        percent: 100,
        status: "success",
      }];
    }
    else { imgList.value = []; }
  }, { deep: true, immediate: true });

  // 监听房间变化
  watch(() => chat.theRoomId, async (newRoomId) => {
    if (!newRoomId) {
      return;
    }
    searchUserWord.value = "";
    await nextTick();

    if (!newRoomId) {
      return;
    }
    // 检查缓存之前，确保视图已重置
    if (chat.roomMapCache[newRoomId]?.cacheTime && Date.now() - chat.roomMapCache[newRoomId]?.cacheTime < 300000) { // 缓存5分钟
      return;
    }
    await reload(newRoomId);
  }, {
    immediate: true,
  });

  function onExitOrClearGroup() {
    if (isNotExistOrNorFriend.value) {
    // 不显示聊天
      chat.deleteContactConfirm(chat.theRoomId!, () => {
      });
      return;
    }
    chat.exitGroupConfirm(chat.theRoomId!, isTheGroupOwner.value, () => {
      chat.removeContact(chat.theRoomId!);
    });
  }


  onMounted(() => {
    // 整个生命周期不能解除
    mitter.on(MittEventType.RELOAD_MEMBER_LIST, async ({ type, payload: { roomId, userId } }) => {
      if (chat.roomMapCache[roomId] === undefined) {
        return;
      }
      await reload(roomId);
    });
  });

  onBeforeUnmount(() => {
    mitter.off(MittEventType.RELOAD_MEMBER_LIST);
  });


  /**
   * 右键菜单
   * @param e 右键对象
   * @param item 用户
   */
  function onMemberContextMenu(e: MouseEvent, item: ChatMemberVO) {
    e.preventDefault();

    const isSelf = user.userInfo.id === item.userId;
    const roomId = chat.theRoomId!;

    ContextMenu.showContextMenu({
      x: e.x,
      y: e.y,
      zIndex: 3000, // 高于遮罩层
      theme: setting.contextMenuTheme,
      items: [
        {
          label: "@ 他",
          customClass: "group",
          hidden: isSelf,
          onClick: () => {
            chat.setAtUid(item.userId);
          },
        },
        {
          label: "添加好友",
          customClass: "group",
          icon: "group-hover:scale-110 transition-transform i-solar:user-plus-broken btn-info",
          hidden: isSelf,
          onClick: () => {
            isChatFriend({ uidList: [item.userId] }, user.getToken).then((res) => {
              if (res.code !== StatusCode.SUCCESS) {
                return ElMessage.error(res.msg || "申请失败，请稍后再试！");
              }
              const userFriend = res.data.checkedList.find((p: FriendCheck) => p.uid === item.userId);
              if (userFriend && userFriend.isFriend) {
                return ElMessage.warning("申请失败，和对方已是好友！");
              }
              theUser.value = item;
              // 使用mitt触发事件
              mitter.emit(MittEventType.FRIEND_APPLY_DIALOG, {
                show: true,
                userId: item.userId,
              });
            }).catch(() => {
              ElMessage.error("操作失败，请稍后再试！");
            });
          },
        },
        {
          icon: "group-hover:scale-110 transition-transform btn-info i-solar:user-bold ",
          label: "联系他",
          customClass: "group",
          hidden: isSelf,
          onClick: () => navigateToUserDetail(item.userId),
        },
        {
          label: "管理员",
          customClass: "group",
          icon: "group-hover:scale-110 transition-transform i-solar:shield-user-bold-duotone btn-warning",
          hidden: isSelf || !isTheGroupOwner.value,
          children: [
            {
              label: "添加",
              customClass: "group",
              hidden: item.roleType === ChatRoomRoleEnum.ADMIN,
              icon: "group-hover:scale-110 transition-transform i-carbon:add-large btn-info",
              onClick: () => {
                toggleAdminRole({
                  userId: item.userId,
                  roomId: chat.theRoomId!,
                }, ChatRoomRoleEnum.ADMIN);
              },
            },
            {
              label: "移除",
              customClass: "group",
              icon: "group-hover:scale-110 transition-transform i-solar:add-circle-linear btn-info",
              hidden: !item.roleType || item.roleType !== ChatRoomRoleEnum.ADMIN,
              onClick: () => {
                toggleAdminRole({
                  userId: item.userId,
                  roomId: chat.theRoomId!,
                }, ChatRoomRoleEnum.MEMBER);
              },
            },
          ],
        },
        {
          label: "其他",
          customClass: "group",
          children: [
            {
              label: "分享",
              customClass: "group",
              icon: "group-hover:scale-110 transition-transform i-solar:share-line-duotone",
              onClick: async () => {
                const res = await useAsyncCopyText(`${window.location.origin}/user/info?id=${item.userId}`);
                ElMessage.success({
                  message: "成功复制至剪贴板！",
                  grouping: true,
                });
                const { isSupported, share } = useShare();
              },
            },
          ],
        },
        {
          label: "踢出群聊",
          customClass: "group",
          icon: "group-hover:scale-110 transition-transform i-solar:logout-3-broken",
          divided: "up",
          hidden: isSelf || !isTheGroupPermission.value,
          onClick: () => {
            ElMessageBox.confirm("是否将该用户踢出群聊？", {
              title: "提示",
              center: true,
              confirmButtonText: "踢出",
              cancelButtonText: "取消",
              confirmButtonClass: "btn-error",
              lockScroll: false,
              callback: async (action: string) => {
                if (action === "confirm") {
                  const res = await exitRoomGroupByUid(roomId, item.userId, user.getToken);
                  if (res.code === StatusCode.SUCCESS) {
                    ElMessage.success("踢出成功！");
                    if (!chat.roomMapCache[roomId]) {
                      return;
                    }
                    chat.roomMapCache[roomId].userList = chat.roomMapCache[roomId].userList.filter(e => e.userId !== item.userId);
                  }
                }
              },
            });
          },
        },
      ],
    });
  }

  return {
    showSearch,
    isTheGroupOwner,
    isNotExistOrNorFriend,
    theContactClone,
    searchUserWord,
    imgList,
    isLord,
    theUser,
    memberList,
    inputOssFileUploadRef,
    isLoading,
    isReload,
    isTheGroupPermission,
    reload,
    onSubmitImages,
    toggleImage,
    submitUpdateRoom,
    loadData,
    scrollTo,
    onMemberContextMenu,
    onExitOrClearGroup,
  };
}


/**
 * 删除好友
 *
 * @param userId 用户id
 * @param token token
 */
export function deleteFriendConfirm(userId: string, token: string, roomId?: number, callback?: (number?: isTrue) => void) {
  ElMessageBox.confirm("是否删除该好友，对应聊天会话也会被删除？", {
    title: "删除提示",
    type: "warning",
    customClass: "text-center",
    confirmButtonText: "删除",
    confirmButtonClass: "el-button--danger",
    center: true,
    cancelButtonText: "取消",
    lockScroll: false,
    callback: async (action: string) => {
      if (action === "confirm") {
        const contactInfoRes = !roomId ? await getSelfContactInfoByFriendUid(userId, token) : undefined;
        const res = await deleteFriendById(userId, token);
        const chat = useChatStore();
        if (res.code === StatusCode.SUCCESS) {
          // 记录删除 + 删除对应会话
          mitter.emit(MittEventType.FRIEND_CONTROLLER, {
            type: "delete",
            payload: { userId },
          });
          if (contactInfoRes?.code === StatusCode.SUCCESS) {
            chat.removeContact(contactInfoRes.data.roomId); // 清除对应会话
          }
          else {
            return ElMessage.closeAll("error");
          }
        }
        callback && callback(res.data);
      }
    },
  });
};
