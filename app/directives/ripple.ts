/**
 * v-ripple 指令
 * 为元素添加波纹涟漪效果
 *
 * 使用方式：
 * 1. 基础用法：<button v-ripple>点击我</button>
 * 2. 自定义颜色：<button v-ripple="{ color: 'rgba(255, 0, 0, 0.3)' }">红色波纹</button>
 * 3. 自定义持续时间：<button v-ripple="{ duration: 800 }">慢速波纹</button>
 * 4. 禁用：<button v-ripple="{ disabled: true }">无波纹</button>
 */

import type { Directive, DirectiveBinding } from "vue";
import type { RippleOptions } from "@/composables/utils/useRipple";
import { createRipple, injectRippleStyles } from "@/composables/utils/useRipple";

interface RippleElement extends HTMLElement {
  _rippleClickHandler?: (event: MouseEvent) => void
}

const rippleDirective: Directive<RippleElement, RippleOptions | undefined> = {
  mounted(el: RippleElement, binding: DirectiveBinding<RippleOptions | undefined>) {
    // 注入全局样式（仅首次调用时生效）
    injectRippleStyles();

    const options = binding.value || {};

    // 确保元素有正确的样式
    const computedStyle = window.getComputedStyle(el);
    if (computedStyle.position === "static") {
      el.style.position = "relative";
    }
    if (computedStyle.overflow !== "hidden") {
      el.style.overflow = "hidden";
    }

    // 创建点击处理函数
    const clickHandler = (event: MouseEvent) => {
      createRipple(event, options);
    };

    // 保存处理函数引用，用于后续清理
    el._rippleClickHandler = clickHandler;

    // 添加事件监听
    el.addEventListener("click", clickHandler);
  },

  updated(el: RippleElement, binding: DirectiveBinding<RippleOptions | undefined>) {
    // 如果配置发生变化，更新处理函数
    if (el._rippleClickHandler) {
      el.removeEventListener("click", el._rippleClickHandler);
    }

    const options = binding.value || {};
    const clickHandler = (event: MouseEvent) => {
      createRipple(event, options);
    };

    el._rippleClickHandler = clickHandler;
    el.addEventListener("click", clickHandler);
  },

  unmounted(el: RippleElement) {
    // 清理所有正在进行的 ripple 元素
    const ripples = el.querySelectorAll(".ripple-effect");
    ripples.forEach((ripple) => {
      ripple.remove();
    });

    // 清理事件监听
    if (el._rippleClickHandler) {
      el.removeEventListener("click", el._rippleClickHandler);
      delete el._rippleClickHandler;
    }
  },
};

export default rippleDirective;

