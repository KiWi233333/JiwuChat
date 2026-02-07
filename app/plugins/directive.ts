import authDirective from "@/directives/auth";
import copyingDirective from "@/directives/copying";
import longpressDirective from "@/directives/longpress";
import rippleDirective from "@/directives/ripple";
import swipeDirective from "@/directives/swipe";
import tiltDirective from "@/directives/tilt";
import windowLockDirective from "@/directives/window-lock";

export default defineNuxtPlugin((nuxtApp) => {
  /**
   * 3D Tilt Effect
   */
  nuxtApp.vueApp.directive("tilt", tiltDirective);

  /**
   * 波纹涟漪效果
   */
  nuxtApp.vueApp.directive("ripple", rippleDirective);

  /**
   * 长按事件
   */
  nuxtApp.vueApp.directive("longpress", longpressDirective);

  /**
   * 窗口锁定
   */
  nuxtApp.vueApp.directive("window-lock", windowLockDirective);

  /**
   * 复制文本
   */
  nuxtApp.vueApp.directive("copying", copyingDirective);

  /**
   * 权限校验
   */
  nuxtApp.vueApp.directive("auth", authDirective);

  /**
   * 滑动手势
   */
  nuxtApp.vueApp.directive("swipe", swipeDirective);
});
