/**
 * 消息组件工具集
 *
 * 此文件是主入口,统一导出所有消息相关的工具函数、组件和类型定义
 *
 * @module chat/Msg
 */

// ============= 常量 =============
export * from "./utils/constants";
export { RECALL_TIME_OUT } from "./utils/constants";

// ============= 上下文菜单 =============
export { onMsgContextMenu } from "./utils/contextMenu";

export * from "./utils/contextMenu/permissions";
// ============= 图片工具 =============
export { getImgSize } from "./utils/imageUtils";

// ============= 消息操作 =============
export { deleteMsg, refundMsg } from "./utils/messageActions";

// ============= 消息渲染 =============
export { defaultRegistry, MessageContent } from "./utils/messageRenderer";

// ============= 类型定义 =============
export * from "./utils/types";
