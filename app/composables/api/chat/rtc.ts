import type { ChatMessageVO } from "./message";
import type { RtcBodyMsgVO } from "~/types/chat/WsType";
import type { Result } from "~/types/result";
import { useHttp } from "~/composables/utils/useHttp";

/**
 * 发送消息
 * @param roomId 房间ID
 * @param dto 消息DTO
 * @param token 登录令牌
 */
export function addChatRTCMessage(roomId: number, dto: AddChatRTCMessageDTO, token: string) {
  return useHttp.post<Result<ChatMessageVO<RtcBodyMsgVO>>>(
    `/chat/message/rtc/${roomId}`,
    {
      receiverIds: dto.receiverIds,
      callType: dto.callType,
      signalType: dto.signalType,
      data: dto.data,
    },
    { headers: { Authorization: token } },
  );
}

/**
 * 获取聊天消息
 * @param roomId 房间ID
 * @param token 登录令牌
 */
export function getChatRTCMessage(
  roomId: number,
  token: string,
) {
  return useHttp.get<Result<WSRtcCallMsg>>(
    `/chat/message/rtc/${roomId}`,
    {},
    { headers: { Authorization: token } },
  );
}

/**
 * 更新RTC消息状态
 * @param roomId 房间ID
 * @param dto 消息DTO
 * @param token 登录令牌
 */
export function updateChatRTCMessage(roomId: number, dto: UpdateChatRTCMessageDTO, token: string) {
  return useHttp.put<Result<ChatMessageVO>>(
    `/chat/message/rtc/${roomId}`,
    {
      ...dto,
    },
    { headers: { Authorization: token } },
  );
}

/**
 * 挂断RTC通话
 * @param roomId 房间ID
 * @param token 登录令牌
 */
export function hangUpRTCCall(roomId: number, token: string) {
  return useHttp.deleted<Result<ChatMessageVO>>(
    `/chat/message/rtc/${roomId}`,
    {},
    { headers: { Authorization: token } },
  );
}

// 发送消息DTO
export interface AddChatRTCMessageDTO {
  callType: CallTypeEnum;
  signalType: SignalTypeEnum;
  data: RTCSessionDescriptionInit;
  receiverIds?: string[];
}
// 修改消息DTO
export interface UpdateChatRTCMessageDTO {
  status?: CallStatusEnum;
  signalType?: SignalTypeEnum;
  data?: any;
}

// 信令类型枚举
export enum SignalTypeEnum {
  JOIN = "join",
  OFFER = "offer",
  ANSWER = "answer",
  CANDIDATE = "candidate",
  LEAVE = "leave",
}

// 通话状态枚举
export enum CallStatusEnum {
  CALLING = 1, // 呼叫
  ACCEPT = 2, // 接听
  END = 3, // 结束
  REJECT = 4, // 拒绝
  ERROR = 5, // 错误中断
  BUSY = 6, // 忙线中
  CANCEL = 7, // 取消
}

// 通话类型枚举
export enum CallTypeEnum {
  AUDIO = 1, // 语音通话
  VIDEO = 2, // 视频通话
}

// WebRTC 通话消息接口
export interface WSRtcCallMsg {
  // 房间ID
  roomId: number;
  // 通话ID
  callId: number;
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
