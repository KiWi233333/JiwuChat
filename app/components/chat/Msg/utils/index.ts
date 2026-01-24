/**
 * 消息工具集合 - 统一导出
 */

// 常量
export * from "./constants";

// 上下文菜单
export { onMsgContextMenu } from "./contextMenu";

export * from "./contextMenu/permissions";
// 图片工具
export { getImgSize } from "./imageUtils";

// 消息操作
export { deleteMsg, refundMsg } from "./messageActions";

// 消息渲染
export { defaultRegistry, MessageContent } from "./messageRenderer";
export { MessageNodeRegistry } from "./messageRenderer";
export type { BaseToken, MessageNode, MessageNodeConfig, ParseContext, ParseMatch } from "./messageRenderer";

// 类型
export * from "./types";
