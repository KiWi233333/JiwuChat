import { mitter, MittEventType } from "~/composables/utils/useMitt";

export async function useWsInit() {
  const ws = useWsStore();
  const user = useUserStore();

  // 使用Worker管理hooks
  const { reload: reloadWorker, cleanupWorker } = useWsWorker();

  // 自动重连
  const validStatus = [WsStatusEnum.OPEN, WsStatusEnum.CONNECTION];
  watchDebounced(() => !validStatus.includes(ws.status) && user.isLogin, (bool) => {
    if (bool) {
      reloadWorker();
    }
    else if (!user.isLogin) {
      cleanupWorker();
      ws.close(false);
    }
  }, {
    debounce: 3000,
    deep: true,
  });

  // 初始状态检查
  if (!validStatus.includes(ws.status) && user.isLogin) {
    reloadWorker();
  }

  // 暴露给外部调用，用于刷新Web Worker状态
  mitter.off(MittEventType.CHAT_WS_RELOAD);
  mitter.on(MittEventType.CHAT_WS_RELOAD, reloadWorker);
  return {
    ws,
    reloadWorker,
  };
}

/**
 * 清理WebSocket资源
 */
export function useWSUnmounted() {
  const ws = useWsStore();
  ws?.close(false);
}

