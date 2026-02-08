# WebSocket 消息处理系统

## 架构概览

重构后的 WebSocket 消息处理系统采用**配置驱动 + 枚举管理**的设计，简化了代码并提升了可扩展性。

### 核心文件

- `messageConfig.ts` - 核心配置系统和类型定义
- `messageHandlers.ts` - 内置消息处理器
- `messageKeys.ts` - 消息键名枚举（统一管理所有消息字段名）
- `messages.ts` - 消息类型配置和接口定义（所有消息类型在此集中管理）
- `useWsCore.ts` - WebSocket 核心逻辑

### 设计决策

**为什么采用枚举 + 手动定义接口？**

在重构过程中，我们尝试了完全自动推断 `WsMsgItemMap` 类型，但 TypeScript 的泛型推断在复杂场景下会丢失具体类型信息，导致所有消息类型都被推断为 `object[]`。

最终采用的**枚举 + 手动定义接口**的混合模式既保证了类型安全，又保持了代码的可维护性：

- ✅ **枚举统一管理键名** - 避免字符串硬编码，编译时检查拼写
- ✅ **手动定义接口** - 保证完整的类型推断和 IDE 智能提示
- ✅ **配置集中化** - 所有消息类型配置在一处管理
- ✅ **类型验证** - 编译时确保配置和接口一致性

## 添加新消息类型

添加新消息类型需要在 **4 个地方**进行修改，确保类型安全和功能完整。

### 步骤 1：在 `messageKeys.ts` 中添加枚举值

```typescript
// app/composables/hooks/ws/messageKeys.ts

export enum WsMsgKey {
  // ... 现有枚举 ...

  /** 新消息类型描述 */
  NEW_TYPE_MSG = "newTypeMsg",
}
```

### 步骤 2：在 `messages.ts` 中添加类型配置

```typescript
// app/composables/hooks/ws/messages.ts

export const messageConfig = defineMessageConfig({
  // ... 现有配置 ...

  /** 新消息类型 */
  [WsMsgBodyType.NEW_MESSAGE_TYPE]: {
    key: WsMsgKey.NEW_TYPE_MSG, // 使用枚举值
    type: [] as YourMessageType[], // 消息数据类型
    handlers: [storeToList, emitEvent], // 处理器列表
  },
});
```

### 步骤 3：在 `messages.ts` 的 `WsMsgItemMap` 接口中添加字段

```typescript
// app/composables/hooks/ws/messages.ts

export interface WsMsgItemMap {
  // ... 现有字段 ...
  [WsMsgKey.NEW_TYPE_MSG]: YourMessageType[]; // 添加新字段
  [WsMsgKey.OTHER]: object[];
}
```

### 步骤 4：在 `useWsCore.ts` 中添加空列表初始化

```typescript
// app/composables/hooks/ws/useWsCore.ts

function emptyMsgList(): WsMsgItemMap {
  return {
  // ... 现有字段 ...
    [WsMsgKey.NEW_TYPE_MSG]: [],
  };
}
```

### 完成！

- ✅ 消息自动存储到 `wsMsgList.value.newTypeMsg`
- ✅ 自动发送事件 `mitter.emit(resolteChatPath(type), data)`
- ✅ 完整的 TypeScript 类型安全：`wsMsgList.value.newTypeMsg` 的类型是 `YourMessageType[]`
- ✅ IDE 智能提示和自动补全
- ✅ 使用枚举避免字符串硬编码
- ✅ 编译时类型检查，避免字段名不一致

## 自定义处理器

### 创建自定义处理器

```typescript
// app/composables/hooks/ws/messageHandlers.ts

import type { MessageHandler } from "./messageConfig";

/** 自定义处理器：记录日志 */
export const logMessage: MessageHandler = (data, ctx) => {
  console.log(`[${ctx.key}]`, data);
};

/** 自定义处理器：特殊业务逻辑 */
export const handleSpecialLogic: MessageHandler<YourMessageType> = (data, ctx) => {
  // 访问完整上下文
  console.log("消息类型:", ctx.type);
  console.log("消息键名:", ctx.key);
  console.log("原始消息:", ctx.rawMsg);

  // 处理业务逻辑
  if (data.someCondition) {
    // ...
  }
};
```

### 使用自定义处理器

```typescript
// app/composables/hooks/ws/messages.ts

export const messageConfig = defineMessageConfig({
  [WsMsgBodyType.SPECIAL_MESSAGE]: {
    key: WsMsgKey.SPECIAL_MSG, // 使用枚举
    type: [] as SpecialMessage[],
    handlers: [
      logMessage, // 先记录日志
      storeToList, // 存储到列表
      handleSpecialLogic, // 执行特殊逻辑
      emitEvent, // 最后发送事件
    ],
  },
});
```

## 复杂消息类型的拆分

对于配置较多的消息类型，可以拆分到独立文件：

```typescript
// app/composables/hooks/ws/messages/videoCall.ts

import type { MessageTypeConfig } from "../messageConfig";
import { emitEvent, storeToList } from "../messageHandlers";
import { WsMsgKey } from "../messageKeys";

export const videoCallConfig: MessageTypeConfig<string, VideoCallMessage[]> = {
  key: WsMsgKey.VIDEO_CALL_MSG, // 使用枚举
  type: [] as VideoCallMessage[],
  handlers: [
    (data, ctx) => {
      // 处理视频通话逻辑
      console.log("收到视频通话消息", data);
      // ... 复杂的处理逻辑 ...
    },
    storeToList,
    emitEvent,
  ],
};
```

然后在主配置中引入：

```typescript
// app/composables/hooks/ws/messages.ts

import { videoCallConfig } from "./messages/videoCall";

export const messageConfig = defineMessageConfig({
  // ... 其他配置 ...
  [WsMsgBodyType.VIDEO_CALL]: videoCallConfig,
});

// 记得在 WsMsgItemMap 接口中添加对应字段
export interface WsMsgItemMap {
  // ... 其他字段 ...
  [WsMsgKey.VIDEO_CALL_MSG]: VideoCallMessage[];
}
```

## 内置处理器

### `storeToList`

将消息数据存储到 `wsMsgList.value[key]` 数组中。

### `emitEvent`

通过 `mitter.emit(resolteChatPath(type), data)` 发送事件。

### `handleNotify`

调用 `handleNotification(rawMsg)` 处理通知。

### 处理器组合

```typescript
/** 标准处理器：存储 + 事件 + 通知 */
export const standardHandlers: MessageHandler[] = [
  storeToList,
  emitEvent,
  handleNotify,
];

/** 静默处理器：只存储和事件，不通知 */
export const silentHandlers: MessageHandler[] = [
  storeToList,
  emitEvent,
];
```

## 消息处理上下文

每个处理器都会接收两个参数：

```typescript
type MessageHandler<T> = (data: T, ctx: MessageContext<T>) => void;

interface MessageContext<T> {
  key: string // 消息键名，如 'newMsg'
  type: WsMsgBodyType // 消息类型枚举
  rawMsg: WsMsgBodyVO // 原始消息对象
  data: T // 消息数据
}
```

## 类型安全

系统通过枚举键和手动定义接口提供完整的类型安全：

```typescript
const { wsMsgList } = useWsMessage();

// ✅ 类型安全：wsMsgList.value.newMsg 的类型是 ChatMessageVO[]
wsMsgList.value.newMsg.forEach((msg) => {
  console.log(msg.content); // 完整的类型提示
  console.log(msg.fromUser); // IDE 自动补全
});

// ✅ 使用枚举键访问也有完整类型推断
wsMsgList.value[WsMsgKey.NEW_MSG].forEach((msg) => {
  // msg 类型是 ChatMessageVO
});
```

### WsMsgItemMap 接口定义

```typescript
// app/composables/hooks/ws/messages.ts

export interface WsMsgItemMap {
  [WsMsgKey.NEW_MSG]: ChatMessageVO[];
  [WsMsgKey.ONLINE_NOTICE]: WSOnlineOfflineNotify[];
  [WsMsgKey.RECALL_MSG]: WSMsgRecall[];
  // ... 其他消息类型
  [WsMsgKey.OTHER]: object[];
}
```

这种方式确保：

- ✅ 每个字段都有准确的类型定义
- ✅ IDE 提供完整的智能提示和自动补全
- ✅ 编译时类型检查，捕获类型错误
- ✅ 重构时自动更新所有引用

## 错误处理

处理器中的错误会被自动捕获并记录：

```typescript
// 在 messageConfig.ts 的 processMessage 函数中
for (const handler of typeConfig.handlers) {
  try {
    handler(body, ctx);
  }
  catch (error) {
    console.error(`Message handler error for ${ctx.key}:`, error);
  }
}
```

## 迁移指南

### 从旧代码迁移

**旧代码：**

```typescript
// 需要在多个地方修改
const wsMsgMap = {
  [WsMsgBodyType.MESSAGE]: "newMsg",
};

function emptyMsgList() {
  return {
    newMsg: [],
  // ...
  };
}

if (wsMsgMap[wsMsg.type] !== undefined) {
  wsMsgList.value[wsMsgMap[wsMsg.type]].push(body);
  mitter.emit(resolteChatPath(wsMsg.type), body);
}
```

**新代码：**

```typescript
// 1. 在 messageKeys.ts 中定义枚举
export enum WsMsgKey {
  NEW_MSG = "newMsg",
}

// 2. 在 messages.ts 中添加配置
export const messageConfig = defineMessageConfig({
  [WsMsgBodyType.MESSAGE]: {
    key: WsMsgKey.NEW_MSG, // 使用枚举
    type: [] as ChatMessageVO[],
    handlers: [storeToList, emitEvent],
  },
});

// 3. 在 WsMsgItemMap 接口中定义类型
export interface WsMsgItemMap {
  [WsMsgKey.NEW_MSG]: ChatMessageVO[];
  // ...
}
```

## 优势总结

### 架构优势

✅ **单一配置源** - 所有消息类型在 `messages.ts` 中集中管理
✅ **枚举统一管理** - `WsMsgKey` 枚举避免字符串硬编码，编译时检查拼写错误
✅ **类型完全安全** - 手动定义 `WsMsgItemMap` 接口，保证完整的类型推断
✅ **易于扩展** - 添加新消息类型只需 4 步，清晰明确
✅ **处理器复用** - 内置处理器可在多个消息类型间共享

### 代码质量

✅ **关注点分离** - 配置、处理器、键名枚举、核心逻辑清晰分离
✅ **错误隔离** - 单个处理器错误不影响其他处理器
✅ **易于测试** - 处理器函数纯粹，便于单元测试
✅ **可维护性高** - 修改字段名时，枚举确保所有引用同步更新

### 开发体验

✅ **IDE 智能提示** - 完整的自动补全和类型提示
✅ **重构友好** - 重命名字段时自动更新所有引用
✅ **编译时检查** - TypeScript 在编译时捕获类型错误
✅ **文档清晰** - 枚举和接口即文档，一目了然

## 常见问题

### Q: 为什么不使用完全自动推断的类型？

**A:** 在重构过程中，我们尝试过通过泛型完全自动推断 `WsMsgItemMap`，但遇到了 TypeScript 类型推断的限制：

```typescript
// 尝试的自动推断方式
export type WsMsgItemMap = InferMessageMap<typeof messageConfig>;

// 结果：所有字段都被推断为 object[]，而不是具体类型
// wsMsgList.value.newMsg 类型变成 object[] 而不是 ChatMessageVO[]
```

TypeScript 的泛型推断在处理复杂嵌套类型时会丢失具体类型信息。虽然配置中声明了 `type: [] as ChatMessageVO[]`，但通过泛型传递后类型被宽化。

**当前方案**使用枚举键 + 手动定义接口，虽然需要在接口中手动添加字段，但保证了：

- ✅ 完整的类型安全
- ✅ 准确的类型推断
- ✅ 完美的 IDE 支持

### Q: 添加新消息类型时如何确保不遗漏？

**A:** 按照 4 个步骤的检查清单：

1. ✅ `messageKeys.ts` - 添加枚举值
2. ✅ `messages.ts` - 添加配置项
3. ✅ `messages.ts` - 在 `WsMsgItemMap` 接口添加字段
4. ✅ `useWsCore.ts` - 在 `emptyMsgList` 添加初始化

如果遗漏了步骤 3 或 4，TypeScript 编译器会报错提示。

### Q: 可以跳过枚举，直接使用字符串吗？

**A:** 不推荐。使用枚举的好处：

- ✅ 编译时检查拼写错误
- ✅ IDE 自动补全字段名
- ✅ 重构时自动更新所有引用
- ✅ 避免字符串硬编码

```typescript
// ❌ 不推荐：字符串硬编码
wsMsgList.value.newMsg; // 拼写错误不会被发现

// ✅ 推荐：使用枚举
wsMsgList.value[WsMsgKey.NEW_MSG]; // 拼写错误会立即报错
```
