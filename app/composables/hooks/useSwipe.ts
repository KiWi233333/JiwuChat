/**
 * 滑动手势 Hook
 * 支持移动端滑动手势识别，带防误触处理
 */

export type SwipeDirection = "left" | "right" | "up" | "down" | "none";

export interface SwipeOptions {
  /**
   * 防误触等级 (1-5)
   * 1: 最敏感，容易触发
   * 3: 中等，平衡体验
   * 5: 最不敏感，需要明显滑动
   */
  sensitivity?: 1 | 2 | 3 | 4 | 5;

  /**
   * 滑动方向回调
   */
  onSwipeLeft?: (e: TouchEvent) => void;
  onSwipeRight?: (e: TouchEvent) => void;
  onSwipeUp?: (e: TouchEvent) => void;
  onSwipeDown?: (e: TouchEvent) => void;

  /**
   * 滑动开始/结束回调
   */
  onSwipeStart?: (e: TouchEvent) => void;
  onSwipeEnd?: (e: TouchEvent, direction: SwipeDirection) => void;

  /**
   * 是否禁用
   */
  disabled?: Ref<boolean> | boolean;

  /**
   * 是否仅水平方向
   */
  onlyHorizontal?: boolean;

  /**
   * 是否仅垂直方向
   */
  onlyVertical?: boolean;
}

interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

interface SwipeState {
  startPoint: TouchPoint | null;
  endPoint: TouchPoint | null;
  isSwiping: boolean;
}

/**
 * 灵敏度配置映射
 */
const SENSITIVITY_CONFIG = {
  1: { minDistance: 30, minVelocity: 0.1, angleThreshold: 50 }, // 最敏感
  2: { minDistance: 50, minVelocity: 0.2, angleThreshold: 45 },
  3: { minDistance: 80, minVelocity: 0.3, angleThreshold: 40 }, // 默认
  4: { minDistance: 120, minVelocity: 0.4, angleThreshold: 35 },
  5: { minDistance: 150, minVelocity: 0.5, angleThreshold: 30 }, // 最不敏感
};

/**
 * 使用滑动手势
 */
export function useSwipe(
  target: Ref<HTMLElement | null> | HTMLElement,
  options: SwipeOptions = {},
) {
  const {
    sensitivity = 3,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onSwipeStart,
    onSwipeEnd,
    disabled = false,
    onlyHorizontal = false,
    onlyVertical = false,
  } = options;

  const state = reactive<SwipeState>({
    startPoint: null,
    endPoint: null,
    isSwiping: false,
  });

  const direction = ref<SwipeDirection>("none");
  const distance = ref({ x: 0, y: 0 });

  // 获取灵敏度配置
  const config = SENSITIVITY_CONFIG[sensitivity];

  /**
   * 计算滑动方向
   */
  function calculateDirection(deltaX: number, deltaY: number): SwipeDirection {
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // 判断是水平还是垂直滑动
    const isHorizontal = absDeltaX > absDeltaY;

    // 角度检测：确保滑动方向明确
    const angle = Math.atan2(absDeltaY, absDeltaX) * (180 / Math.PI);

    if (isHorizontal) {
      // 水平滑动时，角度应该小于阈值
      if (angle > config.angleThreshold)
        return "none";

      if (onlyVertical)
        return "none";

      return deltaX > 0 ? "right" : "left";
    }
    else {
      // 垂直滑动时，角度应该接近 90 度
      if (angle < 90 - config.angleThreshold)
        return "none";

      if (onlyHorizontal)
        return "none";

      return deltaY > 0 ? "down" : "up";
    }
  }

  /**
   * 触摸开始
   */
  function handleTouchStart(e: TouchEvent) {
    const isDisabled = unref(disabled);
    if (isDisabled || !e.touches.length)
      return;

    const touch = e.touches[0];
    if (!touch)
      return;

    state.startPoint = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    state.isSwiping = true;
    direction.value = "none";

    onSwipeStart?.(e);
  }

  /**
   * 触摸移动
   */
  function handleTouchMove(e: TouchEvent) {
    const isDisabled = unref(disabled);
    if (isDisabled || !state.isSwiping || !state.startPoint || !e.touches.length)
      return;

    const touch = e.touches[0];
    if (!touch)
      return;

    const deltaX = touch.clientX - state.startPoint.x;
    const deltaY = touch.clientY - state.startPoint.y;

    distance.value = { x: deltaX, y: deltaY };

    // 实时计算方向（用于 UI 反馈）
    const currentDirection = calculateDirection(deltaX, deltaY);
    if (currentDirection !== "none") {
      direction.value = currentDirection;
    }
  }

  /**
   * 触摸结束
   */
  function handleTouchEnd(e: TouchEvent) {
    const isDisabled = unref(disabled);
    if (isDisabled || !state.isSwiping || !state.startPoint)
      return;

    const touch = e.changedTouches[0];
    if (!touch)
      return;

    state.endPoint = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    const deltaX = state.endPoint.x - state.startPoint.x;
    const deltaY = state.endPoint.y - state.startPoint.y;
    const deltaTime = state.endPoint.time - state.startPoint.time;

    // 计算速度 (像素/毫秒)
    const velocity = Math.sqrt(deltaX ** 2 + deltaY ** 2) / deltaTime;

    // 判断是否满足滑动条件
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    const maxDelta = Math.max(absDeltaX, absDeltaY);

    const isValidSwipe = maxDelta >= config.minDistance && velocity >= config.minVelocity;

    let swipeDirection: SwipeDirection = "none";

    if (isValidSwipe) {
      swipeDirection = calculateDirection(deltaX, deltaY);

      // 触发对应方向的回调
      if (swipeDirection === "left")
        onSwipeLeft?.(e);
      else if (swipeDirection === "right")
        onSwipeRight?.(e);
      else if (swipeDirection === "up")
        onSwipeUp?.(e);
      else if (swipeDirection === "down")
        onSwipeDown?.(e);
    }

    // 触发结束回调
    onSwipeEnd?.(e, swipeDirection);

    // 重置状态
    state.isSwiping = false;
    state.startPoint = null;
    state.endPoint = null;
    direction.value = "none";
    distance.value = { x: 0, y: 0 };
  }

  /**
   * 触摸取消
   */
  function handleTouchCancel() {
    state.isSwiping = false;
    state.startPoint = null;
    state.endPoint = null;
    direction.value = "none";
    distance.value = { x: 0, y: 0 };
  }

  /**
   * 绑定事件
   */
  function bind() {
    const el = unref(target);
    if (!el)
      return;

    // 使用 passive 优化性能
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    el.addEventListener("touchcancel", handleTouchCancel, { passive: true });
  }

  /**
   * 解绑事件
   */
  function unbind() {
    const el = unref(target);
    if (!el)
      return;

    el.removeEventListener("touchstart", handleTouchStart);
    el.removeEventListener("touchmove", handleTouchMove);
    el.removeEventListener("touchend", handleTouchEnd);
    el.removeEventListener("touchcancel", handleTouchCancel);
  }

  // 自动绑定和解绑
  if (import.meta.client) {
    onMounted(() => {
      nextTick(() => {
        bind();
      });
    });

    onUnmounted(() => {
      unbind();
    });

    // 监听 target 变化
    if (isRef(target)) {
      watch(target, (newEl, oldEl) => {
        if (oldEl) {
          const el = oldEl as HTMLElement;
          el.removeEventListener("touchstart", handleTouchStart);
          el.removeEventListener("touchmove", handleTouchMove);
          el.removeEventListener("touchend", handleTouchEnd);
          el.removeEventListener("touchcancel", handleTouchCancel);
        }
        if (newEl) {
          bind();
        }
      });
    }
  }

  return {
    isSwiping: readonly(toRef(state, "isSwiping")),
    direction: readonly(direction),
    distance: readonly(distance),
    bind,
    unbind,
  };
}
