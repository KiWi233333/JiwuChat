import type { Result } from "postcss";
import type { ChatMessageVO } from "../../composables/api/chat/message";

/**
 * ws 请求 消息类型 1用户认证、2心跳检测
 */
export enum WsMsgType {
  /**
   * 登录认证
   */
  CHECK_TOKEN = 1,
  /**
   * 心跳包
   */
  HEARTBEAT,
}


export enum WsStatusEnum {
  CONNECTION = 0,
  OPEN = 1,
  SAFE_CLOSE = 2,
  CLOSE = 3,
}


/**
 * 发送websocket消息DTO
 */
export interface WsSendMsgDTO {
  /**
   * 发送消息类型
   */
  type: WsMsgType
  /**
   * 内容
   */
  data: any
}


/**
 * 发送websocket消息DTO
 */
export interface WsMsgVO extends Result<WsMsgBodyVO> {

}

export interface WsMsgBodyVO<T = WsMsgBodyType> {
  type: T
  data: ChatMessageVO | WSOnlineOfflineNotify | WSMsgRecall | WSFriendApply | WSMemberChange | WSRtcCallMsg
}


/*
* 系统推送 - 消息类型

1. 新消息类型，包含结果定义
2. 上下线通知类型，包含通知定义
3. 消息撤回类型，包含消息撤回定义
4. 好友申请类型，包含好友申请定义
5. 成员变动类型，包含成员变动定义
6. 使前端的token失效，意味着前端需要重新登录
*/
export enum WsMsgBodyType {
  /**
   * 新消息
   */
  MESSAGE = 1,
  /**
   * 用户下线通知
   */
  ONLINE_OFFLINE_NOTIFY = 2,
  /**
   * 消息撤回通知
   */
  RECALL = 3,
  /**
   * 好友申请
   */
  APPLY = 4,
  /**
   * 成员变动
   */
  MEMBER_CHANGE = 5,
  /**
   * token失效
   */
  TOKEN_EXPIRED_ERR = 6,
  /**
   * 消息删除通知
   */
  DELETE = 8,
  /**
   * 实时通话
   */
  RTC_CALL = 9,
  /**
   * 置顶通知
   */
  PIN_CONTACT = 10,
  /**
   * 会话信息更新通知
   */
  UPDATE_CONTACT_INFO = 12,
}

// 上下线通知类型定义
export interface WSOnlineOfflineNotify {
  changeList: ChatMemberVO[]
  onlineNum: number
}


/**
 * RTC信令交互消息
 */
export interface RtcBodyMsgVO {
  // 通话ID
  callId?: number;
  // 信令类型
  signalType: SignalTypeEnum;
  // 信令数据
  data: any;
  // 接收者ID列表
  receiverIds: string[];
  // 发送者ID
  senderId?: string;
  // 通话状态
  status: CallStatusEnum;
  // 通话类型
  type: CallTypeEnum;
  // 开始时间戳
  startTime: number;
  // 结束时间戳
  endTime?: number;
}

export interface OnlineOffItem {
  activeStatus: ChatOfflineType
  avatar: string
  lastOptTime: number
  userId: string
}

// 消息撤回类型定义
export interface WSMsgRecall {
  msgId: number
  recallUid: string
  roomId: number
}

// 消息删除类型定义
export interface WSMsgDelete {
  msgId: number
  deleteUid: string
  roomId: number
}

export interface WSFriendApply {
  // 好友申请类型定义
  // ...
}

// 成员变动类型定义
export interface WSMemberChange {
  changeType: WSMemberStatusEnum
  roomId: number
  uid: string
}
export enum WSMemberStatusEnum {
  JOIN = 1, // 加入
  LEAVE = 2, // 离开
  DEL = 3, // 删除群聊
}

// 置顶通知类型定义
export interface WSPinContactMsg {
  pinTime: number
  roomId: number
  isPin: isTrue
}
// 免打扰通知类型定义
export interface WSUpdateContactInfoMsg {
  roomId: number
  noticeStatus: number
  shieldStatus: number
}

export enum AiRoleEnums {
  ASSISTANT = "assistant",
  SYSTEM = "system",
  USER = "user",
}

// export enum AiModelCode {
//   KIMI_AI = 1, // kimi
//   XUNFEI_AI = 2,
// }

export interface WsMsgDataTypeMap<T> {
  [WsMsgBodyType.MESSAGE]: ChatMessageVO
  [WsMsgBodyType.ONLINE_OFFLINE_NOTIFY]: WSOnlineOfflineNotify
  [WsMsgBodyType.RECALL]: WSMsgRecall
  [WsMsgBodyType.DELETE]: WSMsgDelete
  [WsMsgBodyType.APPLY]: WSFriendApply
  [WsMsgBodyType.MEMBER_CHANGE]: WSMemberChange
  [WsMsgBodyType.TOKEN_EXPIRED_ERR]: null
  [WsMsgBodyType.RTC_CALL]: WSRtcCallMsg
  [WsMsgBodyType.PIN_CONTACT]: WSPinContactMsg
  [WsMsgBodyType.UPDATE_CONTACT_INFO]: WSUpdateContactInfoMsg
}


