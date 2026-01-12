import type { Component } from "vue";
import type { ChatMessageVO } from "~/composables/api/chat/message";

/**
 * 基础 Token 接口
 */
export interface BaseToken {
  type: string;
  content: string;
  start: number;
  end: number;
}

/**
 * 节点解析上下文
 */
export interface ParseContext {
  /** 消息内容 */
  content: string;
  /** 完整消息对象 */
  msg: ChatMessageVO;
}

/**
 * 解析结果（单个匹配）
 */
export interface ParseMatch<TData = unknown> {
  /** 匹配的起始位置 */
  start: number;
  /** 匹配的结束位置 */
  end: number;
  /** 匹配的原始文本 */
  content: string;
  /** 附加数据 */
  data?: TData;
}

/**
 * 节点配置接口（类似 TipTap Extension）
 */
export interface MessageNodeConfig<TToken extends BaseToken = BaseToken> {
  /** 节点名称（唯一标识） */
  name: string;

  /** 优先级（数字越小优先级越高） */
  priority: number;

  /**
   * 解析函数：从消息内容中提取匹配项
   * @param context 解析上下文
   * @returns 解析匹配结果数组
   */
  parse: (context: ParseContext) => ParseMatch[];

  /**
   * Token 构建函数：将解析结果转换为 Token
   * @param match 解析匹配结果
   * @returns Token 对象
   */
  createToken: (match: ParseMatch) => TToken;

  /**
   * 渲染组件：TSX 组件用于渲染 Token
   */
  render: Component;
}

/**
 * 节点类抽象基类（类似 TipTap Extension 基类）
 */
export abstract class MessageNode<TToken extends BaseToken = BaseToken> {
  abstract name: string;
  abstract priority: number;
  abstract parse(context: ParseContext): ParseMatch[];
  abstract createToken(match: ParseMatch): TToken;
  abstract render: Component;

  /** 获取节点配置 */
  getConfig(): MessageNodeConfig<TToken> {
    return {
      name: this.name,
      priority: this.priority,
      parse: this.parse.bind(this),
      createToken: this.createToken.bind(this),
      render: this.render,
    };
  }
}
