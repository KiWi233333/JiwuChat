import type { PropType } from "vue";
import type { BaseToken, ParseContext, ParseMatch } from "../core/types";
import type { MentionInfo, TextBodyMsgVO } from "~/composables/api/chat/message";
import { defineComponent } from "vue";
import { MessageNode } from "../core/types";

/**
 * @mention 节点 Token
 */
export interface MentionToken extends BaseToken {
  type: "mention";
  data: MentionInfo;
}

/**
 * @mention 节点
 */
export class MentionNode extends MessageNode<MentionToken> {
  name = "mention";
  priority = 1; // 高优先级

  parse(context: ParseContext): ParseMatch<MentionInfo>[] {
    const body = context.msg?.message?.body as TextBodyMsgVO | undefined;
    const mentions = body?.mentionList || [];

    if (!mentions.length)
      return [];

    const matches: ParseMatch<MentionInfo>[] = [];
    const usedMentions = new Set<string>();

    for (const mention of mentions) {
      // 每个用户只匹配一次
      if (usedMentions.has(mention.uid))
        continue;

      const index = context.content.indexOf(mention.displayName);
      if (index !== -1) {
        matches.push({
          start: index,
          end: index + mention.displayName.length,
          content: mention.displayName,
          data: mention,
        });
        usedMentions.add(mention.uid);
      }
    }

    return matches;
  }

  createToken(match: ParseMatch<MentionInfo>): MentionToken {
    return {
      type: "mention",
      content: match.content,
      start: match.start,
      end: match.end,
      data: match.data!,
    };
  }

  render = defineComponent({
    name: "MentionToken",
    props: {
      token: {
        type: Object as PropType<MentionToken>,
        required: true,
      },
    },
    setup(props) {
      const handleClick = () => {
        navigateTo({
          path: "/user",
          query: { id: props.token.data.uid },
        });
      };

      return () => (
        <span
          class="at-user cursor-pointer"
          title={`前往 ${props.token.data?.displayName} 的主页`}
          data-display-name={props.token.data?.displayName}
          data-user-id={props.token.data?.uid}
          ctx-name="content"
          onClick={handleClick}
        >
          {props.token.content}
        </span>
      );
    },
  });
}
