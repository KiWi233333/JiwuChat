import type { WsMsgItemMap } from "./messages";
import { WsStatusEnum } from "~/types/chat/WsType";
import { processMessage } from "./messageConfig";
import { WsMsgKey } from "./messageKeys";
import { messageConfig } from "./messages";

/**
 * WebSocket消息处理Hook
 */
export function useWsMessage() {
  // 创建空消息列表
  const emptyMsgList = (): WsMsgItemMap => ({
    [WsMsgKey.NEW_MSG]: [],
    [WsMsgKey.ONLINE_NOTICE]: [],
    [WsMsgKey.RECALL_MSG]: [],
    [WsMsgKey.DELETE_MSG]: [],
    [WsMsgKey.APPLY_MSG]: [],
    [WsMsgKey.MEMBER_MSG]: [],
    [WsMsgKey.TOKEN_MSG]: [],
    [WsMsgKey.RTC_MSG]: [],
    [WsMsgKey.PIN_CONTACT_MSG]: [],
    [WsMsgKey.AI_STREAM_MSG]: [],
    [WsMsgKey.UPDATE_CONTACT_INFO_MSG]: [],
    [WsMsgKey.OTHER]: [],
  });

  // 消息列表
  const wsMsgList = ref<WsMsgItemMap>(emptyMsgList());

  // 是否有新消息
  const isNewMsg = computed(() => (wsMsgList.value.newMsg?.length ?? 0) > 0);

  /**
   * 处理接收到的WebSocket消息
   */
  function processWsMessage(msgData: Result<WsMsgBodyVO>) {
    processMessage(messageConfig, msgData, wsMsgList);
  }

  /**
   * 重置消息列表
   */
  function resetMsgList() {
    wsMsgList.value = emptyMsgList();
  }

  return {
    wsMsgList,
    isNewMsg,
    processWsMessage,
    resetMsgList,
    emptyMsgList,
  };
}

/** 页面是否处于可见/聚焦状态（用于断联重连节流） */
function isPageVisible(): boolean {
  if (typeof document === "undefined")
    return true;
  return document.visibilityState === "visible";
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

    // Web Worker 消息处理（仅在页面可见时重连，避免后台标签页频繁重连）
    worker.value.onmessage = (e) => {
      if (e.data.type === "reload") {
        if (isPageVisible())
          reload();
        return;
      }
      if (e.data.type === "heart") {
        if (ws.status !== WsStatusEnum.OPEN) {
          if (isPageVisible())
            reload();
          return;
        }
        try {
          ws.sendHeart();
        }
        catch (error) {
          console.error(error);
          if (isPageVisible())
            reload();
        }
        return;
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
   * 发送状态到Worker（含页面可见性，供 Worker 决定是否请求重连）
   */
  function sendStatusToWorker() {
    if (!worker.value)
      return;

    const { noticeType } = useWsNotification();
    worker.value.postMessage({
      status: ws.status,
      noticeType,
      visible: isPageVisible(),
    });
  }

  /** 仅向 Worker 同步可见性（如 visibilitychange 时） */
  function sendVisibilityToWorker() {
    if (!worker.value)
      return;
    worker.value.postMessage({ type: "visibility", visible: isPageVisible() });
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
    sendVisibilityToWorker,
  };
}

/**
 * 初始化WebSocket（结合聚焦/可见性：仅在前台时断联重连）
 */
export async function useWsInit() {
  const ws = useWsStore();
  const user = useUserStore();

  const { reload: reloadWorker, cleanupWorker, sendVisibilityToWorker } = useWsWorker();

  const validStatus = [WsStatusEnum.OPEN, WsStatusEnum.CONNECTION];

  // 自动重连：仅当页面可见时执行，避免后台标签页频繁重连
  watchDebounced(() => !validStatus.includes(ws.status) && user.isLogin, (bool) => {
    if (bool) {
      if (isPageVisible())
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

  // 初始状态检查（仅可见时重连）
  if (!validStatus.includes(ws.status) && user.isLogin && isPageVisible()) {
    reloadWorker();
  }

  // 页面从隐藏变为可见时：同步可见性到 Worker，并触发一次断联重连检查
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      sendVisibilityToWorker();
      if (document.visibilityState === "visible" && !validStatus.includes(ws.status) && user.isLogin)
        reloadWorker();
    });
  }

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
