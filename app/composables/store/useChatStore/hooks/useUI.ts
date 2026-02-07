/**
 * UI 状态与滚动、面板控制
 * @returns UI
 */
export function createUIModule() {
  const showExtension = ref(false); // 扩展面板
  const pageTransition = ref<{ name?: string, mode?: "in-out" | "out-in", duration?: number }>({ name: "", duration: 200 }); // 页面过渡
  const showVideoDialog = ref(false); // 视频对话框

  const shouldAutoScroll = ref(true); // 初始状态为true，表示默认自动滚动
  const isScrollBottom = ref(true); // 初始状态为true，表示默认在底部

  const scrollBottom = (animate = true) => {
    mitter.emit(MittEventType.MSG_LIST_SCROLL, { type: "scrollBottom", payload: { animate } });
  };
  const scrollReplyMsg = (msgId: number, gapCount: number = 0, isAnimated: boolean = true) => {
    mitter.emit(MittEventType.MSG_LIST_SCROLL, { type: "scrollReplyMsg", payload: { msgId, gapCount, isAnimated } });
  };
  const saveScrollTop = () => {
    mitter.emit(MittEventType.MSG_LIST_SCROLL, { type: "saveScrollTop", payload: {} });
  };
  const scrollTop = (size: number) => {
    mitter.emit(MittEventType.MSG_LIST_SCROLL, { type: "scrollTop", payload: { size } });
  };

  function resetUI() {
    showExtension.value = false;
    showVideoDialog.value = false;
    shouldAutoScroll.value = false;
    isScrollBottom.value = false;
    saveScrollTop();
  }

  return {
    showExtension,
    pageTransition,
    showVideoDialog,
    shouldAutoScroll,
    isScrollBottom,
    scrollBottom,
    scrollReplyMsg,
    saveScrollTop,
    scrollTop,
    resetUI,
  };
}


