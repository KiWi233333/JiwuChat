/**
 * v-auth 指令
 * 权限校验，点击时检查用户登录状态
 *
 * 使用方式：
 * 1. 需要登录：<button v-auth="true">需要登录</button>
 * 2. 不需要登录：<button v-auth="false">不需要登录</button>
 */

import type { Directive, DirectiveBinding } from "vue";

interface AuthElement extends HTMLElement {
  __authHandler?: (e: Event) => void;
}

const authDirective: Directive<AuthElement, boolean | undefined> = {
  mounted(el: AuthElement, binding: DirectiveBinding<boolean | undefined>) {
    const handler = async (e: Event) => {
      e.stopPropagation();
      const user = useUserStore();
      if (binding.value !== undefined && Boolean(binding.value)) {
        user.showLoginPageType = "login";
        return;
      }
      user?.getTokenFn && user?.getTokenFn();
    };

    el.__authHandler = handler;
    el.addEventListener("click", handler, { passive: true });
  },

  updated(el: AuthElement, binding: DirectiveBinding<boolean | undefined>) {
    // 如果绑定值改变，更新处理函数
    if (el.__authHandler) {
      el.removeEventListener("click", el.__authHandler);
    }

    const handler = async (e: Event) => {
      e.stopPropagation();
      const user = useUserStore();
      if (binding.value !== undefined && Boolean(binding.value)) {
        user.showLoginPageType = "login";
        return;
      }
      user?.getTokenFn && user?.getTokenFn();
    };

    el.__authHandler = handler;
    el.addEventListener("click", handler, { passive: true });
  },

  unmounted(el: AuthElement) {
    if (el.__authHandler) {
      el.removeEventListener("click", el.__authHandler);
      delete el.__authHandler;
    }
  },
};

export default authDirective;
