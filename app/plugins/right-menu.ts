import ContextMenu from "@imengyu/vue3-context-menu";
import "@imengyu/vue3-context-menu/lib/vue3-context-menu.css";

// highlightjs
// 引入icon
export default defineNuxtPlugin(async (NuxtApp) => {
  NuxtApp.vueApp.use(ContextMenu);
});
