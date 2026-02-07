import type { PropType } from "vue";
import type { BaseToken, ParseContext, ParseMatch } from "../core/types";
import { defineComponent } from "vue";
import { MSG_CTX_NAMES } from "~/constants/msgContext";
import { MessageNode } from "../core/types";

/**
 * 文本节点 Token
 */
export interface TextToken extends BaseToken {
  type: "text";
}

/**
 * 文本节点（兜底节点，不参与解析）
 */
export class TextNode extends MessageNode<TextToken> {
  name = "text";
  priority = 999; // 最低优先级

  parse(_context: ParseContext): ParseMatch[] {
    // 文本节点由 Registry 自动填充，不需要解析
    return [];
  }

  createToken(match: ParseMatch): TextToken {
    return {
      type: "text",
      content: match.content,
      start: match.start,
      end: match.end,
    };
  }

  render = defineComponent({
    name: "TextToken",
    props: {
      token: {
        type: Object as PropType<TextToken>,
        required: true,
      },
    },
    setup(props) {
      return () => <span ctx-name={MSG_CTX_NAMES.CONTENT}>{props.token.content}</span>;
    },
  });
}
