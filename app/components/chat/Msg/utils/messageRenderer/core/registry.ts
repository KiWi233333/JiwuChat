import type { BaseToken, MessageNodeConfig, ParseContext } from "./types";
import { MessageNode } from "./types";

/**
 * 替换项（内部使用）
 */
interface Replacement {
  start: number;
  end: number;
  priority: number;
  token: BaseToken;
}

/**
 * 节点注册器（类似 TipTap EditorExtensions）
 */
export class MessageNodeRegistry {
  private nodes: Map<string, MessageNodeConfig> = new Map();

  /**
   * 注册节点
   */
  register(config: MessageNodeConfig): this {
    this.nodes.set(config.name, config);
    return this;
  }

  /**
   * 批量注册节点（可传单个节点或节点数组）
   * 自动从节点对象读取配置（即如果传入节点实例，自动提取其 config 属性）
   */
  registerAll(nodes: Array<MessageNodeConfig | MessageNode>): this {
    for (const item of nodes) {
      // 支持节点实例（有 config 属性）或直接为 config 对象
      const config = item instanceof MessageNode ? item.getConfig() : item;
      this.register(config);
    }
    return this;
  }

  /**
   * 获取所有节点配置（按优先级排序）
   */
  getAllNodes(): MessageNodeConfig[] {
    return Array.from(this.nodes.values()).sort((a, b) => a.priority - b.priority);
  }

  /**
   * 解析消息内容为 Token 数组
   */
  parse(context: ParseContext): BaseToken[] {
    const replacements: Replacement[] = [];

    // 1. 收集所有节点的解析结果
    for (const node of this.getAllNodes()) {
      const matches = node.parse(context);

      for (const match of matches) {
        const token = node.createToken(match);
        replacements.push({
          start: match.start,
          end: match.end,
          priority: node.priority,
          token,
        });
      }
    }

    // 2. 解决重叠冲突（优先级高的优先）
    const resolved = this.resolveOverlaps(replacements);

    // 3. 构建最终 Token 数组（包含文本节点）
    return this.buildTokens(context.content, resolved);
  }

  /**
   * 解决重叠冲突
   */
  private resolveOverlaps(replacements: Replacement[]): Replacement[] {
    if (replacements.length === 0)
      return [];

    // 按位置和优先级排序
    const sorted = [...replacements].sort((a, b) => {
      if (a.start !== b.start)
        return a.start - b.start;
      return a.priority - b.priority;
    });

    const filtered: Replacement[] = [];

    for (const current of sorted) {
      const hasConflict = filtered.some((existing) => {
        return (
          (current.start >= existing.start && current.start < existing.end)
          || (current.end > existing.start && current.end <= existing.end)
          || (current.start <= existing.start && current.end >= existing.end)
        );
      });

      if (!hasConflict) {
        filtered.push(current);
      }
    }

    return filtered.sort((a, b) => a.start - b.start);
  }

  /**
   * 构建 Token 数组（填充文本节点）
   */
  private buildTokens(content: string, replacements: Replacement[]): BaseToken[] {
    const tokens: BaseToken[] = [];
    let currentIndex = 0;

    for (const replacement of replacements) {
      // 添加前面的文本节点
      if (currentIndex < replacement.start) {
        tokens.push({
          type: "text",
          content: content.slice(currentIndex, replacement.start),
          start: currentIndex,
          end: replacement.start,
        });
      }

      // 添加当前节点
      tokens.push(replacement.token);
      currentIndex = replacement.end;
    }

    // 添加剩余文本
    if (currentIndex < content.length) {
      tokens.push({
        type: "text",
        content: content.slice(currentIndex),
        start: currentIndex,
        end: content.length,
      });
    }

    return tokens;
  }
}
