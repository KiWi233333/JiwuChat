import type { PropType } from "vue";
import type { BaseToken } from "./core/types";
import type { ChatMessageVO } from "~/composables/api/chat/message";
import { computed, defineComponent, h } from "vue";
import { MSG_CTX_NAMES } from "~/constants/msgContext";
import { MessageNodeRegistry } from "./core/registry";
import { MentionNode, TextNode, UrlNode } from "./nodes";

/**
 * 默认节点注册器（预注册常用节点）
 */
export const defaultRegistry = new MessageNodeRegistry().registerAll([
  new TextNode().getConfig(),
  new MentionNode().getConfig(),
  new UrlNode().getConfig(),
]);

/**
 * Token 渲染组件
 */
const TokenRenderer = defineComponent({
  name: "TokenRenderer",
  props: {
    token: {
      type: Object as PropType<BaseToken>,
      required: true,
    },
    registry: {
      type: Object as PropType<MessageNodeRegistry>,
      required: true,
    },
  },
  setup(props) {
    return () => {
      // 查找对应的节点配置
      const node = props.registry
        .getAllNodes()
        .find(n => n.name === props.token.type);

      if (!node) {
        // 降级到文本渲染
        return <span>{props.token.content}</span>;
      }

      // 使用 h() 函数动态渲染节点组件
      return h(node.render, { token: props.token });
    };
  },
});

/**
 * 消息内容渲染组件（类似 TipTap EditorContent）
 */
export const MessageContent = defineComponent({
  name: "MessageContent",
  props: {
    msg: {
      type: Object as PropType<ChatMessageVO>,
      required: true,
    },
    registry: {
      type: Object as PropType<MessageNodeRegistry>,
      default: () => defaultRegistry,
    },
  },
  setup(props) {
    const tokens = computed(() => {
      const content = props.msg.message.content || "";
      if (!content)
        return [];

      return props.registry.parse({
        content,
        msg: props.msg,
      });
    });

    return () => (
      <span ctx-name={MSG_CTX_NAMES.CONTENT}>
        {tokens.value.map((token, index) => (
          <TokenRenderer
            key={`${token.type}-${token.start}-${index}`}
            token={token}
            registry={props.registry}
          />
        ))}
      </span>
    );
  },
});
