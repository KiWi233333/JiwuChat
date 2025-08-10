/**
 * 输入框/回复/艾特/机器人 相关
 * @returns 输入框/回复/艾特/机器人 相关
 */
export function createComposeInputModule() {
  /** 消息表单 */
  const msgForm = ref<ChatMessageDTO>({ roomId: -1, msgType: MessageType.TEXT, content: undefined, body: {} });
  /** 回复消息 */
  const replyMsg = ref<Partial<ChatMessageVO>>();
  /** 艾特用户列表 */
  const atUserList = ref<Partial<AtChatMemberOption>[]>([]);
  /** 机器人列表 */
  const askAiRobotList = ref<AskAiRobotOption[]>([]);


  /**
   * 设置回复消息
   * @param item 消息
   */
  function setReplyMsg(item: Partial<ChatMessageVO>) {
    replyMsg.value = item;
  }

  /**
   * 设置艾特用户
   * @param userId 用户id
   */
  function setAtUid(userId: string) {
    if (!userId || atUserList.value.find(p => p.userId === userId))
      return;
    mitter.emit(MittEventType.CHAT_AT_USER, { type: "add", payload: userId });
  }

  /**
   * 移除艾特用户
   * @param username 用户名
   */
  function removeAtByUsername(username?: string) {
    if (!username)
      return;
    atUserList.value = atUserList.value.filter(p => p.username !== username);
  }

  /**
   * 设置问答机器人
   * @param userId 用户id
   */
  function setAskAiUid(userId: string) {
    if (!userId || atUserList.value.find(p => p.userId === userId))
      return;
    mitter.emit(MittEventType.CAHT_ASK_AI_ROBOT, { type: "add", payload: userId });
  }

  /**
   * 移除机器人
   * @param username 用户名
   */
  function removeAskAiByUsername(username?: string) {
    if (!username)
      return;
    askAiRobotList.value = askAiRobotList.value.filter(p => p.username !== username);
  }

  function resetCompose() {
    msgForm.value = { roomId: -1, msgType: MessageType.TEXT, content: undefined, body: {} };
    replyMsg.value = undefined;
    atUserList.value = [];
    askAiRobotList.value = [];
  }

  return {
    msgForm,
    replyMsg,
    atUserList,
    askAiRobotList,
    setReplyMsg,
    setAtUid,
    removeAtByUsername,
    setAskAiUid,
    removeAskAiByUsername,
    resetCompose,
  };
}


