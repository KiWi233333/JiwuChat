/**
 * 撤回消息
 * @param {ChatMessageVO} data - 消息数据
 * @param {number} msgId - 消息ID
 */
export async function refundMsg(data: ChatMessageVO<any>, msgId: number) {
  const oldData = JSON.parse(JSON.stringify(data));
  const user = useUserStore();
  const chat = useChatStore();
  const roomId = data.message.roomId;

  const res = await refundChatMessage(roomId, msgId, user.getToken);

  if (res.code !== StatusCode.SUCCESS) {
    return;
  }

  if (data.message.id === msgId && data.message.content) {
    // 存储撤回的消息以便潜在的恢复
    chat.setRecallMsg(oldData);
  }
  data.message.type = MessageType.RECALL;
  data.message.content = `${data.fromUser.userId === user.userInfo.id ? "我" : `"${data.fromUser.nickName}"`}撤回了一条消息`;
  data.message.body = undefined;
}

/**
 * 删除消息
 * @param {ChatMessageVO} data - 消息数据
 * @param {number} msgId - 消息ID
 */
export function deleteMsg(data: ChatMessageVO<any>, msgId: number) {
  ElMessageBox.confirm("是否确认删除消息？", "删除提示", {
    lockScroll: false,
    confirmButtonText: "确 认",
    confirmButtonClass: "el-button--primary is-plain border-default",
    cancelButtonText: "取 消",
    center: true,
    callback: async (action: string) => {
      if (action !== "confirm")
        return;

      const user = useUserStore();
      const roomId = data.message.roomId;

      const res = await deleteChatMessage(roomId, msgId, user.getToken);

      if (res.code === StatusCode.SUCCESS) {
        if (data.message.id === msgId) {
          data.message.type = MessageType.DELETE;
          data.message.content = `${
            data.fromUser.userId === user.userInfo.id
              ? "我删除了一条消息"
              : `我删除了一条"${data.fromUser.nickName}"成员消息`
          }`;
          data.message.body = undefined;
        }
      }
    },
  });
}
