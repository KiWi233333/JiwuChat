/**
 * v-swipe 指令
 * 移动端滑动手势识别，支持左右上下四个方向，带防误触处理
 *
 * 使用方式：
 * 1. 简写形式：<div v-swipe="(direction, e) => console.log(direction)">滑动我</div>
 * 2. 完整形式：<div v-swipe="{ onSwipeLeft: handleLeft, sensitivity: 3 }">滑动我</div>
 * 3. 仅水平：<div v-swipe="{ onlyHorizontal: true, onSwipeLeft: prev, onSwipeRight: next }">切换</div>
 * 4. 仅垂直：<div v-swipe="{ onlyVertical: true, onSwipeUp: up, onSwipeDown: down }">滚动</div>
 * 5. 动态禁用：<div v-swipe="{ disabled: isDisabled, onSwipeLeft: handle }">可禁用</div>
 *
 * 灵敏度等级（sensitivity）：
 * - 1: 最敏感（30px, 0.1速度）
 * - 2: 较敏感（50px, 0.2速度）
 * - 3: 中等（80px, 0.3速度）【默认】
 * - 4: 较不敏感（120px, 0.4速度）
 * - 5: 最不敏感（150px, 0.5速度）
 */

import type { Directive, DirectiveBinding } from "vue";

export type SwipeDirection = "left" | "right" | "up" | "down" | "none";

export interface SwipeOptions {
  /**
   * 防误触等级 (1-5)
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
  disabled?: boolean;

  /**
   * 是否仅水平方向
   */
  onlyHorizontal?: boolean;

  /**
   * 是否仅垂直方向
   */
  onlyVertical?: boolean;
}

export type SwipeDirectiveValue
  = | SwipeOptions
    | ((direction: SwipeDirection, e: TouchEvent) => void);

interface SwipeElement extends HTMLElement {
  __swipeCleanup?: () => void;
}

/**
 * 灵敏度配置映射
 */
const SENSITIVITY_CONFIG = {
  1: { minDistance: 30, minVelocity: 0.1, angleThreshold: 50 },
  2: { minDistance: 50, minVelocity: 0.2, angleThreshold: 45 },
  3: { minDistance: 80, minVelocity: 0.3, angleThreshold: 40 },
  4: { minDistance: 120, minVelocity: 0.4, angleThreshold: 35 },
  5: { minDistance: 150, minVelocity: 0.5, angleThreshold: 30 },
};

const swipeDirective: Directive<SwipeElement, SwipeDirectiveValue> = {
  mounted(el: SwipeElement, binding: DirectiveBinding<SwipeDirectiveValue>) {
    if (!import.meta.client)
      return;

    const options = binding.value || {};

    // 支持简写：v-swipe="handler" 或 v-swipe="{ onSwipeLeft: ... }"
    const handleSwipe = typeof options === "function" ? options : undefined;

    const state = {
      startPoint: null as { x: number; y: number; time: number } | null,
      isSwiping: false,
    };

    const sensitivity = (typeof options === "object" ? options.sensitivity : undefined) || 3;
    const config = SENSITIVITY_CONFIG[sensitivity];

    const calculateDirection = (deltaX: number, deltaY: number): SwipeDirection => {
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);
      const isHorizontal = absDeltaX > absDeltaY;
      const angle = Math.atan2(absDeltaY, absDeltaX) * (180 / Math.PI);

      if (isHorizontal) {
        if (angle > config.angleThreshold)
          return "none";
        if (typeof options === "object" && options.onlyVertical)
          return "none";
        return deltaX > 0 ? "right" : "left";
      }
      else {
        if (angle < 90 - config.angleThreshold)
          return "none";
        if (typeof options === "object" && options.onlyHorizontal)
          return "none";
        return deltaY > 0 ? "down" : "up";
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      const isDisabled = typeof options === "object" && options.disabled;
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

      if (typeof options === "object") {
        options.onSwipeStart?.(e);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const isDisabled = typeof options === "object" && options.disabled;
      if (isDisabled || !state.isSwiping || !state.startPoint)
        return;

      const touch = e.changedTouches[0];
      if (!touch)
        return;

      const endPoint = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };

      const deltaX = endPoint.x - state.startPoint.x;
      const deltaY = endPoint.y - state.startPoint.y;
      const deltaTime = endPoint.time - state.startPoint.time;

      const velocity = Math.sqrt(deltaX ** 2 + deltaY ** 2) / deltaTime;
      const maxDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
      const isValidSwipe = maxDelta >= config.minDistance && velocity >= config.minVelocity;

      let swipeDirection: SwipeDirection = "none";

      if (isValidSwipe) {
        swipeDirection = calculateDirection(deltaX, deltaY);

        // 简写形式：统一回调
        if (handleSwipe && swipeDirection !== "none") {
          handleSwipe(swipeDirection, e);
        }
        else if (typeof options === "object") {
          // 完整形式：分别回调
          if (swipeDirection === "left")
            options.onSwipeLeft?.(e);
          else if (swipeDirection === "right")
            options.onSwipeRight?.(e);
          else if (swipeDirection === "up")
            options.onSwipeUp?.(e);
          else if (swipeDirection === "down")
            options.onSwipeDown?.(e);
        }
      }

      if (typeof options === "object") {
        options.onSwipeEnd?.(e, swipeDirection);
      }

      state.isSwiping = false;
      state.startPoint = null;
    };

    const handleTouchCancel = () => {
      state.isSwiping = false;
      state.startPoint = null;
    };

    // 绑定事件（使用 passive 优化性能）
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    el.addEventListener("touchcancel", handleTouchCancel, { passive: true });

    // 保存清理函数到元素上
    el.__swipeCleanup = () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchCancel);
    };
  },

  unmounted(el: SwipeElement) {
    el.__swipeCleanup?.();
    delete el.__swipeCleanup;
  },
};

export default swipeDirective;
