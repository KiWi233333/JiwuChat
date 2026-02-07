/**
 * 滑动手势 Hook
 * 支持移动端滑动手势识别，带防误触处理和速度计算
 */

export type SwipeDirection = "left" | "right" | "up" | "down" | "none";

export interface SwipeState {
  x: number; // 当前X轴位移
  y: number; // 当前Y轴位移
  vx: number; // X轴速度
  vy: number; // Y轴速度
  direction: SwipeDirection; // 当前方向
  isSwiping: boolean; // 是否正在滑动
  startTime: number; // 开始时间
}

export interface SwipeOptions {
  /**
   * 触发阈值（像素）
   */
  threshold?: number;

  /**
   * 禁用
   */
  disabled?: MaybeRef<boolean>;

  /**
   * 仅水平
   */
  onlyHorizontal?: boolean;

  /**
   * 仅垂直
   */
  onlyVertical?: boolean;

  /**
   * 角度阈值 (0-90)
   * 水平模式下，允许的Y轴偏移角度
   */
  angleThreshold?: number;

  /**
   * 回调
   */
  onSwipeStart?: (e: TouchEvent, state: SwipeState) => void;
  onSwipeMove?: (e: TouchEvent, state: SwipeState) => void;
  onSwipeEnd?: (e: TouchEvent, state: SwipeState) => void;
}

export function useSwipe(
  target: Ref<HTMLElement | null> | HTMLElement,
  options: SwipeOptions = {},
) {
  const {
    threshold = 10,
    angleThreshold = 45, // 默认45度
    disabled = false,
    onlyHorizontal = false,
    onlyVertical = false,
    onSwipeStart,
    onSwipeMove,
    onSwipeEnd,
  } = options;

  const state = reactive<SwipeState>({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    direction: "none",
    isSwiping: false,
    startTime: 0,
  });

  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let lastTime = 0;

  function handleTouchStart(e: TouchEvent) {
    if (unref(disabled))
      return;
    if (e.touches.length !== 1)
      return;

    const touch = e.touches[0];
    if (!touch)
      return;
    startX = touch.clientX;
    startY = touch.clientY;
    lastX = startX;
    lastY = startY;
    lastTime = Date.now();

    state.x = 0;
    state.y = 0;
    state.vx = 0;
    state.vy = 0;
    state.direction = "none";
    state.isSwiping = false;
    state.startTime = lastTime;

    // 不立即触发 onSwipeStart，等到 move 确认方向或者达到阈值
    // 但为了响应迅速，这里可以先做一些初始化
  }

  function handleTouchMove(e: TouchEvent) {
    if (unref(disabled))
      return;
    if (e.touches.length !== 1)
      return;

    const touch = e.touches[0];
    if (!touch)
      return;
    const currentX = touch.clientX;
    const currentY = touch.clientY;
    const currentTime = Date.now();

    const diffX = currentX - startX;
    const diffY = currentY - startY;
    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);

    // 如果还没有开始滑动判定
    if (!state.isSwiping) {
      // 达到阈值才开始判定
      if (Math.max(absX, absY) < threshold)
        return;

      // 判定方向
      const isHorizontal = absX > absY;

      // 角度检查
      if (isHorizontal) {
        const angle = Math.atan2(absY, absX) * (180 / Math.PI);
        if (angle > angleThreshold || onlyVertical)
          return; // 角度过大或仅垂直模式，忽略
      }
      else {
        const angle = Math.atan2(absX, absY) * (180 / Math.PI);
        if (angle > angleThreshold || onlyHorizontal)
          return; // 角度过大或仅水平模式，忽略
      }

      state.isSwiping = true;
      onSwipeStart?.(e, state);
    }

    if (state.isSwiping) {
      // 阻止默认滚动行为（如果已确认是滑动手势）
      if (e.cancelable) {
        e.preventDefault();
      }

      state.x = diffX;
      state.y = diffY;

      const dt = currentTime - lastTime;
      if (dt > 0) {
        state.vx = (currentX - lastX) / dt;
        state.vy = (currentY - lastY) / dt;
      }

      state.direction = getDirection(diffX, diffY);

      lastX = currentX;
      lastY = currentY;
      lastTime = currentTime;

      onSwipeMove?.(e, state);
    }
  }

  function handleTouchEnd(e: TouchEvent) {
    if (!state.isSwiping)
      return;

    state.isSwiping = false;
    onSwipeEnd?.(e, state);
  }

  function getDirection(x: number, y: number): SwipeDirection {
    if (Math.abs(x) > Math.abs(y)) {
      return x > 0 ? "right" : "left";
    }
    return y > 0 ? "down" : "up";
  }

  function cleanup() {
    const el = unref(target);
    if (el) {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchEnd);
    }
  }

  // 绑定事件
  if (import.meta.client) {
    const bind = () => {
      const el = unref(target);
      if (el) {
        el.addEventListener("touchstart", handleTouchStart, { passive: true }); // 先 passive true，如果不阻止默认事件
        // 注意：如果要阻止滚动，touchmove 必须 passive: false。
        // 为了更好的体验，我们在 touchstart 标记，在 move 中判断是否阻止
        el.addEventListener("touchmove", handleTouchMove, { passive: false });
        el.addEventListener("touchend", handleTouchEnd, { passive: true });
        el.addEventListener("touchcancel", handleTouchEnd, { passive: true });
      }
    };

    onMounted(bind);
    onUnmounted(cleanup);

    watch(() => unref(target), (el, oldEl) => {
      if (oldEl) {
        oldEl.removeEventListener("touchstart", handleTouchStart);
        oldEl.removeEventListener("touchmove", handleTouchMove);
        oldEl.removeEventListener("touchend", handleTouchEnd);
        oldEl.removeEventListener("touchcancel", handleTouchEnd);
      }
      if (el) {
        bind();
      }
    });
  }

  return {
    ...toRefs(state),
  };
}
