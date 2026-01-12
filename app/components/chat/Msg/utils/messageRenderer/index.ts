// ============= Core =============
export { MessageNodeRegistry } from "./core/registry";
export type { BaseToken, MessageNode, MessageNodeConfig, ParseContext, ParseMatch } from "./core/types";

// ============= Deprecated =============
/**
 * @deprecated 推荐使用 MessageContent 组件替代
 * 保留此导出以兼容旧代码
 */
// ============= Components =============
export { defaultRegistry, MessageContent } from "./MessageContent";

// ============= Nodes =============
export { MentionNode, TextNode, UrlNode } from "./nodes";

export type { MentionToken, TextToken, UrlToken } from "./nodes";
