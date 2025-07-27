import mitt from "mitt";

export enum MittEventType {
  CHAT_WS_RELOAD = "chat-ws-reload", // ws重新连接事件
  // 全局快捷键
  SHORTCUT_KEY = "js-shortcut-key",

  // Ws推送消息事件
  MESSAGE = "chat-new-msg", // 新消息
  ONLINE_OFFLINE_NOTIFY = "chat-online-offline-notify", // 上下线通知
  RECALL = "chat-recall-notify", // 撤回通知
  APPLY = "chat-apply-notify", // 好友申请通知
  MEMBER_CHANGE = "chat-member-change-notify", // 成员变更通知
  TOKEN_EXPIRED_ERR = "chat-token-expired-err", // token过期错误
  DELETE = "chat-delete", // 删除通知
  RTC_CALL = "chat-rtc-call", // 视频通话通知
  PIN_CONTACT = "chat-pin-contact", // 置顶通知
  UPDATE_CONTACT_INFO = "chat-update-contact-info", // 更新会话信息通知
  AI_STREAM = "chat-ai-msg", // AI消息
  OTHER = "chat-other",

  // 组件滚动事件
  MSG_LIST_SCROLL = "chat-msg-list-scroll",
  // 表单操作事件
  MSG_FORM = "chat-msg-form",
  CHAT_AT_USER = "chat-at-user", // @用户事件
  CAHT_ASK_AI_ROBOT = "chat-ask-ai-robot", // 提问AI机器人事件
  // 视频组件事件
  VIDEO_READY = "video-ready",
  // 成员列表事件
  RELOAD_MEMBER_LIST = "chat-reload-member-list", // 重新加载成员列表
  // 好友
  FRIEND_CONTROLLER = "chat-delete-friend", // 好友控制
  FRIEND_APPLY_DIALOG = "chat-friend-apply-dialog", // 好友申请弹窗
  // 群聊
  GROUP_CONTRONLLER = "chat-group-controller", // 群聊控制
  // 消息队列事件
  MESSAGE_QUEUE = "chat-message-queue", // 消息队列事件
  // WebSocket同步事件
  WS_SYNC = "chat-ws-sync", // WebSocket断开重连后的同步事件

}

// 组件滚动事件载荷
export interface MsgListScrollPayload {
  type: "scrollBottom" | "scrollTop" | "scrollReplyMsg" | "saveScrollTop",
  payload: any
}

// 视频组件事件载荷
export interface VideoReadyPayload {
  type: "play" | "play-dbsound" | "pause" | "ended",
  payload: {
    url: string;
    duration: number;
    thumbUrl?: string;
    mouseX: number;
    mouseY: number;

    size?: number;
    thumbSize?: number;
    thumbWidth?: number;
    thumbHeight?: number;
  }
}
// 表单操作事件载荷
export type MsgFormEventPlaoyload
  = | { type: "focus" | "blur", payload?: null }
    | { type: "update", payload: ChatMessageDTO };

// @用户事件载荷
export interface AtUserPlaoyload {
  type: "add" | "remove" | "clear",
  payload?: string | null
}
// 提问AI机器人事件载荷
export interface AskAiRobotPayload {
  type: "add" | "remove" | "clear",
  payload?: string // userId
}

// 消息队列事件载荷
export interface MessageQueueData {
  queueItem?: MessageQueueItem;
  msg?: ChatMessageVO;
}

export type MessageQueueType = "add" | "success" | "error" | "retry" | "clear" | "delete" | "update";
export interface MessageQueuePayload {
  type: MessageQueueType,
  payload?: MessageQueueData
}

// 好友申请弹窗事件载荷
export interface FriendApplyDialogPayload {
  show: boolean;
  userId?: string;
}

// eslint-disable-next-line ts/consistent-type-definitions
type EventPayloadMap = {
  // ws重新连接事件
  [MittEventType.CHAT_WS_RELOAD]: void;
  // 全局快捷键
  [MittEventType.SHORTCUT_KEY]: { key: string, options: { ctrlKey?: boolean, shiftKey?: boolean, altKey?: boolean, metaKey?: boolean } };
  // ws接收消息事件
  [MittEventType.MESSAGE]: ChatMessageVO;
  [MittEventType.ONLINE_OFFLINE_NOTIFY]: WSOnlineOfflineNotify;
  [MittEventType.RECALL]: WSMsgRecall;
  [MittEventType.APPLY]: WSFriendApply;
  [MittEventType.MEMBER_CHANGE]: WSMemberChange;
  [MittEventType.TOKEN_EXPIRED_ERR]: object;
  [MittEventType.DELETE]: WSMsgDelete;
  [MittEventType.RTC_CALL]: WSRtcCallMsg;
  [MittEventType.PIN_CONTACT]: WSPinContactMsg;
  [MittEventType.UPDATE_CONTACT_INFO]: WSUpdateContactInfoMsg;
  [MittEventType.AI_STREAM]: WSAiStreamMsg;
  [MittEventType.OTHER]: object;
  // 消息列表组件事件
  [MittEventType.MSG_LIST_SCROLL]: MsgListScrollPayload;
  // 表单操作事件
  [MittEventType.MSG_FORM]: MsgFormEventPlaoyload;
  [MittEventType.CHAT_AT_USER]: AtUserPlaoyload;
  [MittEventType.CAHT_ASK_AI_ROBOT]: AskAiRobotPayload;
  // 视频组件事件
  [MittEventType.VIDEO_READY]: VideoReadyPayload;
  // 成员列表事件
  [MittEventType.RELOAD_MEMBER_LIST]: { type: "reload", payload: { userId: string, roomId: number } };
  // 好友
  [MittEventType.FRIEND_CONTROLLER]: { type: "delete" | "add", payload: { userId: string } };
  [MittEventType.FRIEND_APPLY_DIALOG]: FriendApplyDialogPayload;
  // 群聊
  [MittEventType.GROUP_CONTRONLLER]: { type: "delete" | "add", payload: { roomId: number } };
  // 消息队列
  [MittEventType.MESSAGE_QUEUE]: MessageQueuePayload;
  // WebSocket同步事件
  [MittEventType.WS_SYNC]: { lastDisconnectTime: number, reconnectTime: number };
};

export type MittEvents = {
  [K in keyof EventPayloadMap]: EventPayloadMap[K];
};


/** ******************** 消息事件映射 */
const eventAndWsMap: Readonly<Record<WsMsgBodyType, MittEventType>> = {
  [WsMsgBodyType.MESSAGE]: MittEventType.MESSAGE,
  [WsMsgBodyType.ONLINE_OFFLINE_NOTIFY]: MittEventType.ONLINE_OFFLINE_NOTIFY,
  [WsMsgBodyType.RECALL]: MittEventType.RECALL,
  [WsMsgBodyType.APPLY]: MittEventType.APPLY,
  [WsMsgBodyType.MEMBER_CHANGE]: MittEventType.MEMBER_CHANGE,
  [WsMsgBodyType.TOKEN_EXPIRED_ERR]: MittEventType.TOKEN_EXPIRED_ERR,
  [WsMsgBodyType.DELETE]: MittEventType.DELETE,
  [WsMsgBodyType.RTC_CALL]: MittEventType.RTC_CALL,
  [WsMsgBodyType.PIN_CONTACT]: MittEventType.PIN_CONTACT,
  [WsMsgBodyType.AI_STREAM]: MittEventType.AI_STREAM,
  [WsMsgBodyType.UPDATE_CONTACT_INFO]: MittEventType.UPDATE_CONTACT_INFO,
} as const;
export function resolteChatPath(type: WsMsgBodyType): MittEventType {
  return eventAndWsMap[type] || MittEventType.OTHER;
}


/** mitt instance */
export const mitter = mitt<MittEvents>();

export function removeAllEventListener() {
  mitter.all.clear();
  // mitter.off(MittEventType.MESSAGE);
  // mitter.off(MittEventType.ONLINE_OFFLINE_NOTIFY);
  // mitter.off(MittEventType.RECALL);
  // mitter.off(MittEventType.APPLY);
  // mitter.off(MittEventType.MEMBER_CHANGE);
  // mitter.off(MittEventType.TOKEN_EXPIRED_ERR);
  // mitter.off(MittEventType.DELETE);
  // mitter.off(MittEventType.RTC_CALL);
  // mitter.off(MittEventType.PIN_CONTACT);
  // mitter.off(MittEventType.OTHER);
  // mitter.off(MittEventType.MSG_LIST_SCROLL);
  // mitter.off(MittEventType.MSG_FORM);
  // mitter.off(MittEventType.VIDEO_READY);
  // mitter.off(MittEventType.CHAT_AT_USER);
  // mitter.off(MittEventType.CAHT_ASK_AI_ROBOT);
  // mitter.off(MittEventType.RELOAD_MEMBER_LIST);
}
