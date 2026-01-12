# 消息渲染器 (MessageRenderer)

基于 TipTap Extension 模式设计的可扩展消息渲染系统。

## 📂 目录结构

```
messageRenderer/
├── core/                      # 核心系统
│   ├── types.ts              # 类型定义和抽象基类
│   └── registry.ts           # 节点注册器
├── nodes/                     # 节点实现
│   ├── TextNode.tsx          # 文本节点
│   ├── MentionNode.tsx       # @mention 节点
│   ├── UrlNode.tsx           # URL 链接节点
│   └── index.ts              # 节点导出
├── MessageContent.tsx         # 主渲染组件
└── index.ts                  # 统一导出
```

## 🎯 设计理念

参考 **TipTap Extension** 模式，每个节点自包含：

- ✅ **解析逻辑** - `parse()` 方法
- ✅ **Token 构建** - `createToken()` 方法
- ✅ **渲染组件** - TSX 组件
- ✅ **优先级配置** - `priority` 属性

## 🚀 快速开始

### 基础使用

```vue
<script setup lang="ts">
import { MessageContent } from "~/components/chat/Msg";

const msg = {
  message: {
    content: "Hello @张三 check out https://example.com",
    body: {
      mentionList: [{ uid: "123", displayName: "@张三" }],
      urlContentMap: { "https://example.com": { title: "Example" } }
    }
  }
};
</script>

<template>
  <MessageContent :msg="msg" />
</template>
```

### 自定义节点注册

```ts
import { MentionNode, MessageNodeRegistry, UrlNode } from "~/components/chat/Msg";

// 创建自定义注册器
const customRegistry = new MessageNodeRegistry().registerAll([
  new MentionNode().getConfig(),
  new UrlNode().getConfig(),
  // 添加更多自定义节点...
]);
```

```vue
<MessageContent :msg="msg" :registry="customRegistry" />
```

## 📝 创建自定义节点

### 1. 定义 Token 类型

```ts
// nodes/EmojiNode.tsx
import type { BaseToken } from "../core/types";

export interface EmojiToken extends BaseToken {
  type: "emoji";
  data: {
    code: string;
    unicode: string;
  };
}
```

### 2. 创建节点类

```tsx
import type { ParseContext, ParseMatch } from "../core/types";
import { MessageNode } from "../core/types";

export class EmojiNode extends MessageNode<EmojiToken> {
  name = "emoji";
  priority = 3; // 数字越小优先级越高

  // 解析函数：从文本中提取匹配项
  parse(context: ParseContext): ParseMatch[] {
    const emojiRegex = /:(\w+):/g;
    const matches: ParseMatch[] = [];

    let match = emojiRegex.exec(context.content);
    while (match !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        content: match[0],
        data: {
          code: match[1],
          unicode: getEmojiUnicode(match[1])
        }
      });
      match = emojiRegex.exec(context.content);
    }

    return matches;
  }

  // Token 构建函数
  createToken(match: ParseMatch): EmojiToken {
    return {
      type: "emoji",
      content: match.content,
      start: match.start,
      end: match.end,
      data: match.data!
    };
  }

  // TSX 渲染组件
  render = defineComponent({
    name: "EmojiToken",
    props: {
      token: {
        type: Object as PropType<EmojiToken>,
        required: true
      }
    },
    setup(props) {
      return () => (
        <span class="emoji" title={props.token.data.code}>
          {props.token.data.unicode}
        </span>
      );
    }
  });
}
```

### 3. 注册并使用

```ts
import { defaultRegistry } from "~/components/chat/Msg";
import { EmojiNode } from "./nodes/EmojiNode";

// 扩展默认注册器
const myRegistry = new MessageNodeRegistry()
  .registerAll(defaultRegistry.getAllNodes())
  .register(new EmojiNode().getConfig());
```

## 🔧 核心 API

### MessageNode (抽象基类)

```ts
abstract class MessageNode<TToken extends BaseToken> {
  abstract name: string; // 节点唯一标识
  abstract priority: number; // 优先级（1-999）
  abstract parse(context: ParseContext): ParseMatch[];
  abstract createToken(match: ParseMatch): TToken;
  abstract render: Component; // TSX 组件

  getConfig(): MessageNodeConfig; // 获取节点配置
}
```

### MessageNodeRegistry

```ts
class MessageNodeRegistry {
  register(config: MessageNodeConfig): this;
  registerAll(configs: MessageNodeConfig[]): this;
  getAllNodes(): MessageNodeConfig[];
  parse(context: ParseContext): BaseToken[];
}
```

### ParseContext

```ts
interface ParseContext {
  content: string; // 消息文本内容
  msg: ChatMessageVO; // 完整消息对象
}
```

### ParseMatch

```ts
interface ParseMatch<TData = unknown> {
  start: number; // 匹配起始位置
  end: number; // 匹配结束位置
  content: string; // 匹配的文本
  data?: TData; // 附加数据
}
```

## 📦 内置节点

### TextNode (优先级: 999)

- 渲染普通文本
- 自动填充，无需手动解析

### MentionNode (优先级: 1)

- 解析 @mention
- 点击跳转用户页面
- 每个用户只匹配一次

### UrlNode (优先级: 2)

- 解析 URL 链接
- 支持自定义标题
- 自动补全协议 (http://)

## ⚙️ 优先级规则

当多个节点匹配到重叠区域时：

1. **按优先级排序**：数字越小优先级越高
2. **解决冲突**：优先级高的节点优先保留
3. **位置优先**：相同优先级时，位置靠前的优先

示例：

```
内容: "check @user at https://example.com"

MentionNode (priority: 1) → 匹配 "@user"
UrlNode (priority: 2)     → 匹配 "https://example.com"

如果 "@user" 中包含 URL，MentionNode 优先
```

## 🎨 样式定制

节点渲染的 TSX 组件可使用 UnoCSS 类：

```tsx
render = defineComponent({
  setup(props) {
    return () => (
      <span class="text-primary cursor-pointer font-bold hover:underline">
        {props.token.content}
      </span>
    );
  }
});
```

## 🔄 迁移指南

### 从旧版 useRenderMsg 迁移

```vue
<!-- 旧写法 -->
<script setup>
import { MessageContent, useRenderMsg } from "~/components/chat/Msg";
</script>

<script setup>
const { renderMessageContent } = useRenderMsg(msg);
</script>

<!-- 新写法 -->
<template>
  <component :is="renderMessageContent" />
</template>

<template>
  <MessageContent :msg="msg" />
</template>
```

## 📖 示例场景

### 场景 1: 添加代码块节点

````tsx
// nodes/CodeBlockNode.tsx
export class CodeBlockNode extends MessageNode<CodeBlockToken> {
  name = "codeblock";
  priority = 2;

  parse(context: ParseContext): ParseMatch[] {
    const codeRegex = /```(\w+)?\n([\s\S]*?)```/g;
    // ... 解析逻辑
  }

  render = defineComponent({
    setup(props) {
      return () => (
        <pre class="rounded bg-gray-100 p-4">
          <code class={`language-${props.token.data.lang}`}>
            {props.token.data.code}
          </code>
        </pre>
      );
    }
  });
}
````

### 场景 2: 话题标签节点

```tsx
// nodes/HashtagNode.tsx
export class HashtagNode extends MessageNode<HashtagToken> {
  name = "hashtag";
  priority = 3;

  parse(context: ParseContext): ParseMatch[] {
    const hashtagRegex = /#(\w+)/g;
    // ... 解析逻辑
  }

  render = defineComponent({
    setup(props) {
      const handleClick = () => {
        navigateTo(`/topics/${props.token.data.tag}`);
      };

      return () => (
        <span class="cursor-pointer text-blue-500" onClick={handleClick}>
          #
          {props.token.data.tag}
        </span>
      );
    }
  });
}
```

## 🤝 与 TipTap 的对比

| 概念     | TipTap           | MessageRenderer     |
| -------- | ---------------- | ------------------- |
| 扩展单位 | Extension        | MessageNode         |
| 注册器   | EditorExtensions | MessageNodeRegistry |
| 渲染组件 | EditorContent    | MessageContent      |
| 解析函数 | parseHTML        | parse               |
| 优先级   | priority         | priority            |

## ⚡ 性能优化

1. **解析缓存**：`MessageContent` 使用 `computed` 缓存解析结果
2. **按需解析**：只有内容变化时才重新解析
3. **优先级排序**：Registry 自动排序，减少冲突检测
4. **文本节点复用**：TextNode 不参与解析，由 Registry 自动填充

## 🐛 调试技巧

### 查看解析结果

```ts
import { defaultRegistry } from "~/components/chat/Msg";

const tokens = defaultRegistry.parse({
  content: "Hello @user https://example.com",
  msg: yourMessage
});

console.log(tokens);
// [
//   { type: "text", content: "Hello ", start: 0, end: 6 },
//   { type: "mention", content: "@user", start: 6, end: 11, data: {...} },
//   { type: "text", content: " ", start: 11, end: 12 },
//   { type: "url", content: "https://example.com", start: 12, end: 31, data: {...} }
// ]
```

### 自定义节点优先级测试

```ts
const testRegistry = new MessageNodeRegistry().registerAll([
  { ...new MentionNode().getConfig(), priority: 10 },
  { ...new UrlNode().getConfig(), priority: 1 }
]);

// UrlNode 现在优先级更高
```

## 📚 相关资源

- [TipTap Extension API](https://tiptap.dev/api/extensions)
- [Vue 3 TSX 支持](https://vuejs.org/guide/extras/render-function.html)
- [UnoCSS 文档](https://unocss.dev/)
