/**
 * 图片预览全局组件注册（仅客户端）
 * 在应用启动时注入主应用上下文，使 useImageViewer 在任意位置调用都能正确使用 router、pinia 等
 */
import { initImageViewer } from "~/composables/utils/useImageViewer";

export default defineNuxtPlugin((nuxtApp) => {
  initImageViewer(nuxtApp.vueApp._context);
});
