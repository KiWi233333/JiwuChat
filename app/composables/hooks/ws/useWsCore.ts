import type { WSUpdateContactInfoMsg } from "~/types/chat/WsType";
import { sendNotification } from "@tauri-apps/plugin-notification";
import { sendWebNotification } from "~/composables/utils/useWebToast";
import { WsMsgBodyType, WsStatusEnum } from "~/types/chat/WsType";

/**
 * WebSocket消息类型映射接口
 */
export interface WsMsgItemMap {
  newMsg: ChatMessageVO[];
  onlineNotice: WSOnlineOfflineNotify[];
  recallMsg: WSMsgRecall[];
  deleteMsg: WSMsgDelete[];
  applyMsg: WSFriendApply[];
  memberMsg: WSMemberChange[];
  tokenMsg: object[];
  rtcMsg: WSRtcCallMsg[];
  pinContactMsg: WSPinContactMsg[];
  aiStreamMsg: WSAiStreamMsg[];
  updateContactInfoMsg: WSUpdateContactInfoMsg[]
  other: object[];
}

/**
 * WebSocket消息处理Hook
 */
export function useWsMessage() {
  // 消息类型映射
  const wsMsgMap: Record<WsMsgBodyType, keyof WsMsgItemMap> = {
    [WsMsgBodyType.MESSAGE]: "newMsg",
    [WsMsgBodyType.ONLINE_OFFLINE_NOTIFY]: "onlineNotice",
    [WsMsgBodyType.RECALL]: "recallMsg",
    [WsMsgBodyType.DELETE]: "deleteMsg",
    [WsMsgBodyType.APPLY]: "applyMsg",
    [WsMsgBodyType.MEMBER_CHANGE]: "memberMsg",
    [WsMsgBodyType.TOKEN_EXPIRED_ERR]: "tokenMsg",
    [WsMsgBodyType.RTC_CALL]: "rtcMsg",
    [WsMsgBodyType.PIN_CONTACT]: "pinContactMsg",
    [WsMsgBodyType.AI_STREAM]: "aiStreamMsg",
    [WsMsgBodyType.UPDATE_CONTACT_INFO]: "updateContactInfoMsg",
  };

  // 创建空消息列表
  const emptyMsgList = (): WsMsgItemMap => ({
    newMsg: [],
    onlineNotice: [],
    recallMsg: [],
    deleteMsg: [],
    applyMsg: [],
    memberMsg: [],
    tokenMsg: [],
    rtcMsg: [],
    pinContactMsg: [],
    aiStreamMsg: [],
    updateContactInfoMsg: [],
    other: [],
  });

  // 消息列表
  const wsMsgList = ref<WsMsgItemMap>(emptyMsgList());

  // 是否有新消息
  const isNewMsg = computed(() => wsMsgList.value.newMsg.length > 0);

  const { handleNotification } = useWsNotification();
  /**
   * 处理接收到的WebSocket消息
   */
  function processWsMessage(msgData: Result<WsMsgBodyVO>) {
    if (!msgData)
      return;

    const wsMsg = msgData.data;
    const body = wsMsg.data;

    // 如果消息类型在映射中存在，则处理该消息
    if (wsMsgMap[wsMsg.type] !== undefined) {
      wsMsgList.value[wsMsgMap[wsMsg.type]].push(body as any);
      mitter.emit(resolteChatPath(wsMsg.type), body);
    }
    handleNotification(wsMsg);
  }

  /**
   * 重置消息列表
   */
  function resetMsgList() {
    wsMsgList.value = emptyMsgList();
  }

  return {
    wsMsgMap,
    wsMsgList,
    isNewMsg,
    processWsMessage,
    resetMsgList,
    emptyMsgList,
  };
}

/**
 * WebSocket Worker管理Hook
 */
export function useWsWorker() {
  const isReload = ref(false);
  const worker = shallowRef<Worker>();
  const ws = useWsStore();
  const user = useUserStore();

  /**
   * 初始化Web Worker
   */
  async function initWorker() {
    if (isReload.value)
      return;

    console.log("web worker reload");
    isReload.value = true;

    // 关闭现有连接
    worker.value?.terminate?.();
    await ws?.close?.(false);

    if (!user?.getTokenFn()) {
      isReload.value = false;
      return;
    }

    // 创建新Worker
    worker.value = new Worker("/useWsWorker.js");

    // 设置Worker消息处理
    setupWorkerHandlers();

    isReload.value = false;
    return worker.value;
  }

  async function _reload() {
    await initWorker();

    // 初始化WebSocket连接
    ws.initDefault(() => {
      // 设置消息处理
      setupMessageHandlers();
      // 发送状态到Worker
      sendStatusToWorker();
    });
  }
  /**
   * 重新加载Worker
   */
  const reload = useThrottleFn(_reload, 3000);

  /**
   * 设置Worker事件处理器
   */
  function setupWorkerHandlers() {
    if (!worker.value)
      return;

    // Web Worker 消息处理
    worker.value.onmessage = (e) => {
      if (e.data.type === "reload")
        reload();
      if (e.data.type === "heart") {
        if (ws.status !== WsStatusEnum.OPEN || !ws.webSocketHandler)
          return reload();
        try {
          ws.sendHeart();
        }
        catch (error) {
          console.error(error);
          reload();
        }
      }
      if (e.data.type === "log")
        console.log(e.data.data);
    };

    // Web Worker 错误处理
    worker.value.onerror = (e) => {
      console.error(e);
      reload();
    };

    // Web Worker 消息错误处理
    worker.value.onmessageerror = (e) => {
      console.error(e);
      reload();
    };
  }

  /**
   * 设置消息处理器
   */
  function setupMessageHandlers() {
    ws.onMessage();
  }

  /**
   * 发送状态到Worker
   */
  function sendStatusToWorker() {
    if (!worker.value)
      return;

    const { noticeType } = useWsNotification();
    worker.value.postMessage({
      status: ws.status,
      noticeType,
    });
  }

  /**
   * 清理Worker
   */
  function cleanupWorker() {
    worker.value?.terminate?.();
    worker.value = undefined;
  }

  return {
    worker,
    isReload,
    initWorker,
    reload,
    cleanupWorker,
  };
}

/**
 * 初始化WebSocket
 */
export async function useWsInit() {
  const ws = useWsStore();
  const user = useUserStore();

  // 使用Worker管理hooks
  const { reload: reloadWorker, cleanupWorker } = useWsWorker();

  // 自动重连
  const validStatus = [WsStatusEnum.OPEN, WsStatusEnum.CONNECTION];
  watchDebounced(() => !validStatus.includes(ws.status) && user.isLogin, (bool) => {
    if (bool) {
      reloadWorker();
    }
    else if (!user.isLogin) {
      cleanupWorker();
      ws.close(false);
    }
  }, {
    debounce: 3000,
    deep: true,
  });

  // 初始状态检查
  if (!validStatus.includes(ws.status) && user.isLogin) {
    reloadWorker();
  }

  // 暴露给外部调用，用于刷新Web Worker状态
  mitter.off(MittEventType.CHAT_WS_RELOAD);
  mitter.on(MittEventType.CHAT_WS_RELOAD, reloadWorker);

  return {
    ws,
    reloadWorker,
  };
}

/**
 * 清理WebSocket资源
 */
export function useWSUnmounted() {
  const ws = useWsStore();
  ws?.close(false);
}

/**
 * 发送系统通知
 */
export function notification(msg: ChatMessageVO) {
  const setting = useSettingStore();
  // web 通知
  if (setting.isWeb) {
    const chat = useChatStore();
    sendWebNotification(msg.fromUser.nickName, `${msg.message.content || "消息通知"}`, {
      icon: msg.fromUser.avatar ? BaseUrlImg + msg.fromUser.avatar : "/logo.png",
      onClick: () => {
        chat.setContact(chat.contactMap[msg.message.roomId]);
      },
    });
    return;
  }
  // tauri 通知
  sendNotification({
    icon: ["android", "ios"].includes(setting.appPlatform) ? "/logo.png" : BaseUrlImg + msg.fromUser.avatar,
    title: msg.fromUser.nickName,
    body: `${msg.message.content || "消息通知"}`,
    largeBody: `${msg.message.content || "消息通知"}`,
    number: 1,
  });
}
