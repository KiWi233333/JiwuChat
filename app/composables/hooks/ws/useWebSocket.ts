import type { Message as BackMessage } from "@tauri-apps/plugin-websocket";
import type { WsSendMsgDTO } from "~/types/chat/WsType";
import BackWebSocket from "@tauri-apps/plugin-websocket";
import { WsMsgType, WsStatusEnum } from "~/types/chat/WsType";

const WS_SYNC_DELAY = 200;
/**
 * WebSocket核心Hook
 * 提供WebSocket基础功能
 */
export function useWebSocket() {
  const webSocketHandler = ref<WebSocket | BackWebSocket | null>(null);
  const user = useUserStore();
  const fullWsUrl = computed(() => `${BaseWSUrlRef.value}?Authorization=${user.getToken}`);
  const status = ref<WsStatusEnum>(WsStatusEnum.CLOSE);
  // 记录最后一次断开时刻
  const lastDisconnectTime = ref<number>(0);
  // 记录连接时刻
  const connectTime = ref<number>(0);


  function fetchWsChat() {
    // 记录连接时刻
    connectTime.value = Date.now();
    console.log(`ws connectTime:${connectTime.value}   lastDisconnectTime:${lastDisconnectTime.value} delay:${connectTime.value - lastDisconnectTime.value}`);
    // 检查是否需要触发同步事件（断开后快速重连）
    if (lastDisconnectTime.value > 0 && (connectTime.value - lastDisconnectTime.value) >= WS_SYNC_DELAY) {
    // 延迟小于200ms，触发同步事件
      mitter.emit(MittEventType.WS_SYNC, {
        lastDisconnectTime: lastDisconnectTime.value,
        reconnectTime: connectTime.value,
      });
    }
  }

  /**
   * 处理WebSocket错误和关闭事件
   */
  const handleSocketEvent = (eventType: "error" | "close", wsStatus: WsStatusEnum) => {
    return (e: Event) => {
      status.value = wsStatus;
      webSocketHandler.value = null;
      lastDisconnectTime.value = Date.now();
    };
  };

  /**
   * 初始化浏览器原生WebSocket
   */
  function initBrowserWebSocket(url: string, call: () => any) {
    status.value = WsStatusEnum.CONNECTION;
    webSocketHandler.value = new WebSocket(url);
    if (!webSocketHandler.value) {
      status.value = WsStatusEnum.SAFE_CLOSE;
      return null;
    }


    // 设置事件处理器
    webSocketHandler.value.onopen = () => {
      status.value = WsStatusEnum.OPEN;
      fetchWsChat();
      call();
    };
    webSocketHandler.value.addEventListener("error", handleSocketEvent("error", WsStatusEnum.CLOSE));
    webSocketHandler.value.addEventListener("close", handleSocketEvent("close", WsStatusEnum.SAFE_CLOSE));

    return webSocketHandler.value;
  }

  /**
   * 初始化Tauri WebSocket
   */
  async function initTauriWebSocket(url: string, call: () => any) {
    try {
      const ws = await BackWebSocket.connect(url);
      webSocketHandler.value = ws;
      status.value = WsStatusEnum.OPEN;
      fetchWsChat();
      // 设置状态
      status.value = ws.id ? WsStatusEnum.OPEN : WsStatusEnum.CLOSE;

      if (ws.id) {
        call();
      }

      return ws;
    }
    catch (err) {
      console.error("初始化Tauri WebSocket失败:", err);
      status.value = WsStatusEnum.CLOSE;
      return null;
    }
  }

  /**
   * 处理Tauri WebSocket错误
   */
  function handleTauriWsError(msg: BackMessage): boolean {
    if ("WebSocket protocol error: Connection reset without closing handshake".includes(msg?.data?.toString() || "")) {
      status.value = WsStatusEnum.SAFE_CLOSE;
      webSocketHandler.value = null;
      lastDisconnectTime.value = Date.now();
      return true;
    }
    else if (msg?.data?.toString().includes("WebSocket protocol error")) {
      status.value = WsStatusEnum.CLOSE;
      webSocketHandler.value = null;
      lastDisconnectTime.value = Date.now();
      return true;
    }
    return false;
  }

  /**
   * 关闭WebSocket连接
   */
  async function closeConnection() {
    try {
      await (webSocketHandler.value as BackWebSocket)?.disconnect?.();
      await (webSocketHandler.value as WebSocket)?.close?.();
    }
    catch (err) {
      // 忽略错误
    }
  }

  /**
   * 移除事件监听器
   */
  function removeEventListeners() {
    if (webSocketHandler.value && webSocketHandler.value instanceof WebSocket) {
      webSocketHandler.value.onmessage = null;
      webSocketHandler.value.onerror = null;
      webSocketHandler.value.onclose = null;
      webSocketHandler.value.onopen = null;
    }
  }

  function resetWs() {
    status.value = WsStatusEnum.CLOSE;
    (webSocketHandler.value as WebSocket)?.close?.();
    webSocketHandler.value = null;
    lastDisconnectTime.value = Date.now();
    mitter.emit(MittEventType.CHAT_WS_RELOAD); // 触发WebSocket重连事件
  }

  /**
   * 发送消息
   */
  function send(dto: WsSendMsgDTO) {
    if (status.value === WsStatusEnum.OPEN && webSocketHandler.value) {
      webSocketHandler.value.send(JSON.stringify(dto));
    }
  }

  /**
   * 发送心跳包
   */
  function sendHeart() {
    send({
      type: WsMsgType.HEARTBEAT,
      data: null,
    });
  }

  return {
    webSocketHandler,
    status,
    fullWsUrl,
    lastDisconnectTime,
    connectTime,
    initBrowserWebSocket,
    initTauriWebSocket,
    handleTauriWsError,
    closeConnection,
    removeEventListeners,
    send,
    sendHeart,
  };
}
