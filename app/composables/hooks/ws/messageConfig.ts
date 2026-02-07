import type { WsMsgBodyType, WsMsgBodyVO } from "~/types/chat/WsType";

/** 消息处理上下文 */
export interface MessageContext<T = any> {
  /** 消息键名（如 'newMsg'） */
  key: string;
  /** 消息类型枚举 */
  type: WsMsgBodyType;
  /** 原始消息对象 */
  rawMsg: WsMsgBodyVO;
  /** 消息数据 */
  data: T;
}

/** 消息处理器函数 */
export type MessageHandler<T = any> = (data: T, ctx: MessageContext<T>) => void;

/** 单个消息类型配置 */
export interface MessageTypeConfig<K extends string = string, T extends any[] = any[]> {
  /** 消息在 wsMsgList 中的键名 */
  key: K;
  /** 用于类型推断的数组类型 */
  type: T;
  /** 处理器列表 */
  handlers: MessageHandler<T[number]>[];
}

/**
 * 定义消息配置的工具函数
 * 提供类型约束和智能提示
 */
export function defineMessageConfig<
  T extends Record<WsMsgBodyType, MessageTypeConfig<string, any[]>>,
>(config: T) {
  return config;
}

/**
 * 从配置推断消息映射类型
 * 自动生成 WsMsgItemMap 接口
 * 直接提取 type 字段的类型，无需 infer
 */
export type InferMessageMap<T extends Record<string, MessageTypeConfig<string, any[]>>> = {
  [K in keyof T as T[K]["key"]]: T[K]["type"];
};

/**
 * 执行消息处理流程
 * @param config 消息配置对象
 * @param msgData WebSocket 消息数据
 * @param wsMsgList 消息列表引用
 */
export function processMessage<T extends Record<WsMsgBodyType, MessageTypeConfig>>(
  config: T,
  msgData: Result<WsMsgBodyVO>,
  wsMsgList: Ref<any>,
) {
  if (!msgData)
    return;

  const wsMsg = msgData.data;
  const msgType = wsMsg.type;
  const body = wsMsg.data;

  // 查找配置
  const typeConfig = config[msgType];
  if (!typeConfig) {
    // 未配置的消息类型存入 other
    wsMsgList.value.other.push(body);
    return;
  }

  // 创建上下文
  const ctx: MessageContext = {
    key: typeConfig.key,
    type: msgType,
    rawMsg: wsMsg,
    data: body,
  };

  // 执行所有处理器
  for (const handler of typeConfig.handlers) {
    try {
      handler(body, ctx);
    }
    catch (error) {
      console.error(`Message handler error for ${ctx.key}:`, error);
    }
  }
}
