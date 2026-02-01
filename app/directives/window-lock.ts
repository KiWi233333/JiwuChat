/**
 * v-window-lock 指令
 * 窗口滚动锁定，防止页面滚动
 *
 * 使用方式：
 * <div v-window-lock="isLocked">内容</div>
 *
 * 常用场景：模态框、抽屉、弹出层等需要阻止背景滚动的场景
 */

import type { Directive, DirectiveBinding } from "vue";

const windowLockDirective: Directive<HTMLElement, boolean> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<boolean>) {
    if (binding.value) {
      const cWidth = document.body.clientWidth || document.documentElement.clientWidth; // 页面可视区域宽度
      const iWidth = window.innerWidth; // 浏览器窗口大小
      document.body.style.paddingRight = `${iWidth - cWidth}px`;
      document.body.style.overflow = "hidden";
    }
    else {
      document.body.style.overflow = "auto";
      document.body.style.paddingRight = "0px";
    }
  },

  updated(el: HTMLElement, binding: DirectiveBinding<boolean>) {
    if (binding.value) {
      const cWidth = document.body.clientWidth || document.documentElement.clientWidth; // 页面可视区域宽度
      const iWidth = window.innerWidth; // 浏览器窗口大小
      document.body.style.paddingRight = `${iWidth - cWidth}px`;
      document.body.style.overflow = "hidden";
    }
    else {
      document.body.style.overflow = "auto";
      document.body.style.paddingRight = "0px";
    }
  },

  unmounted() {
    document.body.style.overflow = "auto";
    document.body.style.paddingRight = "0px";
  },
};

export default windowLockDirective;
