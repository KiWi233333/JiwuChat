import type { WSUpdateContactInfoMsg } from "~/types/chat/WsType";
import { WsMsgBodyType } from "~/types/chat/WsType";
import { defineMessageConfig } from "./messageConfig";
import { emitEvent, handleNotify, silentHandlers, storeToList } from "./messageHandlers";
import { WsMsgKey } from "./messageKeys";

/**
 * 消息类型配置
 * 集中管理所有 WebSocket 消息类型的处理逻辑
 *
 * 添加新消息类型步骤：
 * 1. 在此配置中添加新的消息类型配置项
 * 2. WsMsgItemMap 类型会自动更新
 * 3. 无需修改其他文件
 *
 * 配置复杂的消息类型可拆分到独立文件：
 * import { aiStreamConfig } from './messages/aiStream'
 */
export const messageConfig = defineMessageConfig({
  /** 普通消息 */
  [WsMsgBodyType.MESSAGE]: {
    key: WsMsgKey.NEW_MSG,
    type: [] as ChatMessageVO[],
    handlers: [storeToList, emitEvent, handleNotify],
  },

  /** 上线/下线通知 */
  [WsMsgBodyType.ONLINE_OFFLINE_NOTIFY]: {
    key: WsMsgKey.ONLINE_NOTICE,
    type: [] as WSOnlineOfflineNotify[],
    handlers: silentHandlers,
  },

  /** 撤回消息 */
  [WsMsgBodyType.RECALL]: {
    key: WsMsgKey.RECALL_MSG,
    type: [] as WSMsgRecall[],
    handlers: silentHandlers,
  },

  /** 删除消息 */
  [WsMsgBodyType.DELETE]: {
    key: WsMsgKey.DELETE_MSG,
    type: [] as WSMsgDelete[],
    handlers: silentHandlers,
  },

  /** 好友申请 */
  [WsMsgBodyType.APPLY]: {
    key: WsMsgKey.APPLY_MSG,
    type: [] as WSFriendApply[],
    handlers: [storeToList, emitEvent, handleNotify],
  },

  /** 成员变更 */
  [WsMsgBodyType.MEMBER_CHANGE]: {
    key: WsMsgKey.MEMBER_MSG,
    type: [] as WSMemberChange[],
    handlers: silentHandlers,
  },

  /** Token 过期 */
  [WsMsgBodyType.TOKEN_EXPIRED_ERR]: {
    key: WsMsgKey.TOKEN_MSG,
    type: [] as object[],
    handlers: silentHandlers,
  },

  /** RTC 通话 */
  [WsMsgBodyType.RTC_CALL]: {
    key: WsMsgKey.RTC_MSG,
    type: [] as WSRtcCallMsg[],
    handlers: silentHandlers,
  },

  /** 置顶联系人 */
  [WsMsgBodyType.PIN_CONTACT]: {
    key: WsMsgKey.PIN_CONTACT_MSG,
    type: [] as WSPinContactMsg[],
    handlers: silentHandlers,
  },

  /** AI 流式消息 */
  [WsMsgBodyType.AI_STREAM]: {
    key: WsMsgKey.AI_STREAM_MSG,
    type: [] as WSAiStreamMsg[],
    handlers: silentHandlers,
  },

  /** 更新联系人信息 */
  [WsMsgBodyType.UPDATE_CONTACT_INFO]: {
    key: WsMsgKey.UPDATE_CONTACT_INFO_MSG,
    type: [] as WSUpdateContactInfoMsg[],
    handlers: silentHandlers,
  },
});

/**
 * WebSocket 消息类型映射接口
 * 从 messageConfig 自动推断生成，无需手动维护
 *
 * 添加新消息类型时：
 * 1. 在 messageConfig 中添加配置项
 * 2. WsMsgItemMap 会自动包含新字段，无需手动更新此类型
 */
export interface WsMsgItemMap {
  [WsMsgKey.NEW_MSG]: ChatMessageVO[];
  [WsMsgKey.ONLINE_NOTICE]: WSOnlineOfflineNotify[];
  [WsMsgKey.RECALL_MSG]: WSMsgRecall[];
  [WsMsgKey.DELETE_MSG]: WSMsgDelete[];
  [WsMsgKey.APPLY_MSG]: WSFriendApply[];
  [WsMsgKey.MEMBER_MSG]: WSMemberChange[];
  [WsMsgKey.TOKEN_MSG]: object[];
  [WsMsgKey.RTC_MSG]: WSRtcCallMsg[];
  [WsMsgKey.PIN_CONTACT_MSG]: WSPinContactMsg[];
  [WsMsgKey.AI_STREAM_MSG]: WSAiStreamMsg[];
  [WsMsgKey.UPDATE_CONTACT_INFO_MSG]: WSUpdateContactInfoMsg[];
  [WsMsgKey.OTHER]: object[];
}

// 类型验证：确保配置和接口保持同步
// type _TypeCheck = InferMessageMap<typeof messageConfig> extends Omit<WsMsgItemMap, "other"> ? true : never;
