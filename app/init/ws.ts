import { sendNotification } from "@tauri-apps/plugin-notification";
import { mitter, MittEventType } from "~/composables/utils/useMitt";
import { sendWebNotification } from "~/composables/utils/useWebToast";

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
