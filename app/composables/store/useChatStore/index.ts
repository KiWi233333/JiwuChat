import { defineStore } from "pinia";
import { useMessageQueue } from "../../hooks/msg/useMessageQueue";
import { createComposeInputModule, createContactListsModule, createContactsModule, createMessagesModule, createRtcModule, createUIModule } from "./hooks";

export interface PlaySounder {
  state?: "play" | "pause" | "stop" | "loading" | "error"
  url?: string
  msgId?: number
  currentSecond?: number
  duration?: number
  audio?: HTMLAudioElement
}
// @unocss-include
// https://pinia.web3doc.top/ssr/nuxt.html#%E5%AE%89%E8%A3%85
export const useChatStore = defineStore(
  CHAT_STORE_KEY,
  () => {
    /** ---------------------------- 发送消息 ---------------------------- */
    // 组合式模块改造
    const theRoomId = ref<number | undefined>(undefined);
    const contactMap = ref<Record<number, ChatContactExtra>>({});
    const ui = createUIModule();
    const compose = createComposeInputModule();
    const contacts = createContactsModule({ contactMap, theRoomId });
    const messages = createMessagesModule({ contactMap });
    const members = createMembersModule({ theRoomId, contactMap, refreshContact: (vo, oldVo) => contacts.refreshContact(vo, oldVo) });
    const rtc = createRtcModule();
    const lists = createContactListsModule();
    const user = useUserStore();

    const roomGroupPageInfo = ref({ cursor: null as null | string, isLast: false, size: 15 });
    const playSounder = ref<PlaySounder>({ state: "stop", url: "", msgId: 0, currentSecond: 0, duration: 0, audio: undefined });

    // 消息队列
    const { messageQueue, isProcessingQueue, isExsist: isExsistQueue, get: getMsgQueue, addToMessageQueue, resolveQueueItem, processMessageQueue, retryMessage, deleteUnSendMessage, clearMessageQueue, msgBuilder } = useMessageQueue();
    const unReadCount = computed(() => contacts.unReadContactList.value.reduce((acc, cur) => acc + cur.unreadCount, 0));

    // 消息表情反应事件
    mitter.on(MittEventType.MSG_REACTION, (data) => {
      if (!data?.msgId || !data?.roomId)
        return;
      // WS 推送的 isCurrentUser 始终为 false，需自行判断
      const userId = user?.userInfo?.id;
      if (userId && data.reactions) {
        for (const r of data.reactions) {
          r.isCurrentUser = r.userIds.includes(userId);
        }
      }
      messages.updateMsgReactions(data.roomId, data.msgId, data.reactions);
    });

    // 消息队列事件
    mitter.on(MittEventType.MESSAGE_QUEUE, ({ type, payload }) => {
      const { msg, queueItem } = payload || {};
      if (type === "add" && msg) {
        if (theRoomId.value && theRoomId.value === msg.message.roomId) {
          messages.appendMsg(msg);
          nextTick(() => ui.scrollBottom?.(false));
        }
      }
      else if (type === "success" && msg) {
        if (queueItem && queueItem.id) {
          const roomId = msg.message.roomId;
          if (queueItem.id && roomId) {
            const contact = contactMap.value[roomId];
            if (contact && contact.msgMap[queueItem.id]) {
              contact.msgMap[queueItem.id] = msg as ChatMessageVO;
            }
          }
          if (msg.message.roomId) {
            messages.setReadRoom(msg.message.roomId, true);
          }
          messages.appendMsg(msg);
        }
      }
    });

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

    /**
     * 打开邀请成员弹窗（先校验邀请权限，无权限时提示并不打开）
     * @param roomId 群房间 id
     * @param uidList 预填 uid 列表，默认 []
     */
    async function openInviteMemberForm(roomId: number, uidList: string[] = []) {
      const can = await contacts.canInviteMember(roomId);
      if (!can) {
        ElMessage.warning("您暂无邀请成员权限");
        return;
      }
      members.inviteMemberForm.value = { show: true, roomId, uidList };
    }

    /** ------------------------------------------- 重置 ------------------------------------------- */
    function resetStore() {
      contacts.resetContacts();
      ui.resetUI();
      rtc.resetRtc();
      members.resetMembers();
      compose.resetCompose();
      messages.isVisible.value = false;
      roomGroupPageInfo.value = { cursor: null, isLast: false, size: 15 } as any;
      playSounder.value = { state: "stop", url: "", msgId: 0, currentSecond: 0, duration: 0, audio: undefined };
    }

    return {
      /** ---------------------------- 基础/会话状态 ---------------------------- */
      theRoomId,
      contactMap,
      theContact: contacts.theContact,
      isAIRoom: contacts.isAIRoom,
      isGroupRoom: contacts.isGroupRoom,
      isFriendRoom: contacts.isFriendRoom,
      searchKeyWords: contacts.searchKeyWords,
      getContactList: contacts.getContactList,
      unReadContactList: contacts.unReadContactList,
      isNewMsg: contacts.isNewMsg,
      applyUnReadCount: contacts.applyUnReadCount,
      unReadCount,

      /** ---------------------------- 输入与草稿 ---------------------------- */
      msgForm: compose.msgForm,
      replyMsg: compose.replyMsg,
      setReplyMsg: compose.setReplyMsg,

      /** ---------------------------- 艾特与机器人 ---------------------------- */
      atUserList: compose.atUserList,
      setAtUid: compose.setAtUid,
      removeAtByUsername: compose.removeAtByUsername,
      askAiRobotList: compose.askAiRobotList,
      setAskAiUid: compose.setAskAiUid,
      removeAskAiByUsername: compose.removeAskAiByUsername,

      /** ---------------------------- 群成员 ---------------------------- */
      isOpenGroupMember: members.isOpenGroupMember,
      atMemberRoomMap: members.atMemberRoomMap,
      memberPageInfo: members.memberPageInfo,
      currentRoomCache: members.currentRoomCache,
      currentMemberList: members.currentMemberList,
      isMemberLoading: members.isMemberLoading,
      isMemberReload: members.isMemberReload,
      inviteMemberForm: members.inviteMemberForm,
      inviteMemberFormReset: members.inviteMemberFormReset,
      roomMapCache: members.roomMapCache,
      groupMemberMap: members.groupMemberMap,
      exitGroupConfirm: members.exitGroupConfirm,

      /** ---------------------------- 联系人与会话操作 ---------------------------- */
      isOpenContact: contacts.isOpenContact,
      setContact: contacts.setContact,
      refreshContact: contacts.refreshContact,
      reloadBaseContact: contacts.reloadBaseContact,
      reloadContact: contacts.reloadContact,
      updateContact: contacts.updateContact,
      toContactSendMsg: contacts.toContactSendMsg,
      deleteContactConfirm: contacts.deleteContactConfirm,
      removeContact: contacts.removeContact,
      setPinContact: contacts.setPinContact,
      setShieldContact: contacts.setShieldContact,
      ensureRoomDetailForGroup: contacts.ensureRoomDetailForGroup,
      canInviteMember: contacts.canInviteMember,
      openInviteMemberForm,
      theFriendOpt,
      showTheFriendPanel,
      setTheFriendOpt,
      setDelGroupId,

      /** ---------------------------- 消息相关 ---------------------------- */
      recallMsgMap: messages.recallMsgMap,
      appendMsg: messages.appendMsg,
      findMsg: messages.findMsg,
      setRecallMsg: messages.setRecallMsg,
      getMessageList: messages.getMessageList,
      setReadRoom: messages.setReadRoom,
      clearAllUnread: messages.clearAllUnread,
      isVisible: messages.isVisible,
      updateMsgReactions: messages.updateMsgReactions,

      /** ---------------------------- 消息队列 ---------------------------- */
      messageQueue,
      isProcessingQueue,
      isExsistQueue,
      getMsgQueue,
      addToMessageQueue,
      resolveQueueItem,
      processMessageQueue,
      retryMessage,
      deleteUnSendMessage,
      clearMessageQueue,
      msgBuilder,

      /** ---------------------------- 好友/群组列表管理器 ---------------------------- */
      friendManager: lists.friendManager,
      groupManager: lists.groupManager,

      /** ---------------------------- UI/滚动/对话框 ---------------------------- */
      showExtension: ui.showExtension,
      pageTransition: ui.pageTransition,
      showVideoDialog: ui.showVideoDialog,
      shouldAutoScroll: ui.shouldAutoScroll,
      isScrollBottom: ui.isScrollBottom,
      scrollReplyMsg: ui.scrollReplyMsg,
      saveScrollTop: ui.saveScrollTop,
      scrollTop: ui.scrollTop,
      scrollBottom: ui.scrollBottom,

      /** ---------------------------- RTC 通话 ---------------------------- */
      showRtcCall: rtc.showRtcCall,
      rtcCallType: rtc.rtcCallType,
      openRtcCall: rtc.openRtcCall,
      rollbackCall: rtc.rollbackCall,
      useChatWebRTC: rtc.useChatWebRTC,
      confirmRtcFn: rtc.confirmRtcFn,

      /** ---------------------------- 其他 ---------------------------- */
      roomGroupPageInfo,
      playSounder,
      onChangeRoom: contacts.onChangeRoom,
      onDownUpChangeRoom: contacts.onDownUpChangeRoom,
      resetStore,
    };
  },
  {},
);
