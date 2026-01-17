import type { PropType } from "vue";
import type { BaseToken, ParseContext, ParseMatch } from "../core/types";
import type { TextBodyMsgVO, UrlInfoDTO } from "~/composables/api/chat/message";
import { computed, defineComponent } from "vue";
import { MessageNode } from "../core/types";

/**
 * URL 节点 Token
 */
export interface UrlToken extends BaseToken {
  type: "url";
  data: UrlInfoDTO & { url: string; altTitle?: string };
}

/**
 * URL 节点
 */
export class UrlNode extends MessageNode<UrlToken> {
  name = "url";
  priority = 2; // 中优先级

  parse(context: ParseContext): ParseMatch<UrlInfoDTO & { url: string }>[] {
    const body = context.msg?.message?.body as TextBodyMsgVO | undefined;
    const urlMap = body?.urlContentMap || {};

    if (!Object.keys(urlMap).length)
      return [];

    const matches: ParseMatch<UrlInfoDTO & { url: string }>[] = [];

    for (const [url, urlInfo] of Object.entries(urlMap)) {
      // 查找所有出现位置
      const positions = this.findAllOccurrences(context.content, url);

      for (const start of positions) {
        matches.push({
          start,
          end: start + url.length,
          content: url,
          data: { ...urlInfo, url },
        });
      }
    }

    return matches;
  }

  createToken(match: ParseMatch<UrlInfoDTO & { url: string }>): UrlToken {
    const data = match.data!;
    // 生成 altTitle：title缩略 + 原始URL
    const shortTitle = data.title?.replace(/^(\S{8})\S+(\S{4})$/, "$1...$2") || "未知网站";
    const altTitle = `${shortTitle} (${data.url})`;

    return {
      type: "url",
      content: match.content, // 保持原始 URL 作为显示内容
      start: match.start,
      end: match.end,
      data: {
        ...data,
        altTitle,
      },
    };
  }

  /**
   * 查找所有出现位置
   */
  private findAllOccurrences(content: string, search: string): number[] {
    const positions: number[] = [];
    let searchIndex = 0;

    while (true) {
      const index = content.indexOf(search, searchIndex);
      if (index === -1)
        break;

      positions.push(index);
      searchIndex = index + search.length;
    }

    return positions;
  }

  render = defineComponent({
    name: "UrlToken",
    props: {
      token: {
        type: Object as PropType<UrlToken>,
        required: true,
      },
    },
    setup(props) {
      const fullUrl = computed(() => {
        const url = props.token.data?.url;
        if (!url)
          return "";

        return url.startsWith("/") || url.includes("://")
          ? url
          : `http://${url}`;
      });

      return () => (
        <a
          href={fullUrl.value}
          ctx-name="urllink"
          data-url={fullUrl.value}
          target="_blank"
          rel="noopener noreferrer"
          class="msg-link"
          title={props.token.data?.altTitle || fullUrl.value}
        >
          {props.token.content}
        </a>
      );
    },
  });
}
