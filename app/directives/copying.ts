/**
 * v-copying 指令
 * 点击复制文本到剪贴板
 *
 * 使用方式：
 * 1. 基础用法：<button v-copying="'复制的文本'">复制</button>
 * 2. 复制元素内容：<div v-copying>复制这段文字</div>
 * 3. 带提示：<button v-copying.toast="'文本'">复制并提示</button>
 */

import type { Directive, DirectiveBinding } from "vue";

interface CopyingElement extends HTMLElement {
  __copyingHandler?: (e: Event) => void;
}

const copyingDirective: Directive<CopyingElement, string | undefined> = {
  mounted(el: CopyingElement, binding: DirectiveBinding<string | undefined>) {
    const handler = async (e: Event) => {
      e.stopPropagation();
      const res = await useAsyncCopyText(binding.value || el.innerHTML);
      if (res && binding.modifiers.toast) {
        ElMessage.success({
          message: "成功复制至剪贴板！",
          grouping: true,
        });
      }
    };

    el.__copyingHandler = handler;
    el.addEventListener("click", handler, { passive: true });
  },

  updated(el: CopyingElement, binding: DirectiveBinding<string | undefined>) {
    // 如果绑定值改变，更新处理函数
    if (el.__copyingHandler) {
      el.removeEventListener("click", el.__copyingHandler);
    }

    const handler = async (e: Event) => {
      e.stopPropagation();
      const res = await useAsyncCopyText(binding.value || el.innerHTML);
      if (res && binding.modifiers.toast) {
        ElMessage.success({
          message: "成功复制至剪贴板！",
          grouping: true,
        });
      }
    };

    el.__copyingHandler = handler;
    el.addEventListener("click", handler, { passive: true });
  },

  unmounted(el: CopyingElement) {
    if (el.__copyingHandler) {
      el.removeEventListener("click", el.__copyingHandler);
      delete el.__copyingHandler;
    }
  },
};

export default copyingDirective;
