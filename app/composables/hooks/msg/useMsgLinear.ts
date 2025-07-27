export function useMsgLinear() {
  function addListeners() {
    // 1、新消息 type=1
    mitter.on(MittEventType.MESSAGE, (data: ChatMessageVO) => {
      resolveNewMsg(data);
    });
    // 2、撤回消息 type=2
    mitter.on(MittEventType.RECALL, (data: WSMsgRecall) => {
      resolveRecallMsg(data);
    });
    // 3、删除消息 type=3
    mitter.on(MittEventType.DELETE, (data: WSMsgDelete) => {
      resolveDeleteMsg(data);
    });
    // 4、置顶会话消息 type=10 PIN_CONTACT
    mitter.on(MittEventType.PIN_CONTACT, (data: WSPinContactMsg) => {
      resolvePinContact(data);
    });
    // 5、ai推送消息 type=11
    mitter.on(MittEventType.AI_STREAM, (data: WSAiStreamMsg) => {
      resolveAiStream(data);
    });
    // 6、会话信息更新消息 type=12 UPDATE_CONTACT_INFO
    mitter.on(MittEventType.UPDATE_CONTACT_INFO, (data: WSUpdateContactInfoMsg) => {
      resolveUpdateContactInfo(data);
    });
  }

  // 移除监听
  function removeListeners() {
    mitter.off(MittEventType.MESSAGE);
    mitter.off(MittEventType.RECALL);
    mitter.off(MittEventType.DELETE);
    mitter.off(MittEventType.PIN_CONTACT);
    mitter.off(MittEventType.AI_STREAM);
    mitter.off(MittEventType.UPDATE_CONTACT_INFO);
  }

  // 监听
  onMounted(addListeners);
  onUnmounted(removeListeners);

  return {
    removeListeners,
  };
}

/**
 * 1. 新消息处理
 */
async function resolveNewMsg(msg: ChatMessageVO) {
  // body文本
  const body = resolveMsgContactText(msg) || "";
  const setting = useSettingStore();
  const chat = useChatStore();
  const user = useUserStore();
  const ws = useWsStore();
  // 1）更新会话列表
  const targetCtx = chat.contactMap?.[msg.message.roomId];
  chat.updateContact(msg.message.roomId, {
  }, (contact) => {
    // 添加未读数量
    if (msg.fromUser.userId !== user.userInfo.id)
      contact.unreadCount += 1;
    // 修改会话显示
    contact.text = contact.type === RoomType.GROUP ? `${msg.fromUser.nickName}: ${body}` : body;
    contact.lastMsgId = msg.message.id;
    contact.activeTime = Date.now();
  });
  if (!targetCtx) {
    ws.wsMsgList.newMsg.splice(0);
    return;
  }
  const isCurrentRoom = chat.theRoomId === msg.message.roomId; // 是否是当前房间
  // 2）更新消息列表
  if (msg.message.roomId !== targetCtx.roomId || (setting.isMobileSize && !chat.isOpenContact)) {
    ws.wsMsgList.newMsg.splice(0);
  }
  else if (isCurrentRoom) { // 阅读消息
    chat.setReadRoom(targetCtx.roomId);
  }
  // 3）本房间追加消息
  if (targetCtx.pageInfo.size && targetCtx.msgIds.length) { // 存在消息列表 才追加 （避免再次加载导致消息显示重复）
    if (msg.clientId && chat.isExsistQueue(msg.clientId)) {
      chat.resolveQueueItem(msg.clientId, msg);
      return;
    }
    chat.appendMsg(msg); // 追加消息
  }

  // 本人问答的AI消息进行滚动
  if (isCurrentRoom) {
    if (msg.message.type === MessageType.AI_CHAT_REPLY) {
      (msg as ChatMessageVO<AiChatReplyBodyMsgVO>).message.body?.reply?.uid === user.userInfo.id && handleAIReplayMsg(); // 处理AI回复消息 多一步滚动
      const contact = useChatStore().contactMap[msg.message.roomId];
      contact && (contact.text = contact.type === RoomType.GROUP ? `${msg.fromUser.nickName}: 回答中...` : "AI回答中...");
    }
    msg.message.type === MessageType.RTC && handleRTCMsg((msg as any)); // 处理rtc消息 多一步滚动
  }
  ws.wsMsgList.newMsg.splice(0);
}
function handleAIReplayMsg() {
  nextTick(() => {
    useChatStore().scrollBottom(true);
  });
}

/**
 * 2. 撤回消息处理
 * @param msg 消息
 */
function resolveRecallMsg(msg: WSMsgRecall) {
  if (!msg)
    return;
  const ws = useWsStore();
  const chat = useChatStore();
  const user = useUserStore();
  // 本房间修改状态
  const oldMsg = chat.findMsg(msg.roomId, msg.msgId);
  if (oldMsg) {
    // 更新会话列表显示文本
    const msgContent = `${oldMsg.fromUser.userId === user.userInfo.id ? "我" : `"${oldMsg.fromUser.nickName}"`}撤回了一条消息`;
    const targetContact = chat.contactMap[msg.roomId];
    if (msg.msgId === targetContact?.lastMsgId) { // 最后一条消息
      targetContact.text = msgContent;
    }
    oldMsg.message.content = msgContent;
    oldMsg.message.type = MessageType.RECALL;
    oldMsg.message.body = undefined;
  }
  // 消费消息
  ws.wsMsgList.recallMsg = ws.wsMsgList.recallMsg.filter(k => k.msgId !== msg.msgId);
}
/**
 * 3. 删除消息处理
 * @param msg 消息
 */
function resolveDeleteMsg(msg: WSMsgDelete) {
  if (!msg)
    return;
  const ws = useWsStore();
  const chat = useChatStore();
  const user = useUserStore();
  const oldMsg = chat.findMsg(msg.roomId, msg.msgId);
  if (oldMsg) {
    // 更新会话显示文本
    const targetContact = chat.contactMap[msg.roomId];
    if (targetContact && msg.msgId === targetContact.lastMsgId) { // 最后一条消息
      const msgContent = `${msg.deleteUid === user.userInfo.id ? "我删除了一条消息" : `"${oldMsg.fromUser.nickName}"删除了一条成员消息`}`;
      oldMsg.message.content = msgContent;
      targetContact.text = msgContent;
    }
    // 修改旧消息
    oldMsg.message.type = MessageType.DELETE;
    oldMsg.message.body = undefined;
  }
  // 消费消息
  ws.wsMsgList.deleteMsg = ws.wsMsgList.deleteMsg.filter(k => k.msgId !== msg.msgId);
}
/**
 * 4. 置顶会话消息处理
 * @param data 数据
 */
export function resolvePinContact(data: WSPinContactMsg) {
  const chat = useChatStore();
  if (data.roomId !== chat.theRoomId!) {
    chat.reloadContact(data.roomId);
    return;
  }
  // 本房间修改状态
  if (chat.contactMap[data.roomId]) {
    chat.contactMap[data.roomId]!.pinTime = data.pinTime;
  }
  else { // 主动拉取
    chat.reloadContact(data.roomId);
  }
}
// 5. 处理rtc消息
function handleRTCMsg(msg: ChatMessageVO<RtcLiteBodyMsgVO>) {
  const rtcMsg = msg.message.body;
  if (!rtcMsg)
    return;
  const chat = useChatStore();
  const user = useUserStore();
  const targetCtx = chat.contactMap?.[msg.message.roomId];
  // 更新滚动位置
  if (targetCtx && msg.message.roomId === targetCtx.roomId && rtcMsg.senderId === user.userInfo.id) {
    nextTick(() => {
      chat.scrollBottom(true);
    });
  }
}

// 创建消息缓冲区
interface BufferItem {
  content: string
  reasoning: string
  timer: number | NodeJS.Timeout
  pendingContent: string
  pendingReasoning: string
  charIndex: number
  updateInterval: any
}
const bufferMap = new WeakMap<ChatMessageVO<AiChatReplyBodyMsgVO>, BufferItem>();

/**
 * 6. ai推送消息处理
 *
 * @param data 数据
 */
function resolveAiStream(data: WSAiStreamMsg) {
  const chat = useChatStore();
  const contact = chat.contactMap[data.roomId];
  if (!contact)
    return;

  const oldMsg = chat.findMsg(data.roomId, data.msgId) as ChatMessageVO<AiChatReplyBodyMsgVO> | undefined;

  // 统一状态更新
  if (oldMsg?.message?.body) {
    oldMsg.message.body.status = data.status;
  }

  // 处理不同状态
  switch (data.status) {
    case AiReplyStatusEnum.START:
      handleStartState(oldMsg);
      break;
    case AiReplyStatusEnum.IN_PROGRESS:
      handleProgressUpdate(data, contact, oldMsg);
      break;
    default:
      handleFinalState(data, contact, oldMsg);
  }
}
/**
 * 处理进度更新
 */
function handleProgressUpdate(
  data: WSAiStreamMsg,
  contact: ChatContactDetailVO,
  oldMsg?: ChatMessageVO<AiChatReplyBodyMsgVO>,
  count = 3,
  delay = 50,
) {
  // 初始化缓冲区
  if (oldMsg && !bufferMap.has(oldMsg)) {
    bufferMap.set(oldMsg, {
      content: oldMsg?.message?.content || "",
      reasoning: oldMsg?.message?.body?.reasoningContent || "",
      timer: 0,
      pendingContent: "",
      pendingReasoning: "",
      charIndex: 0,
      updateInterval: null,
    });
  }

  const buffer = bufferMap.get(oldMsg!)!;
  // 累积待处理内容
  buffer.pendingContent += data.content;
  buffer.pendingReasoning += data.reasoningContent || "";
  const chat = useChatStore();
  if (chat.theRoomId === data.roomId) { // 当前房间
    // 如果没有正在进行的更新，启动渐入效果
    if (chat.shouldAutoScroll) { // AI消息更新时自动滚动到底部
      chat.scrollBottom(true);
    }
    function handleAiFlowIntervalFn() {
      // 每次更新s字符
      const contentChars = buffer.pendingContent.length > 0 ? buffer.pendingContent.substring(0, count) : "";
      const reasoningChars = buffer.pendingReasoning.length > 0 ? buffer.pendingReasoning.substring(0, count) : "";

      // 添加到显示内容
      buffer.content += contentChars;
      buffer.reasoning += reasoningChars;

      // 从待处理内容中移除已处理的字符
      buffer.pendingContent = buffer.pendingContent.substring(contentChars.length);
      buffer.pendingReasoning = buffer.pendingReasoning.substring(reasoningChars.length);

      // AI消息更新时自动滚动到底部
      const chat = useChatStore();
      if (chat.shouldAutoScroll) {
        chat.scrollBottom(true);
      }

      // 应用更新
      applyBufferUpdate(oldMsg, buffer);

      // 如果没有待处理内容且收到了结束信号，清除定时器
      if (buffer.pendingContent.length === 0 && buffer.pendingReasoning.length === 0) {
        if (oldMsg?.message?.body?.status !== AiReplyStatusEnum.IN_PROGRESS) {
          clearInterval(buffer.updateInterval);
          buffer.updateInterval = null;
          oldMsg && bufferMap.delete(oldMsg);
        }
      }
    }
    // 同步一次
    handleAiFlowIntervalFn();
    if (!buffer.updateInterval) {
      buffer.updateInterval = setInterval(handleAiFlowIntervalFn, delay); // 调整速度，50ms更新s字符
    }
  }
  else {
    clearInterval(buffer.updateInterval);
    buffer.updateInterval = null;
    // 正常填充
    buffer.content += data.content;
    buffer.reasoning += data.reasoningContent || "";
    clearTimeout(buffer.timer);
    buffer.timer = setTimeout(() => {
      applyBufferUpdate(oldMsg, buffer);
    }, 1000); // 延迟1s更新
  }
}


function applyBufferUpdate(
  oldMsg?: ChatMessageVO<AiChatReplyBodyMsgVO>,
  buffer?: { content: string; reasoning: string; pendingContent?: string; pendingReasoning?: string; updateInterval?: any },
) {
  if (!buffer || !oldMsg)
    return;

  // 批量更新逻辑
  const update = {
    content: buffer.content,
    reasoning: buffer.reasoning,
  };

  // 使用 Object.assign 减少响应式触发
  if (oldMsg?.message) {
    oldMsg.message.body && (oldMsg.message.body.reasoningContent = update.reasoning);
    oldMsg.message.content = update.content;
  }
}

function handleStartState(
  oldMsg?: ChatMessageVO<AiChatReplyBodyMsgVO>,
) {
  // 初始化缓冲区
  if (oldMsg) {
    bufferMap.set(oldMsg, {
      content: "",
      reasoning: "",
      timer: 0,
      pendingContent: "",
      pendingReasoning: "",
      charIndex: 0,
      updateInterval: null,
    });
    // 更新联系人文本(AI回答中...)
    const contact = useChatStore().contactMap[oldMsg.message.roomId];
    contact && (contact.text = contact.type === RoomType.GROUP ? `${oldMsg.fromUser.nickName}: 回答中...` : "AI回答中...");
  }
}

// 直接更新
function handleFinalState(
  data: WSAiStreamMsg,
  contact: ChatContactDetailVO,
  oldMsg?: ChatMessageVO<AiChatReplyBodyMsgVO>,
) {
  const finalContent = (data.content || "...").substring(0, 100);
  contact.text = contact.type === RoomType.GROUP ? `${oldMsg?.fromUser.nickName || "机器人"}: ${finalContent}` : finalContent;

  if (oldMsg) {
    const buffer = bufferMap.get(oldMsg);
    if (buffer) {
      clearInterval(buffer.updateInterval);
      clearTimeout(buffer.timer);
      bufferMap.delete(oldMsg);
    }

    if (oldMsg?.message) {
      oldMsg.message.body && (oldMsg.message.body.reasoningContent = data.reasoningContent || "");
      oldMsg.message.content = data.content;
    }

    // AI消息完成时，如果应该自动滚动，则滚动到底部
    const chat = useChatStore();
    if (chat.shouldAutoScroll && chat.theRoomId === data.roomId && (oldMsg as ChatMessageVO<AiChatReplyBodyMsgVO>).message.body?.reply?.uid === useUserStore().userInfo.id) {
      chat.scrollBottom(true);
    }
  }
}

/**
 * 处理会话信息更新消息
 * @param data 数据
 */
export function resolveUpdateContactInfo(data: WSUpdateContactInfoMsg) {
  const chat = useChatStore();
  chat.updateContact(data.roomId, {}, (contact) => {
    data.shieldStatus !== null && data.shieldStatus !== undefined && (contact.shieldStatus = data.shieldStatus);
    data.noticeStatus !== null && data.noticeStatus !== undefined && (contact.noticeStatus = data.noticeStatus);
  });
}

