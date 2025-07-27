import { sendNotification } from "@tauri-apps/plugin-notification";
import { sendWebNotification } from "~/composables/utils/useWebToast";
import { WsMsgBodyType } from "~/types/chat/WsType";

/**
 * WebSocket通知处理Hook
 */
export function useWsNotification() {
  const setting = useSettingStore();
  const user = useUserStore();
  const chat = useChatStore();

  // 通知消息类型
  const noticeType = {
    [WsMsgBodyType.MESSAGE]: true, // 普通消息
    [WsMsgBodyType.APPLY]: true, // 好友消息
  } as Record<WsMsgBodyType, boolean>;

  /**
   * 处理消息通知
   */
  function handleNotification(wsMsg: WsMsgBodyVO) {
    if (!noticeType[wsMsg.type])
      return;

    const msg = wsMsg.data as ChatMessageVO;
    // 非当前用户消息通知
    if (msg.fromUser?.userId && msg.fromUser?.userId === user?.userId) {
      return;
    }

    // 系统通知
    if (setting.settingPage.notificationType !== NotificationEnums.SYSTEM)
      return;
    // 非托盘通知且聊天显示
    if (!setting.isWeb || (setting.isWeb && !chat.isVisible)) {
      if (!checkShieldNotice(msg)) // 免打扰
        return;
      // web 通知
      if (setting.isWeb) {
        sendWebNotification(msg.fromUser.nickName, `${msg.message.content || "消息通知"}`, {
          icon: msg.fromUser.avatar ? BaseUrlImg + msg.fromUser.avatar : "/logo.png",
          onClick: () => {
            chat.setContact(chat.contactMap[msg.message.roomId]);
          },
        });
      }
      else { // tauri 通知
        sendNotification({
          icon: ["android", "ios"].includes(setting.appPlatform) ? "/logo.png" : BaseUrlImg + msg.fromUser.avatar,
          title: msg.fromUser.nickName,
          body: `${msg.message.content || "消息通知"}`,
          largeBody: `${msg.message.content || "消息通知"}`,
          number: 1,
        });
      }
    }
  }

  function checkShieldNotice(msg: ChatMessageVO) {
    const chat = useChatStore();
    if (chat?.contactMap?.[msg?.message?.roomId as any]?.shieldStatus === isTrue.TRUE)
      return false;
    return true;
  }


  return {
    noticeType,
    handleNotification,
  };
}
