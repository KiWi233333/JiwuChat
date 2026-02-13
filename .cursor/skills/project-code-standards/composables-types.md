# Composables 与类型定义

## Composables 目录约定

业务逻辑放在 `app/composables/`，按功能分子目录：

| 目录     | 用途                  | 命名/示例                                                                                        |
| -------- | --------------------- | ------------------------------------------------------------------------------------------------ |
| `api/`   | 按领域划分的 API 请求 | 导出具体函数：`getChatMessagePage`, `sendChatMessage`；子目录如 `chat/`, `user/`, `res/`, `sys/` |
| `hooks/` | 可复用业务逻辑        | `useXxx.ts`；子目录如 `msg/`, `oauth/`, `oss/`, `ws/`                                            |
| `store/` | Pinia 状态            | `useChatStore`, `useUserStore`, `useSettingStore`, `useWsStore`                                  |
| `utils/` | 纯工具函数            | `useHttp`, `useDelay`, `useCheck`, `useBaseUrl` 等                                               |
| `tauri/` | Tauri 相关            | window、tray、setting 等                                                                         |

## API 层

- 通过 **`useHttp.get` / `useHttp.post` / `useHttp.put` / `useHttp.delete`** 发请求。
- 返回类型统一为 **`Result<T>`**（定义在 `app/types/result.ts`）。
- 每个 API 函数应写 **JSDoc**（用途、参数、返回值）。
- 在业务代码中统一处理 `res.code === StatusCode.SUCCESS` 等逻辑。

示例：

```ts
/** 获取消息列表（游标） */
export function getChatMessagePage(
  roomId: number,
  pageSize = 10,
  cursor: string | number | null,
  token: string,
) {
  return useHttp.get<Result<CursorPage<ChatMessageVO>>>(
    "/chat/message/page",
    { roomId, pageSize, cursor },
    { headers: { Authorization: token } },
  );
}
```

## 类型定义（TypeScript）

- **集中定义**：通用类型、枚举、接口放在 **`app/types/`**（如 `result.ts`、`index.ts`、`user/`、`chat/`）。
- **API 与业务类型**：与单接口强相关的类型可放在对应 composable 或组件同目录；若多处复用则提升到 `types/`。
- **Result 规范**：后端统一包装为 `Result<T>`；使用 `types/result.ts` 中的 **`StatusCode`** 与 **`Result<T>`**。

### 常用类型位置

- `app/types/result.ts`：`Result<T>`、`StatusCode`、`StatusCodeText`、`CursorPage<T>` 等。
- `app/types/index.ts`：分页 `IPage<T>`、用户相关枚举与类型等。
- `app/types/user/`、`app/types/chat/`：领域类型。

## 与组件的配合

- 组件内仅做展示与交互；请求、状态、业务规则尽量放在 composables 或 store 中。
- 组件通过 composables 或 store 获取数据与方法，避免在组件内直接写请求逻辑（除极简单场景）。
