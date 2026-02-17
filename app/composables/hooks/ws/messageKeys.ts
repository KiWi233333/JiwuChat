/**
 * WebSocket 消息类型的键名枚举
 * 用于统一管理消息在 wsMsgList 中的字段名
 */
export enum WsMsgKey {
  /** 普通消息 */
  NEW_MSG = "newMsg",
  /** 上线/下线通知 */
  ONLINE_NOTICE = "onlineNotice",
  /** 撤回消息 */
  RECALL_MSG = "recallMsg",
  /** 删除消息 */
  DELETE_MSG = "deleteMsg",
  /** 好友申请 */
  APPLY_MSG = "applyMsg",
  /** 成员变更 */
  MEMBER_MSG = "memberMsg",
  /** Token 过期 */
  TOKEN_MSG = "tokenMsg",
  /** RTC 通话 */
  RTC_MSG = "rtcMsg",
  /** 置顶联系人 */
  PIN_CONTACT_MSG = "pinContactMsg",
  /** AI 流式消息 */
  AI_STREAM_MSG = "aiStreamMsg",
  /** 更新联系人信息 */
  UPDATE_CONTACT_INFO_MSG = "updateContactInfoMsg",
  /** 消息表情反应 */
  REACTION_MSG = "reactionMsg",
  /** 未配置的消息类型 */
  OTHER = "other",
}
