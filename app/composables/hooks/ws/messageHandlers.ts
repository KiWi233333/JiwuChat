import type { MessageHandler } from "./messageConfig";
import type { WsMsgItemMap } from "./messages";

/**
 * 存储消息到列表
 * 将消息数据 push 到对应的 wsMsgList 中
 */
export const storeToList: MessageHandler = (data, ctx) => {
  const { wsMsgList } = useWsMessage();
  const key = ctx.key as keyof WsMsgItemMap;
  const list = wsMsgList.value[key];
  if (list) {
    list.push(data);
  }
  else {
    wsMsgList.value[key] = [data];
  }
};

/**
 * 发送事件通知
 * 通过 mitter 发送消息事件
 */
export const emitEvent: MessageHandler = (data, ctx) => {
  mitter.emit(resolteChatPath(ctx.type), data);
};

/**
 * 处理通知
 * 调用通知处理逻辑
 */
export const handleNotify: MessageHandler = (_data, ctx) => {
  const { handleNotification } = useWsNotification();
  handleNotification(ctx.rawMsg);
};

/**
 * 标准处理器组合
 * 适用于大多数消息：存储 + 事件 + 通知
 */
export const standardHandlers: MessageHandler[] = [
  storeToList,
  emitEvent,
  handleNotify,
];

/**
 * 静默处理器组合
 * 只存储和发送事件，不触发通知
 */
export const silentHandlers: MessageHandler[] = [
  storeToList,
  emitEvent,
];
