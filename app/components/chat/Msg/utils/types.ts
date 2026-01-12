/**
 * 消息相关类型定义
 */

/**
 * 图片尺寸配置选项
 */
export interface ImgSizeOptions {
  maxWidth: number;
  maxHeight: number;
  minWidth?: number;
  minHeight?: number;
}

/**
 * Token 类型
 */
export type TokenType = "text" | "mention" | "url";

/**
 * 基础 Token 接口
 */
export interface BaseToken {
  type: TokenType;
  content: string;
  startIndex: number;
  endIndex: number;
}

/**
 * @提及 Token
 */
export interface MentionToken extends BaseToken {
  type: "mention";
  data: MentionInfo;
}

/**
 * URL 链接 Token
 */
export interface UrlToken extends BaseToken {
  type: "url";
  data: UrlInfoDTO & {
    url: string;
    altTitle?: string;
  };
}

/**
 * 文本 Token
 */
export interface TextToken extends BaseToken {
  type: "text";
}

/**
 * 消息 Token 联合类型
 */
export type MessageToken = TextToken | MentionToken | UrlToken;

/**
 * 替换项接口
 */
export interface Replacement {
  start: number;
  end: number;
  type: "mention" | "url";
  data: any;
  displayText: string;
  priority: number;
}

/**
 * 范围接口
 */
export interface Range {
  start: number;
  end: number;
}
