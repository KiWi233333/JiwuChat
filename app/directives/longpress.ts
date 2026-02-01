/**
 * v-longpress 指令
 * 长按事件处理
 *
 * 使用方式：
 * <button v-longpress="handleLongPress">长按我</button>
 *
 * 触发时机：按住 600ms 后触发
 */

import type { Directive, DirectiveBinding } from "vue";

interface LongPressElement extends HTMLElement {
  __longpressTimer?: NodeJS.Timeout | number;
  __longpressHandlers?: {
    start: (e: Event) => void;
    cancel: () => void;
  };
}

const longpressDirective: Directive<LongPressElement, (e: Event) => void> = {
  mounted(el: LongPressElement, binding: DirectiveBinding<(e: Event) => void>) {
    let timer: NodeJS.Timeout | number;

    const start = (e: Event) => {
      if (e.type === "click")
        return; // 点击停止
      if (timer === null) {
        timer = setTimeout(() => {
          binding.value(e);
        }, 600);
      }
    };

    const cancel = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = 0;
      }
    };

    // 保存处理函数引用
    el.__longpressHandlers = { start, cancel };

    // 开始
    el.addEventListener("mousedown", start, { passive: true });
    el.addEventListener("touchstart", start, { passive: true });
    // 取消
    el.addEventListener("mouseout", cancel, { passive: true });
    el.addEventListener("touchend", cancel, { passive: true });
    el.addEventListener("click", cancel, { passive: true });
  },

  unmounted(el: LongPressElement) {
    const handlers = el.__longpressHandlers;
    if (handlers) {
      el.removeEventListener("mousedown", handlers.start);
      el.removeEventListener("touchstart", handlers.start);
      el.removeEventListener("mouseout", handlers.cancel);
      el.removeEventListener("touchend", handlers.cancel);
      el.removeEventListener("click", handlers.cancel);
      delete el.__longpressHandlers;
    }

    // 清理定时器
    if (el.__longpressTimer) {
      clearTimeout(el.__longpressTimer);
      delete el.__longpressTimer;
    }
  },
};

export default longpressDirective;
