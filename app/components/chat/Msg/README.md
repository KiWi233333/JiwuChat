# 消息组件工具集

此目录包含聊天消息相关的所有工具函数、组件和类型定义。

## 📁 目录结构

```
app/components/chat/Msg/
├── index.ts                    # 主入口，统一导出所有工具
├── utils/                      # 工具模块
│   ├── index.ts               # utils 统一导出
│   ├── constants.ts           # 常量定义
│   ├── types.ts               # 类型定义
│   ├── imageUtils.ts          # 图片处理工具
│   ├── messageActions.ts      # 消息操作（撤回、删除）
│   ├── contextMenu/           # 上下文菜单
│   │   ├── index.ts          # contextMenu 主入口
│   │   └── permissions.ts    # 权限检查函数
│   └── messageRenderer/       # 消息渲染
│       ├── index.ts          # messageRenderer 主入口
│       ├── types.ts          # Token 类型定义
│       ├── MessageContent.tsx # 消息内容主组件（TSX）
│       ├── parser/           # 消息解析器
│       │   ├── index.ts      # 解析器主函数
│       │   ├── mentionParser.ts    # @提及解析
│       │   ├── urlParser.ts        # URL 解析
│       │   ├── overlapResolver.ts  # 重叠处理
│       │   └── tokenBuilder.ts     # Token 构建
│       └── tokens/           # Token 组件（TSX）
│           ├── MessageToken.tsx    # Token 路由组件
│           ├── TextToken.tsx       # 文本 Token
│           ├── MentionToken.tsx    # @提及 Token
│           └── UrlToken.tsx        # URL Token
```

## 🎯 主要功能

### 1. 消息渲染 (MessageRenderer)

**推荐使用 TSX 组件方式（新）：**

```vue
<script setup lang="ts">
import { MessageContent } from '~/components/chat/Msg';

const msg = ref<ChatMessageVO>(...);
</script>

<template>
  <MessageContent :msg="msg" />
</template>
```

**向后兼容方式（旧）：**

```vue
<script setup lang="ts">
import { useRenderMsg } from '~/components/chat/Msg';

const msg = ref<ChatMessageVO>(...);
const { renderMessageContent } = useRenderMsg(msg);
</script>

<template>
  <span>
    <component :is="() => renderMessageContent()" />
  </span>
</template>
```

### 2. 上下文菜单 (ContextMenu)

```ts
import { onMsgContextMenu } from "~/components/chat/Msg";

function handleContextMenu(e: MouseEvent, data: ChatMessageVO) {
  onMsgContextMenu(e, data, onDownloadFile);
}
```

### 3. 消息操作 (MessageActions)

```ts
import { deleteMsg, refundMsg } from "~/components/chat/Msg";

// 撤回消息
refundMsg(chatMessage, messageId);

// 删除消息
deleteMsg(chatMessage, messageId);
```

### 4. 权限检查 (Permissions)

```ts
import { canDelete, canRecall, hasGroupPermission } from "~/components/chat/Msg";

// 检查是否可以撤回
const canRecallMsg = canRecall(isSelf, sendTime);

// 检查是否可以删除
const canDeleteMsg = canDelete(hasPermission);

// 检查群组权限
const isAdmin = hasGroupPermission(userRole);
```

### 5. 图片工具 (ImageUtils)

```ts
import { getImgSize } from "~/components/chat/Msg";

const size = getImgSize(width, height, {
  maxWidth: 280,
  maxHeight: 280,
  minWidth: 40,
  minHeight: 40,
});
```

## 🔧 类型定义

```ts
import type {
  ImgSizeOptions,
  MentionToken,
  MessageToken,
  TextToken,
  UrlToken,
} from "~/components/chat/Msg";
```

## 📝 常量

```ts
import { COPY_IMAGE_TYPES, RECALL_TIME_OUT } from "~/components/chat/Msg";

// 消息撤回超时时间（5分钟）
console.log(RECALL_TIME_OUT); // 300000

// 支持复制的图片类型
console.log(COPY_IMAGE_TYPES); // ["image/png", "image/jpg", "image/svg+xml"]
```

## 🎨 设计原则

1. **模块化**：每个文件只负责一个功能
2. **类型安全**：使用 TypeScript 确保类型安全
3. **TSX 优先**：新代码使用 TSX 提升可读性和类型推导
4. **向后兼容**：保留原有 API，确保现有代码不受影响
5. **单一职责**：函数和组件都遵循单一职责原则

## 🔄 重构说明

### 主要改进

1. **消息解析器优化**：
   - 将 140 行的 `parseMessageContent` 拆分为 5 个小函数
   - 提升代码可读性和可测试性
   - 提取 `mentionParser`、`urlParser`、`overlapResolver`、`tokenBuilder`

2. **TSX 组件化**：
   - 创建 `MessageContent` TSX 组件替代 `h()` 函数
   - 创建独立的 Token 组件（`TextToken`、`MentionToken`、`UrlToken`）
   - 更好的类型推导和代码提示

3. **常量和类型分离**：
   - 提取 `constants.ts` 和 `types.ts`
   - 便于维护和复用

4. **权限检查模块化**：
   - 提取权限检查函数到 `permissions.ts`
   - 提升代码复用性

### 迁移指南

#### 使用新的 MessageContent 组件

**旧代码：**

```vue
<template>
  <span>
    <component :is="() => renderMessageContent()" />
  </span>
</template>
```

**新代码：**

```vue
<template>
  <MessageContent :msg="msg" />
</template>
```

#### 使用新的导出路径

所有导出都统一从 `~/components/chat/Msg` 导入：

```ts
// ✅ 推荐
import { getImgSize, MessageContent, onMsgContextMenu } from "~/components/chat/Msg";

// ❌ 避免直接从子模块导入
import { onMsgContextMenu } from "~/components/chat/Msg/utils/contextMenu";
```

## 🚀 性能优化

- **computed 缓存**：Token 解析使用 `computed` 避免重复计算
- **按需渲染**：只渲染可见的 Token
- **类型优化**：使用 TypeScript 严格模式确保类型安全

## 📚 扩展阅读

- [Vue 3 TSX 指南](https://vuejs.org/guide/extras/render-function.html#jsx-tsx)
- [UnoCSS 文档](https://unocss.dev/)
- [Element Plus](https://element-plus.org/)
