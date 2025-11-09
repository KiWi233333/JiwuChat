/**
 * 可见性变化处理
 */
function onVisibilityChange() {
  const chat = useChatStore();
  const route = useRoute();
  // console.log("visibilitychange", !document.hidden);
  if (route.path === "/")
    chat.isVisible = !document.hidden;
  else
    chat.isVisible = false;
}

/**
 * 初始化窗口监听可见性
 */
export function useWindowVisibilityInit() {
  document.addEventListener("visibilitychange", onVisibilityChange);
  return () => {
    // console.log("remove visibilitychange");
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
