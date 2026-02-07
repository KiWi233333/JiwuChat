/**
 * 可见性变化处理
 */
function onVisibilityChange() {
  const chat = useChatStore();
  const route = useRoute();
  const hidden = document.hidden;
  // console.log("visibilitychange", !hidden);
  if (route.path === "/")
    chat.isVisible = !hidden;
  else
    chat.isVisible = false;
  // 同步窗口失焦/隐藏状态，供 WS 等模块参考（重连等）
  const ws = useWsStore();
  ws.isWindBlur = hidden;
}

/**
 * 初始化窗口监听可见性
 */
export function useWindowVisibilityInit() {
  onVisibilityChange(); // 同步初始可见性（含 isWindBlur）
  document.addEventListener("visibilitychange", onVisibilityChange);
  return () => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
