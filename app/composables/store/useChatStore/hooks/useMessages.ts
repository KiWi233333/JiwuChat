import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

export interface MessagesContext {
  contactMap: Ref<Record<number, ChatContactExtra>>
}
/**
 * 消息相关逻辑：新增、查找、撤回、已读与可见性
 * @param ctx 上下文
 * @returns 消息相关逻辑
 */
export function createMessagesModule(ctx: MessagesContext) {
  const contactMap = ctx.contactMap;
  const recallMsgMap = ref<Record<number, ChatMessageVO>>({});
  const isVisible = ref(false);

  // 添加消息到列表
  function appendMsg(data: ChatMessageVO) {
    const roomId = data.message.roomId;
    const msgId = data.message.id;
    if (!roomId || !msgId)
      return;
    const contact = contactMap.value[roomId];
    if (!contact)
      return;
    const clientId = data?.clientId as any;
    const sendMsg = findMsg(roomId, clientId as any);
    if (sendMsg) {
      const sendIndex = contact.msgIds.findIndex(id => id === clientId);
      contact.msgIds.splice(sendIndex, 1, msgId);
      delete contact.msgMap[clientId];
      contact.msgMap[msgId] = data;
      return;
    }
    if (!contact.msgMap[msgId])
      contact.msgIds.push(msgId);
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

  // 页面可见/激活
  async function isActiveWindow(): Promise<boolean> {
    const setting = useSettingStore();
    if (setting.isWeb) {
      isVisible.value = document?.visibilityState === "visible";
      return isVisible.value;
    }
    else if (setting.isDesktop) {
      const win = WebviewWindow.getCurrent();
      return await win?.isFocused();
    }
    else {
      return true;
    }
  }

  // 标记已读请求
  const readDebounceTimers: Record<string, NodeJS.Timeout> = {};
  async function markMsgRead(roomId: number) {
    try {
      const user = useUserStore();
      const res = await setMsgReadByRoomId(roomId, user.getToken);
      if (res.code === StatusCode.SUCCESS && contactMap.value[roomId]) {
        contactMap.value[roomId].unreadCount = 0;
        const ctx = contactMap.value[roomId];
        if (ctx) {
          ctx.unreadCount = 0;
          ctx.unreadMsgList = [];
        }
      }
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

  // 设置消息已读
  async function setReadRoom(roomId: number, isSender = false) {
    if (!roomId)
      return false;
    if (!await isActiveWindow())
      return false;
    const contact = contactMap.value?.[roomId];
    if (!contactMap.value[roomId]?.unreadCount && !contact?.unreadCount && !isSender)
      return true;

    const oldUnreadCount = contact?.unreadCount || 0;
    const oldUnreadMsgList = contact?.unreadMsgList ? [...contact.unreadMsgList] : [];

    if (roomId === contact?.roomId) {
      const lastMsgId = contact.msgIds[contact.msgIds.length - 1];
      const lastMsg = lastMsgId ? contact.msgMap[lastMsgId] : undefined;
      contact.unreadMsgList = [];
      contact.lastMsgId = lastMsg?.message?.id || contact?.lastMsgId;
      contact.unreadCount = 0;
    }

    if (readDebounceTimers[roomId]) {
      clearTimeout(readDebounceTimers[roomId]);
    }
    else {
      markMsgRead(roomId).catch(() => {
        if (contact) {
          contact.unreadCount = oldUnreadCount;
          contact.unreadMsgList = oldUnreadMsgList;
        }
      });
    }
    readDebounceTimers[roomId] = setTimeout(() => {
      markMsgRead(roomId).catch(() => {
        if (contact) {
          contact.unreadCount = oldUnreadCount;
          contact.unreadMsgList = oldUnreadMsgList;
        }
      });
    }, 300);
  }

  // 标记全部已读
  const clearAllUnread = () => {
    for (const key in contactMap.value) {
      if (contactMap.value[key]) {
        contactMap.value[key].unreadCount = 0;
      }
    }
  };

  // 获取消息列表（按需排序缓存）
  function getMessageList(roomId?: number): ChatMessageVO[] {
    if (!roomId || !contactMap.value[roomId])
      return [];
    const contact = contactMap.value[roomId];
    const msgIds = contact.msgIds;
    const currentLength = msgIds.length;
    const lastSortedIndex = contact.lastSortedIndex || 0;
    if (currentLength > lastSortedIndex) {
      msgIds.sort((a, b) => a - b);
      contact.lastSortedIndex = currentLength;
    }
    return msgIds.map(id => contact.msgMap[id]) as ChatMessageVO[];
  }

  return {
    recallMsgMap,
    isVisible,
    appendMsg,
    findMsg,
    setRecallMsg,
    setReadRoom,
    clearAllUnread,
    getMessageList,
  };
}


