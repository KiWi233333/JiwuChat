import { MittEventType } from "../../utils/useMitt";

// 消息状态枚举
export enum MessageSendStatus {
  PENDING = "pending", // 等待发送
  SENDING = "sending", // 发送中
  SUCCESS = "success", // 发送成功
  ERROR = "error", // 发送失败
}

export const MessageSendStatusMap: Record<MessageSendStatus, string> = {
  [MessageSendStatus.PENDING]: "等待中",
  [MessageSendStatus.SENDING]: "发送中",
  [MessageSendStatus.SUCCESS]: "已发送",
  [MessageSendStatus.ERROR]: "错误",
};

// 消息队列项接口
export interface MessageQueueItem {
  id: any; // 消息唯一ID
  sendMsg: () => Promise<Result<ChatMessageVO>>; // 发送消息的Promise
  formData: ChatMessageDTO; // 消息数据(用于msgBuilder)
  status: MessageSendStatus; // 消息状态
  callback?: (msg: ChatMessageVO) => void; // 回调函数
  createdAt: number; // 创建时间
  tempMsg: ChatMessageVO; // 临时消息对象(预构建的消息)
}

// 消息队列管理类
class MessageQueueManager {
  private queue = reactive<Record<string | number, MessageQueueItem>>({});
  private pendingIds = reactive<any[]>([]);

  // 添加消息到队列
  add = (item: MessageQueueItem): void => {
    this.queue[item.id] = item;
    this.pendingIds.push(item.id);
  };

  // 获取下一个待处理的消息
  getNextPending = (): MessageQueueItem | null => {
    const pendingId = this.pendingIds.find(id =>
      this.queue[id] && this.queue[id].status === MessageSendStatus.PENDING,
    );
    return pendingId ? this.queue[String(pendingId)] || null : null;
  };

  // 更新消息状态
  updateStatus = (id: any, status: MessageSendStatus): void => {
    if (this.queue[id])
      this.queue[id].status = status;
  };

  // 移除消息
  remove = (id: any): void => {
    delete this.queue[String(id)];
    const index = this.pendingIds.indexOf(id);
    if (index !== -1) {
      this.pendingIds.splice(index, 1);
    }
  };

  // 移除消息 - 已经发送一次的消息
  removePending = (id: any): void => {
    const index = this.pendingIds.indexOf(id);
    if (index !== -1) {
      this.pendingIds.splice(index, 1);
    }
  };

  // 获取所有消息
  getAll = (): MessageQueueItem[] => {
    return Object.values(this.queue);
  };

  // 获取指定ID的消息
  get = (id: any) => {
    return this.queue[String(id)];
  };

  // 清空队列
  clear = (): void => {
    Object.keys(this.queue).forEach((key) => {
      delete this.queue[key];
    });
    this.pendingIds.length = 0;
  };

  // 获取队列长度
  get length() {
    return this.pendingIds.length;
  }
}

export function useMessageQueue() {
  const queueManager = new MessageQueueManager();
  const isProcessingQueue = ref(false);
  const user = useUserStore();

  // 消息队列的响应式引用
  const messageQueue = computed(() => queueManager.getAll());

  // 消息构建器 - 预先构建消息对象
  const msgBuilder = (formData: ChatMessageDTO, tempId: any, time: number): ChatMessageVO => {
    return {
      fromUser: {
        userId: user.userId,
        avatar: user.userInfo.avatar,
        gender: user.userInfo.gender,
        nickName: user.userInfo.nickname,
      },
      message: {
        id: tempId,
        roomId: formData.roomId,
        sendTime: time,
        content: formData.content,
        type: formData.msgType,
        body: msgBodyVOBuilderMap[formData.msgType]?.(formData),
      },
    } as ChatMessageVO<any>;
  };

  // 处理消息队列
  const processMessageQueue = async () => {
    if (isProcessingQueue.value || queueManager.length === 0) {
      return;
    }

    isProcessingQueue.value = true;

    // 获取队列中第一个待处理的消息
    const currentItem = queueManager.getNextPending();

    if (!currentItem) {
      isProcessingQueue.value = false;
      return;
    }

    // 更新状态为发送中
    queueManager.updateStatus(currentItem.id, MessageSendStatus.SENDING);

    try {
      // 调用外部传入的发送Promise
      const result = await currentItem.sendMsg();
      if (!result || result.code !== StatusCode.SUCCESS) {
        throw new Error(result?.message || "发送失败");
      }
      else if (result.message === "您和对方已不是好友！") { // 特殊错误处理
        queueManager.updateStatus(currentItem.id, MessageSendStatus.ERROR);
        mitter.emit(MittEventType.MESSAGE_QUEUE, {
          type: "error",
          payload: { queueItem: currentItem },
        });
        queueManager.removePending(currentItem.id);
      }

      // 检查消息是否还在队列中(可能被删除了)
      if (!queueManager.get(currentItem.id)) {
        return;
      }

      // 发送成功
      queueManager.updateStatus(currentItem.id, MessageSendStatus.SUCCESS);

      // 触发成功事件
      mitter.emit(MittEventType.MESSAGE_QUEUE, {
        type: "success",
        payload: { queueItem: currentItem, msg: result.data },
      });

      // 执行回调
      if (typeof currentItem.callback === "function") {
        currentItem.callback(result.data);
      }

      // 从队列中移除
      queueManager.remove(currentItem.id);
    }
    catch (error) {
      // 发送失败
      queueManager.updateStatus(currentItem.id, MessageSendStatus.ERROR);

      // 触发错误事件
      mitter.emit(MittEventType.MESSAGE_QUEUE, {
        type: "error",
        payload: { queueItem: currentItem },
      });

      // 从pending列表中移除
      queueManager.removePending(currentItem.id);
    }
    finally {
      isProcessingQueue.value = false;

      // 继续处理队列中的其他消息
      if (queueManager.length > 0) {
        processMessageQueue();
      }
    }
  };

  // 生成临时消息ID

  // 添加消息到队列 - 重构后只需要三个参数
  const addToMessageQueue = (
    time: number,
    formData: ChatMessageDTO & { _ossFile?: OssFile },
    sendMsg: () => Promise<Result<ChatMessageVO>>,
    callback?: (msg: ChatMessageVO) => void,
  ) => {
    const tempMsg = msgBuilder(formData, formData.clientId, time);
    (tempMsg as ChatMessageVO<any> & { _ossFile?: OssFile })._ossFile = formData._ossFile;
    // 生成队列项
    const queueItem: MessageQueueItem = {
      id: formData.clientId, // 临时id
      sendMsg,
      formData,
      status: MessageSendStatus.PENDING,
      callback,
      createdAt: time,
      tempMsg,
    };

    // 添加到队列
    queueManager.add(queueItem);

    // 触发添加事件
    mitter.emit(MittEventType.MESSAGE_QUEUE, {
      type: "add",
      payload: { queueItem, msg: tempMsg },
    });

    // 开始处理队列
    if (!isProcessingQueue.value) {
      processMessageQueue();
    }

    return {
      id: queueItem.id,
      tempMsg,
    };
  };

  // 重试发送消息
  const retryMessage = (messageId: any) => {
    const item = queueManager.get(messageId);
    if (!item?.tempMsg || item.status !== MessageSendStatus.ERROR) {
      return;
    }

    // 从消息列表中删除错误消息
    const chat = useChatStore();
    const roomId = item.tempMsg.message.roomId;
    if (!roomId) {
      return;
    }

    // 查找并删除消息列表中的错误消息
    if (roomId && chat.contactMap[roomId]) {
      const contact = chat.contactMap[roomId];
      const msgIndex = contact.msgIds.indexOf(messageId);
      if (msgIndex !== -1) {
        contact.msgIds.splice(msgIndex, 1);
      }
      delete contact.msgMap[messageId];
    }

    // 重新添加到队列
    addToMessageQueue(Date.now(), item.formData, item.sendMsg, item.callback);

    // 触发重试事件
    mitter.emit(MittEventType.MESSAGE_QUEUE, {
      type: "retry",
      payload: {
        queueItem: item,
        msg: item.tempMsg,
      },
    });
  };

  // 删除未发送的消息
  const deleteUnSendMessage = (messageId: any) => {
    const item = queueManager.get(messageId);
    if (!item) {
      return;
    }

    // 只能删除未发送的消息（PENDING 或 ERROR 状态）
    if (item.status === MessageSendStatus.SENDING || item.status === MessageSendStatus.SUCCESS) {
      return;
    }

    // 从队列中移除
    queueManager.remove(messageId);

    // 从消息列表中删除
    const chat = useChatStore();
    const roomId = item.tempMsg?.message.roomId;
    if (roomId && chat.contactMap[roomId]) {
      const contact = chat.contactMap[roomId];
      const msgIndex = contact.msgIds.indexOf(messageId);
      if (msgIndex !== -1) {
        contact.msgIds.splice(msgIndex, 1);
      }
      delete contact.msgMap[messageId];
    }

    // 触发删除事件
    mitter.emit(MittEventType.MESSAGE_QUEUE, {
      type: "delete",
      payload: { queueItem: item },
    });
  };

  // 清空消息队列
  const clearMessageQueue = () => {
    queueManager.clear();

    // 触发清空事件
    mitter.emit(MittEventType.MESSAGE_QUEUE, {
      type: "clear",
    });
  };

  // 处理队列项(外部调用用于处理成功的消息)
  const resolveQueueItem = (clientId: string, msg: ChatMessageVO) => {
    queueManager.updateStatus(clientId, MessageSendStatus.SUCCESS);
    const currentItem = queueManager.get(clientId);
    if (!currentItem)
      return;

    mitter.emit(MittEventType.MESSAGE_QUEUE, {
      type: "success",
      payload: { queueItem: currentItem, msg },
    });

    if (typeof currentItem.callback === "function") {
      currentItem.callback(msg);
    }

    // 从队列中移除
    queueManager.remove(clientId);
  };

  return {
    messageQueue,
    isProcessingQueue,
    isExsist: (id: any) => !!queueManager.get(id),
    get: queueManager.get,
    addToMessageQueue,
    resolveQueueItem,
    processMessageQueue,
    retryMessage,
    deleteUnSendMessage,
    clearMessageQueue,
    msgBuilder,
  };
}
