import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { acceptHMRUpdate, defineStore } from "pinia";
import { useMessageQueue } from "../hooks/msg/useMessageQueue";

const CONTACT_CACHE_TIME = 5 * 60 * 1000; // 5分钟

export interface PlaySounder {
  state?: "play" | "pause" | "stop" | "loading" | "error"
  url?: string
  msgId?: number
  currentSecond?: number
  duration?: number
  audio?: HTMLAudioElement
}

export interface PageInfo { cursor?: string, isLast: boolean, size: number }
export interface RoomChacheData { pageInfo: PageInfo; userList: ChatMemberVO[], isReload: boolean, cacheTime: number, isLoading: boolean }
export interface ChatContactExtra extends ChatContactDetailVO {
  msgMap: Record<number, ChatMessageVO>, // 消息对象，key为消息ID
  msgIds: number[], // 消息ID数组，用于保持顺序
  unreadMsgList?: ChatMessageVO[]
  pageInfo: Partial<PageInfo>,
  isReload: boolean
  isLoading: boolean
  isSyncing?: boolean
  targetUid?: string
  saveTime?: number
  scrollTopSize?: number
  lastSortedIndex?: number // 记录上次排序的位置，用于增量排序优化
}
// @unocss-include
export const defaultLoadingIcon = `<svg xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 24 24"><g fill="none" fill-rule="evenodd"><path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z"/><path fill="currentColor" d="M12 4.5a7.5 7.5 0 1 0 0 15a7.5 7.5 0 0 0 0-15M1.5 12C1.5 6.201 6.201 1.5 12 1.5S22.5 6.201 22.5 12S17.799 22.5 12 22.5S1.5 17.799 1.5 12" opacity=".1"/><path fill="currentColor" d="M12 4.5a7.46 7.46 0 0 0-5.187 2.083a1.5 1.5 0 0 1-2.075-2.166A10.46 10.46 0 0 1 12 1.5a1.5 1.5 0 0 1 0 3"/></g></svg>`;
// @unocss-include
// https://pinia.web3doc.top/ssr/nuxt.html#%E5%AE%89%E8%A3%85
export const useChatStore = defineStore(
  CHAT_STORE_KEY,
  () => {
    /** ---------------------------- 发送消息 ---------------------------- */
    const msgForm = ref<ChatMessageDTO>({
      roomId: -1,
      msgType: MessageType.TEXT, // 默认
      content: undefined,
      body: {
      },
    });

    /** ---------------------------- 扩展打开 ---------------------------- */
    const showExtension = ref(false);
    const pageTransition = ref<{
      name?: string
      mode?: "in-out" | "out-in"
      duration?: number
    }>({
      name: "",
      duration: 200,
    });
    /** ---------------------------- 撤回的消息map ---------------------------- */
    const recallMsgMap = ref<Record<number, ChatMessageVO>>({});

    /** ---------------------------- 好友 ---------------------------- */
    const applyUnReadCount = useLocalStorage(() => `applyUnReadCount_${useUserStore().userId}`, 0); // 申请未读数

    /** ---------------------------- 会话 ---------------------------- */
    const searchKeyWords = ref("");
    const isOpenContact = ref(true); // 用于移动尺寸
    const theRoomId = ref<number | undefined>(undefined); // 当前会话id
    const contactMap = ref<Record<number, ChatContactExtra>>({});
    const theContact = computed<Partial<ChatContactExtra>>(() => theRoomId.value ? (contactMap.value?.[theRoomId.value] || {}) : {});
    const isAIRoom = computed(() => theContact.value.type === RoomType.AICHAT);
    const isGroupRoom = computed(() => theContact.value.type === RoomType.GROUP);
    const isFriendRoom = computed(() => theContact.value.type === RoomType.SELFT);
    const sortedContacts = computed(() => Object.values(contactMap.value).sort((a, b) => {
      const pinDiff = (b.pinTime || 0) - (a.pinTime || 0);
      if (pinDiff !== 0)
        return pinDiff;
      return b.activeTime - a.activeTime;
    }));

    const getContactList = computed(() => {
      if (searchKeyWords.value) {
        const lowerCaseSearchKey = searchKeyWords.value.toLowerCase();
        return sortedContacts.value.filter(item =>
          item.name.toLowerCase().includes(lowerCaseSearchKey),
        );
      }
      return sortedContacts.value;
    });
    const unReadContactList = computed(() => {
      const list = sortedContacts.value.filter(p => p.unreadCount && p.shieldStatus !== isTrue.TRUE);
      localStorage.setItem("unReadContactList", JSON.stringify(list));
      return list;
    });
    const isNewMsg = computed(() => unReadContactList.value.length > 0 || applyUnReadCount.value > 0);
    const isVisible = ref(false); // 是否可见
    const shouldAutoScroll = ref(false); // 是否自动滚动
    const isScrollBottom = ref(false); // 是否滚动到底部
    const playSounder = ref<PlaySounder>({
      state: "stop",
      url: "",
      msgId: 0,
      currentSecond: 0,
      duration: 0,
      audio: undefined,
    });

    // store
    const ws = useWsStore();
    const user = useUserStore();
    const updateContactList = ref<{ [key: number]: boolean }>({});
    // 消息列表滚动
    const scrollBottom = (animate = true) => {
      mitter.emit(MittEventType.MSG_LIST_SCROLL, {
        type: "scrollBottom",
        payload: { animate },
      });
    };

    /** ---------------------------- 消息队列 ---------------------------- */
    // 使用新的消息队列hook
    const {
      messageQueue,
      isProcessingQueue,
      isExsist: isExsistQueue,
      get: getMsgQueue,
      addToMessageQueue,
      resolveQueueItem,
      processMessageQueue,
      retryMessage,
      deleteUnSendMessage,
      clearMessageQueue,
      msgBuilder,
    } = useMessageQueue();
    const unReadCount = computed(() => unReadContactList.value.reduce((acc, cur) => acc + cur.unreadCount, 0));

    // 监听消息队列事件
    mitter.off(MittEventType.MESSAGE_QUEUE);
    mitter.on(MittEventType.MESSAGE_QUEUE, ({ type, payload }) => {
      const { msg, queueItem } = payload || {};
      if (type === "add" && msg) { // 添加消息
        if (theRoomId.value && theRoomId.value === msg.message.roomId) {
          appendMsg(msg);
          nextTick(() => scrollBottom?.(false));
        }
      }
      else if (type === "success" && msg) { // 更新临时消息为服务器返回的消息
        if (queueItem && queueItem.id) {
          // 如果有临时ID，查找并替换临时消息
          const roomId = msg.message.roomId;
          if (queueItem.id && roomId) {
            const contact = contactMap.value[roomId];
            if (contact && contact.msgMap[queueItem.id]) {
              // 更新消息
              contact.msgMap[queueItem.id] = msg as ChatMessageVO;
            }
          }
          // 消息阅读上报（延迟）
          if (msg.message.roomId) {
            setReadRoom(msg.message.roomId, true);
          }
          appendMsg(msg); // 保证顺序
        }
      }
      else if (type === "delete") { // 消息删除
      //   if (!queueItem?.id) return;
      //   // 删除消息
      //   const roomId = queueItem.formData.roomId;
      //   if (roomId) {
      //       const contact = contactMap.value[roomId];
      //       if (contact && contact.msgMap[queueItem.id]) {
      //         // 删除消息
      //         delete contact.msgMap[queueItem.id];
      //       }
      //     }
      }
    });

    /* ------------------------------------------- 房间操作 ------------------------------------------- */
    // 房间
    const onChangeRoom = async (newRoomId: number) => {
      if (!newRoomId || theRoomId.value === newRoomId)
        return;
      const item = contactMap.value[newRoomId];
      if (!item)
        return;
      theRoomId.value = newRoomId;
      await setContact(item); // 提前设置当前会话
    };

    /* ------------------------------------------- 群聊成员操作 ------------------------------------------- */
    const atMemberRoomMap = ref<Record<number, { time: number, uidList: string[], userMap: Record<string, AtChatMemberOption> }>>({}); // 房间号: {}
    const isOpenGroupMember = ref(false); // 是否打开 群聊成员菜单列表
    const roomMapCache = ref<Record<string, RoomChacheData>>({}); // 缓存当前房间的成员列表
    const currentRoomCache = computed(() => {
      if (theRoomId.value !== undefined) {
        return roomMapCache.value[theRoomId.value] || {
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
    const currentMemberList = computed<ChatMemberVO[]>({ // 缓存当前房间的成员列表
      get: () => currentRoomCache.value?.userList || [],
      set: (newUserList) => {
        if (!theRoomId.value) {
          return;
        }
        if (!roomMapCache.value[theRoomId.value]) {
          roomMapCache.value[theRoomId.value] = {
            pageInfo: { cursor: undefined, isLast: false, size: 20 } as PageInfo,
            userList: newUserList,
            isReload: false,
            isLoading: false,
            cacheTime: Date.now(),
          };
        }
        else {
          // @ts-expect-error
          roomMapCache.value[theRoomId.value].newUserList = newUserList;
        }
      },
    });
    const isMemberLoading = computed({
      get: () => !!currentRoomCache?.value?.isLoading,
      set: (val) => {
        if (theRoomId.value && roomMapCache.value?.[theRoomId.value])
          roomMapCache.value[theRoomId.value]!.isLoading = val;
      },
    });
    const isMemberReload = computed({
      get: () => !!currentRoomCache?.value?.isReload,
      set: (val) => {
        if (theRoomId.value && roomMapCache.value?.[theRoomId.value])
          roomMapCache.value[theRoomId.value]!.isReload = val;
      },
    });
    const memberPageInfo = computed({ // 缓存当前房间的分页信息
      get: () => currentRoomCache.value?.pageInfo || { cursor: undefined, isLast: false, size: 20 } as PageInfo,
      set: (newPageInfo) => {
        if (!theRoomId.value) {
          return;
        }
        if (!roomMapCache.value[theRoomId.value]) {
          roomMapCache.value[theRoomId.value] = {
            pageInfo: newPageInfo as PageInfo,
            userList: [],
            isReload: false,
            isLoading: false,
            cacheTime: Date.now(),
          };
          return;
        }
        roomMapCache.value[theRoomId.value]!.pageInfo = newPageInfo;
      },
    });
    const roomGroupPageInfo = ref({
      cursor: null as null | string,
      isLast: false,
      size: 15,
    });
    // 邀请或添加群成员
    const inviteMemberForm = ref<{
      show: boolean,
      roomId: number | undefined,
      uidList: string[]
    }>({
      show: false,
      roomId: undefined,
      uidList: [] as string[],
    });
    function inviteMemberFormReset() {
      inviteMemberForm.value = {
        show: false,
        roomId: undefined,
        uidList: [],
      };
    }

    // 成员变动消息
    watchDebounced(() => ws.wsMsgList?.memberMsg?.length, watchMemberChange, {
      immediate: false,
    });
    async function watchMemberChange(len: number) {
      if (!len)
        return;
      // 成员变动消息
      for (const p of ws.wsMsgList.memberMsg) {
        const roomId = p.roomId;
        if (p.changeType === WSMemberStatusEnum.JOIN) { // 新加入
          if (contactMap.value[roomId] || p.uid !== user.userId) {
            // 本地大群获取物料插入
            const exsitUser = roomMapCache.value[1]?.userList.find(item => item.userId === p.uid);
            if (exsitUser && roomMapCache.value[1]) {
              roomMapCache.value[1].userList.unshift(exsitUser);
              return;
            }
            mitter.emit(MittEventType.RELOAD_MEMBER_LIST, {
              type: "reload",
              payload: {
                roomId,
                userId: p.uid,
              },
            });
            return;
          }
          setTimeout(() => { // 创建会话有一定延迟
            // 如果会话已经存在就不请求
            const roomId = p.roomId;
            if (contactMap.value[roomId])
              return;
            getChatContactInfo(roomId, user.getToken, RoomType.GROUP)?.then((res) => {
              if (res) {
                const item = contactMap.value[roomId];
                refreshContact(res.data, contactMap.value[roomId]); // 更新
                if (!item) { // 新被邀请
                  res.data.unreadCount = 1;
                  // unshift();
                }
              }
            }).finally(() => {
            });
          }, 300);
        }
        else if (p.changeType === WSMemberStatusEnum.LEAVE) {
          if (user.userId === p.uid) { // 自己被退出
            if (!contactMap.value[roomId])
              return;
            contactMap.value[roomId]!.selfExist = isTrue.FALESE;
            // await removeContact(roomId);
            return;
          }
          if (!roomMapCache.value[roomId]?.userList) {
            return;
          }
          // 别人退出
          const index = roomMapCache.value[roomId]!.userList.findIndex(item => item.userId === p.uid);
          if (index !== -1) {
            roomMapCache.value[roomId]!.userList.splice(index, 1);
          }
        }
        else if (p.changeType === WSMemberStatusEnum.DEL) {
          // 删除会话
          await removeContact(roomId);
        }
      }
      ws.wsMsgList.memberMsg.splice(0);
    }

    /* ------------------------------------------- 会话操作 ------------------------------------------- */
    function refreshContact(vo: ChatContactVO, oldVo?: ChatContactExtra) {
      if (!vo.roomId) {
        console.warn("refreshContact error: roomId is undefined");
        return;
      }
      contactMap.value[vo.roomId] = {
        ...(oldVo // 详情
          || {
            msgMap: {},
            msgIds: [],
            unreadMsgList: [],
            isReload: false,
            isLoading: false,
            pageInfo: { cursor: undefined, isLast: false, size: 20 } as PageInfo,
          }),
        ...vo, // 基础信息
      };
    }
    async function reloadBaseContact(roomId: number, roomType: RoomType) {
      if (!roomId) {
        console.warn("reloadBaseContact error: roomId is undefined");
        return false;
      }
      const res = await getChatContactInfo(roomId, user.getToken, roomType)?.catch(() => {});
      if (res && res.code === StatusCode.SUCCESS) {
        // 保存现有消息数据
        const { msgMap = {}, msgIds = [] } = contactMap.value[roomId] || {};

        contactMap.value[roomId] = {
          ...contactMap.value[roomId], // 覆盖基础信息
          ...(res?.data || {}), // 请求
          msgMap,
          msgIds,
          unreadMsgList: contactMap.value?.[roomId]?.unreadMsgList || [],
          isReload: contactMap.value?.[roomId]?.isReload || false,
          isLoading: contactMap.value?.[roomId]?.isLoading || false,
          pageInfo: contactMap.value?.[roomId]?.pageInfo || { cursor: undefined, isLast: false, size: 20 } as PageInfo,
        };
      }
    }
    // 改变会话
    async function setContact(vo?: ChatContactVO) {
      if (!vo || !vo.roomId) {
        theRoomId.value = undefined;
        return;
      }
      // vo.unreadCount = 0;
      contactMap.value[vo.roomId] = {
        ...contactMap.value[vo.roomId], // 覆盖基础信息
        ...(vo || {}),
        // 消息列表
        msgMap: contactMap.value?.[vo.roomId]?.msgMap || {},
        msgIds: contactMap.value?.[vo.roomId]?.msgIds || [],
        unreadMsgList: contactMap.value?.[vo.roomId]?.unreadMsgList || [],
        isReload: contactMap.value?.[vo.roomId]?.isReload || false,
        isLoading: contactMap.value?.[vo.roomId]?.isLoading || false,
        pageInfo: contactMap.value?.[vo.roomId]?.pageInfo || { cursor: undefined, isLast: false, size: 20 } as PageInfo,
      };
      // 补充会话详情 (5分钟更新一次)
      const lastSaveTime = contactMap.value?.[vo.roomId]?.saveTime;
      theRoomId.value = vo.roomId;
      if (lastSaveTime && ((Date.now() - lastSaveTime) < CONTACT_CACHE_TIME)) {
        return;
      }
      const res = await getChatContactInfo(vo.roomId, user.getToken, vo.type)?.catch(() => {});
      if (res && res.code === StatusCode.SUCCESS) {
        // 保存现有消息数据
        const { msgMap = {}, msgIds = [] } = contactMap.value[vo.roomId] || {};

        contactMap.value[vo.roomId] = {
          ...contactMap.value[vo.roomId], // 覆盖基础信息
          ...(res?.data || {}), // 请求
          msgMap,
          msgIds,
          unreadMsgList: contactMap.value?.[vo.roomId]?.unreadMsgList || [],
          isReload: contactMap.value?.[vo.roomId]?.isReload || false,
          isLoading: contactMap.value?.[vo.roomId]?.isLoading || false,
          pageInfo: contactMap.value?.[vo.roomId]?.pageInfo || { cursor: undefined, isLast: false, size: 20 } as PageInfo,
        };
      }
    }
    // 重新拉取会话
    async function reloadContact(roomId: number, callBack?: (contact: ChatContactDetailVO) => void) {
      try {
        const res = await getChatContactInfo(roomId, user.getToken);
        if (!res) {
          throw new Error("reloadContact error: res is undefined");
        }
        if (res.code !== StatusCode.SUCCESS) {
          ElMessage.closeAll("error");
          console.error(res.message);
          return;
        }
        refreshContact(res.data, contactMap.value[roomId]); // 更新
        callBack && callBack(res.data as ChatContactDetailVO);
      }
      catch (e) {
        ElMessage.closeAll("error");
      }
      finally {
        delete updateContactList.value[roomId];
      }
    }
    // 更新会话消息
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
        delete updateContactList.value[roomId]; // 删除正在修改的load
      }
      else {
        reloadContact(roomId);
      }
    }
    /**
     * 发送消息
     * @param type 发送类型
     * @param id 发送对象id
     */
    async function toContactSendMsg(type: "roomId" | "userId", id: string | number) {
      const user = useUserStore();
      const setting = useSettingStore();
      let contact: ChatContactDetailVO | null = null;
      if (type === "userId") {
        const res = await getSelfContactInfoByFriendUid(id as string, user.getToken);
        if (!res)
          return;
        contact = res.data;
        if (res.code === StatusCode.DELETE_NOEXIST_ERR) { // 发送消息拉取会话
          ElMessage.closeAll("error");
          // 记录已删除，重新拉取会话
          const newRes = await restoreSelfContact(id as string, user.getToken);
          if (newRes.code !== StatusCode.SUCCESS) {
            return;
          }
          contact = newRes.data;
        }
      }
      else if (type === "roomId") {
        const res = await getChatContactInfo(id as number, user.getToken, RoomType.GROUP);
        if (!res)
          return;
        if (!res.data) { // 发送消息拉取会话
          ElMessage.closeAll("error");
          // 记录已删除，重新拉取会话
          const newRes = await restoreGroupContact(id as number, user.getToken);
          if (newRes.code !== StatusCode.SUCCESS) {
            return;
          }
          contact = newRes.data;
        }
        else {
          contact = (res.data || contactMap.value[id as number]) as ChatContactDetailVO;
        }
      }
      if (contact) {
        await setContact(contact);
      }
      if (setting.isMobileSize) { // 移动尺寸 - 清空模板 + 打开聊天页面
        setTheFriendOpt(FriendOptType.Empty);
        isOpenContact.value = false;
      }
      await nextTick();
      await navigateTo({
        path: "/",
      });
    }

    // 删除会话
    async function removeContact(roomId: number) {
      if (roomId && roomId === theRoomId.value)
        await setContact();
      delete contactMap.value[roomId];
      // 成员列表删除
      delete roomMapCache.value[roomId];
      // 重新显示会话
      isOpenContact.value = true;
    }
    /**
     * 主动删除会话（不影响接收）
     * @param roomId 房间id
     * @param successCallBack
     */
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
    /**
     * 设置置顶会话
     * @param roomId 房间id
     * @param isPin 是否置顶
     * @param callBack 回调
     */
    async function setPinContact(roomId: number, isPin: isTrue, callBack?: (contact?: Partial<ChatContactVO>) => void) {
      const res = await pinContact(roomId, isPin, user.getToken);
      if (res.code === StatusCode.SUCCESS && res.data) {
        resolvePinContact(res.data);
        callBack && callBack(contactMap.value[roomId]);
      }
      return isPin;
    }

    /**
     * 设置更新会话
     * @param roomId 房间id
     * @param shield 免打扰状态
     * @param callBack 回调
     */
    async function setShieldContact(roomId: number, shield: number, callBack?: (contact?: Partial<ChatContactVO>) => void) {
      const res = await shieldContact(roomId, shield, user.getToken);
      if (res.code === StatusCode.SUCCESS && res.data) {
        resolveUpdateContactInfo(res.data);
        callBack && callBack(contactMap.value[roomId]);
      }
      return shield;
    }


    /* ------------------------------------------- 消息操作 ------------------------------------------- */
    // 添加消息到列表
    function appendMsg(data: ChatMessageVO) {
      const roomId = data.message.roomId;
      const msgId = data.message.id;

      // 确保消息存在且有效
      if (!roomId || !msgId) {
        return;
      }
      const contact = contactMap.value[roomId];
      if (!contact) {
        return;
      }
      const clientId = data?.clientId as any;
      const sendMsg = findMsg(roomId, clientId as any);
      if (sendMsg) {
        const sendIndex = contact.msgIds.findIndex(id => id === clientId);
        contact.msgIds.splice(sendIndex, 1, msgId);
        delete contact.msgMap[clientId];
        contact.msgMap[msgId] = data;
        return;
      }
      // const index = contact.msgIds.findIndex(id => id === msgId);
      if (!contact.msgMap[msgId]) {
        contact.msgIds.push(msgId);
      }
      // 添加|更新消息
      contact.msgMap[msgId] = data;
    }

    // 查找消息
    function findMsg(roomId: number, msgId: number) {
      if (!msgId || !roomId)
        return undefined;
      return contactMap.value[roomId]?.msgMap?.[msgId];
    }

    // 添加撤回消息
    function setRecallMsg(msg: ChatMessageVO) {
      if (!msg?.message?.id)
        return false;
      recallMsgMap.value[msg.message.roomId] = JSON.parse(JSON.stringify(msg));
      return true;
    }

    const readDebounceTimers: Record<string, NodeJS.Timeout> = {};
    /**
     * 标记已读请求
     */
    async function markMsgRead(roomId: number) {
      try {
        const res = await setMsgReadByRoomId(roomId, user.getToken);
        if (res.code === StatusCode.SUCCESS && contactMap.value[roomId]) {
          contactMap.value[roomId].unreadCount = 0;
          const ctx = contactMap.value[roomId];
          if (ctx) {
            ctx.unreadCount = 0;
            ctx.unreadMsgList = [];
          }
        }
        // 消费消息
        const ws = useWsStore();
        ws.wsMsgList.newMsg = ws.wsMsgList.newMsg.filter(k => k.message.roomId !== roomId);
      }
      catch (error) {
        console.error("标记已读失败:", error);
      }
      finally {
        delete readDebounceTimers[roomId];
      }
    }
    /**
     * 设置消息已读
     */
    async function setReadRoom(roomId: number, isSender = false) {
      if (!roomId)
        return false;
      if (!await isActiveWindow()) // 窗口未激活
        return false;
      const contact = contactMap.value?.[roomId];
      if (!contactMap.value[roomId]?.unreadCount && !contact?.unreadCount && !isSender) {
        return true;
      }
      // 标记已读
      if (roomId === contact?.roomId) {
        const lastMsgId = contact.msgIds[contact.msgIds.length - 1];
        const lastMsg = lastMsgId ? contact.msgMap[lastMsgId] : undefined;
        // contact.unreadCount = 0;
        // contact.text = msg ? resolveMsgContactText(msg) : contact?.text;
        contact.unreadMsgList = [];
        contact.lastMsgId = lastMsg?.message?.id || contact?.lastMsgId;
      }
      if (readDebounceTimers[roomId])
        clearTimeout(readDebounceTimers[roomId]);
      else
        markMsgRead(roomId); // 立即标记已读
      // 标记已读请求（优化错误处理）
      readDebounceTimers[roomId] = setTimeout(() => markMsgRead(roomId), 300);
    }

    // 标记全部已读
    const clearAllUnread = () => {
      for (const key in contactMap.value) {
        if (contactMap.value[key]) {
          contactMap.value[key].unreadCount = 0;
        }
      }
    };

    /* ------------------------------------------- 群聊操作 ------------------------------------------- */
    /**
     * 退出群聊
     * @param roomId 房间id
     * @param isTheGroupOwner 是否是群主
     * @param successCallBack 回调
     */
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

    /** ---------------------------- 页面状态 ---------------------------- */
    async function isActiveWindow(): Promise<boolean> {
      const setting = useSettingStore();
      if (setting.isWeb) { // web端
        isVisible.value = document?.visibilityState === "visible";
        return isVisible.value;
      }
      else if (setting.isDesktop) { // 桌面端
        const win = WebviewWindow.getCurrent();
        return await win?.isFocused();
      }
      else { // 移动端 TODO:待定
        return true;
      }
    }


    // 页面绑定
    const scrollReplyMsg = (msgId: number, gapCount: number = 0, isAnimated: boolean = true) => {
      mitter.emit(MittEventType.MSG_LIST_SCROLL, {
        type: "scrollReplyMsg",
        payload: { msgId, gapCount, isAnimated },
      });
    };
    const saveScrollTop = () => {
      mitter.emit(MittEventType.MSG_LIST_SCROLL, {
        type: "saveScrollTop",
        payload: {},
      });
    };
    const scrollTop = (size: number) => {
      mitter.emit(MittEventType.MSG_LIST_SCROLL, {
        type: "scrollTop",
        payload: { size },
      });
    };

    // 向下/向上切换房间
    const onDownUpChangeRoom = useThrottleFn(async (type: "down" | "up") => {
      const currentIndex = getContactList.value.findIndex(p => p.roomId === theRoomId.value);
      // 根据方向切换房间
      const targetIndex = type === "down" ? currentIndex + 1 : currentIndex - 1;
      const targetRoom = getContactList.value[targetIndex];

      if (targetRoom?.roomId) {
        await onChangeRoom(targetRoom.roomId);
      }
    }, 100);

    /** --------------------------- 艾特AT人 --------------------------- */
    const atUserList = ref<Partial<AtChatMemberOption>[]>([]);
    // 设置@AT人
    function setAtUid(userId: string) {
      if (!userId || atUserList.value.find(p => p.userId === userId))
        return;
      mitter.emit(MittEventType.CHAT_AT_USER, {
        type: "add",
        payload: userId,
      });
    }
    // 移除@人
    function removeAtByUsername(username?: string) {
      if (!username)
        return;
      atUserList.value = atUserList.value.filter(p => p.username !== username);
    }
    /** --------------------------- / 机器人 --------------------------- */
    const askAiRobotList = ref<AskAiRobotOption[]>([]);
    // 设置/机器人
    function setAskAiUid(userId: string) {
      if (!userId || atUserList.value.find(p => p.userId === userId))
        return;
      mitter.emit(MittEventType.CAHT_ASK_AI_ROBOT, {
        type: "add",
        payload: userId,
      });
    }
    // 移除机器人
    function removeAskAiByUsername(username?: string) {
      if (!username)
        return;
      askAiRobotList.value = askAiRobotList.value.filter(p => p.username !== username);
    }

    /** --------------------------- 回复消息 --------------------------- */
    const replyMsg = ref<Partial<ChatMessageVO>>();
    // 回复消息
    function setReplyMsg(item: Partial<ChatMessageVO>) {
      replyMsg.value = item;
    }

    /** ------------------------------------------- 联系人面板管理 ------------------------------------------- */
    const theFriendOpt = ref<TheFriendOpt>({
      type: -1,
      data: {},
    });
    function setTheFriendOpt(type: FriendOptType, data?: any) {
      theFriendOpt.value = {
        type,
        data,
      };
    }
    const showTheFriendPanel = computed({
      get: () => theFriendOpt.value.type !== FriendOptType.Empty,
      set: (val) => {
        if (!val) {
          setTheFriendOpt(FriendOptType.Empty);
        }
      },
    }) as Ref<boolean>;
    // 退出群聊操作
    function setDelGroupId(roomId: number | undefined) {
      if (!roomId)
        return;
      mitter.emit(MittEventType.GROUP_CONTRONLLER, {
        type: "delete",
        payload: {
          roomId,
        },
      });
    }
    const showVideoDialog = ref(false);
    const notDialogShow = computed({ // 是否有dialog已经打开
      get: () => !showVideoDialog.value && !showExtension.value && !showVideoDialog.value && !useImageViewer.state.visible,
      set: (val: boolean) => {
        if (!val) {
          showVideoDialog.value = false;
          showVideoDialog.value = false;
          showExtension.value = false;
          showVideoDialog.value = false;
          useImageViewer.close();
        }
      },
    });

    /** ---------------------------- RTC通话 ---------------------------- */
    const showRtcCall = ref(false);
    const confirmRtcFn = ref({
      confirmCall: () => { },
      rejectCall: () => { },
    });
    const rtcCallType = ref<CallTypeEnum | undefined>(undefined);
    const webRtc = useWebRTC((type, { confirmCall, rejectCall }) => {
      rtcCallType.value = type;
      showRtcCall.value = true;
      confirmRtcFn.value = { confirmCall, rejectCall };
    });
    // 打开通话
    async function openRtcCall(roomId: number, type: CallTypeEnum, confirmOption?: { message?: string, title?: string }) {
      if (!roomId || !type)
        return;
      if (showRtcCall.value) {
        ElMessage.warning("通话中，请勿重复发起 ~");
        return;
      }
      const {
        message = "是否确认发起通话？",
        title = type === CallTypeEnum.AUDIO ? "语音通话" : "视频通话",
      } = confirmOption || {};
      if (theContact.value?.type === RoomType.GROUP) {
        ElMessage.warning("群聊无法进行通话！");
        return;
      }
      ElMessageBox.confirm(message, {
        title,
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        center: true,
      }).then(async (action) => {
        if (action !== "confirm" || !type) {
          return;
        }
        rtcCallType.value = type;
        await nextTick();
        // 查询是否在通话中
        const resp = await getChatRTCMessage(roomId, user.getToken);
        if (resp.code === StatusCode.SUCCESS && resp.status) { // 正在通话中
          const chat = useChatStore();
          showRtcCall.value = false;
          return false;
        }
        const res = await webRtc.startCall(roomId, type, undefined);
        if (res === false)
          showRtcCall.value = false;
        else
          showRtcCall.value = true;
      }).catch((e) => {
        console.warn(e);
      });
    }
    // 重新回滚通话
    async function rollbackCall(roomId: number, type: CallTypeEnum, msg?: ChatMessageVO) {
      openRtcCall(roomId, type, { message: "是否确认重新拨打？" });
    }
    function useChatWebRTC() {
      return webRtc;
    }


    /** ------------------------------------------- 重置 ------------------------------------------- */
    function resetStore() {
      contactMap.value = {};
      showExtension.value = false;
      isOpenContact.value = true;
      roomGroupPageInfo.value = {
        cursor: null,
        isLast: false,
        size: 15,
      };
      // onOfflineList.value = [];
      playSounder.value = {
        state: "stop",
        url: "",
        msgId: 0,
        currentSecond: 0,
        duration: 0,
        audio: undefined,
      };
      msgForm.value = {
        roomId: -1,
        msgType: MessageType.TEXT, // 默认
        content: undefined,
        body: {
        },
      };
      replyMsg.value = undefined;
      atUserList.value = [];
      askAiRobotList.value = [];
      theFriendOpt.value = {
        type: -1,
        data: {},
      };
      showTheFriendPanel.value = false;
      shouldAutoScroll.value = false;
      isScrollBottom.value = false;
      isVisible.value = false;
      saveScrollTop();

      // 群成员
      memberPageInfo.value = {
        cursor: undefined,
        isLast: false,
        size: 20,
      };
      isOpenGroupMember.value = true; // 是否打开 群聊成员菜单列表
      roomMapCache.value = {};
      currentMemberList.value = [];
      isMemberLoading.value = false;
      isMemberReload.value = false;
      contactMap.value = {};
      currentMemberList.value = [];
      updateContactList.value = {};
      inviteMemberFormReset();
      isMemberLoading.value = false;
      isMemberReload.value = false;
    }

    /* ------------------------------------------- 新的消息存储结构迁移 ------------------------------------------- */
    /**
     * 获取消息列表
     * 兼容旧的msgList结构
     */
    function getMessageList(roomId?: number): ChatMessageVO[] {
      if (!roomId || !contactMap.value[roomId]) {
        return [];
      }

      const contact = contactMap.value[roomId];
      const msgIds = contact.msgIds;
      const currentLength = msgIds.length;
      const lastSortedIndex = contact.lastSortedIndex || 0;

      if (currentLength > lastSortedIndex) {
        // 使用原生 sort，性能更好
        msgIds.sort((a, b) => a - b);
        contact.lastSortedIndex = currentLength;
        console.log("触发排序");
      }

      // 映射到消息内容并排除不存在的数据
      return msgIds.map(id => contact.msgMap[id]) as ChatMessageVO[];
    }


    return {
      // state
      msgForm,
      atMemberRoomMap,
      rtcCallType,
      showRtcCall,
      showExtension,
      pageTransition,
      recallMsgMap,
      contactMap,
      isNewMsg,
      unReadContactList,
      searchKeyWords,
      getContactList,
      theRoomId,
      theContact,
      isAIRoom,
      isGroupRoom,
      isFriendRoom,
      replyMsg,
      atUserList,
      isOpenGroupMember,
      askAiRobotList,
      setAskAiUid,
      removeAskAiByUsername,
      theFriendOpt,
      showTheFriendPanel,
      isOpenContact,
      shouldAutoScroll,
      isScrollBottom,
      showVideoDialog,
      notDialogShow,
      roomGroupPageInfo,
      playSounder,
      isVisible,

      // 消息队列相关
      unReadCount,
      messageQueue,
      isProcessingQueue,
      isExsistQueue,
      resolveQueueItem,
      getMsgQueue,
      addToMessageQueue,
      processMessageQueue,
      retryMessage,
      deleteUnSendMessage,
      clearMessageQueue,
      msgBuilder,

      // 群成员
      memberPageInfo,
      currentRoomCache,
      currentMemberList,
      isMemberLoading,
      isMemberReload,
      inviteMemberForm,
      roomMapCache,
      // 申请
      applyUnReadCount,
      // 方法
      inviteMemberFormReset,
      refreshContact,
      reloadBaseContact,
      setContact,
      updateContact,
      reloadContact,
      setRecallMsg,
      findMsg,
      removeContact,
      toContactSendMsg,
      deleteContactConfirm,
      exitGroupConfirm,
      setReadRoom,
      clearAllUnread,
      setAtUid,
      removeAtByUsername,
      setReplyMsg,
      setDelGroupId,
      setTheFriendOpt,
      resetStore,
      openRtcCall,
      rollbackCall,
      useChatWebRTC,
      setPinContact,
      setShieldContact,
      appendMsg,
      confirmRtcFn,
      getMessageList,
      // dom
      scrollReplyMsg,
      saveScrollTop,
      scrollTop,
      scrollBottom,
      onChangeRoom,
      onDownUpChangeRoom,
    };
  },
  {
    // https://prazdevs.github.io/pinia-plugin-persistedstate/frameworks/nuxt-3.html
    persist: false,
    // persist: {
    //   storage: persistedState.localStorage,
    // },
  },
);
if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useChatStore, import.meta.hot));


