export default defineNuxtPlugin((nuxtApp) => {
  /**
   * 长按事件
   */
  nuxtApp.vueApp.directive("longpress", {
    mounted(el, binding) {
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

      // 开始
      el.addEventListener("mousedown", start, { passive: true });
      el.addEventListener("touchstart", start, { passive: true });
      // 取消
      el.addEventListener("mouseout", cancel, { passive: true });
      el.addEventListener("touchend", cancel, { passive: true });
      el.addEventListener("click", cancel, { passive: true });
    },
  });


  /**
   * 窗口锁定
   */
  nuxtApp.vueApp.directive("window-lock", {
    mounted(el, binding) {
      if (binding.value) {
        const cWidth = document.body.clientWidth || document.documentElement.clientWidth;// 页面可视区域宽度
        const iWidth = window.innerWidth;// 浏览器窗口大小
        document.body.style.paddingRight = `${iWidth - cWidth}px`;
        document.body.style.overflow = "hidden";
      }
      else {
        document.body.style.overflow = "auto";
        document.body.style.paddingRight = "0px";
      }
    },
    updated(el, binding) {
      if (binding.value) {
        const cWidth = document.body.clientWidth || document.documentElement.clientWidth;// 页面可视区域宽度
        const iWidth = window.innerWidth;// 浏览器窗口大小
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
  });


  /**
   * 复制文本
   */
  nuxtApp.vueApp.directive("copying", {
    mounted(el, binding) {
      el.addEventListener("click", async (e: Event) => {
        e.stopPropagation();
        const res = await useAsyncCopyText(binding.value || el.innerHTML);
        if (res && binding.modifiers.toast) {
          ElMessage.success({
            message: "成功复制至剪贴板！",
            grouping: true,
          });
        }
      }, { passive: true });
    },
  });


  /**
   * 权限校验
   */
  nuxtApp.vueApp.directive("auth", {
    mounted(el, binding) {
      el.addEventListener("click", async (e: Event) => {
        e.stopPropagation();
        const user = useUserStore();
        if (binding.value !== undefined && Boolean(binding.value)) {
          user.showLoginPageType = "login";
          return;
        }
        user?.getTokenFn && user?.getTokenFn();
      }, { passive: true });
    },
  });
});
