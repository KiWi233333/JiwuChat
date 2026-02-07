import type { RouteLocationNormalized } from "vue-router";
import { MAIN_ROUTES } from "~/constants/route";

export default defineNuxtRouteMiddleware((
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
) => {
  setPageTransition(to, from);
});

function setPageTransition(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
): void {
  const chat = useChatStore();

  // 主页路径需要特殊处理，若主页 chat.isOpenContact 为 true 视为 '/contact'
  const toPath = normalizeMainPath(to.path, chat);
  const fromPath = normalizeMainPath(from.path, chat);

  const toMainIndex = MAIN_ROUTES[toPath];
  const fromMainIndex = MAIN_ROUTES[fromPath];

  // 如果都是一级页面，则不使用滑动动画
  if (toMainIndex !== undefined && fromMainIndex !== undefined) {
    chat.pageTransition.name = "page-fade-in";
    return;
  }

  // 计算路由层级
  const getDepth = (path: string, isMain: boolean) => {
    if (isMain) {
      return 1;
    }
    const segments = path.split("/").filter(Boolean).length;
    return 1 + (segments || 1);
  };

  const toDepth = getDepth(toPath, toMainIndex !== undefined);
  const fromDepth = getDepth(fromPath, fromMainIndex !== undefined);

  if (toDepth > fromDepth) {
    chat.pageTransition.name = "page-slide-left";
  }
  else if (toDepth < fromDepth) {
    chat.pageTransition.name = "page-slide-right";
  }
  else {
    chat.pageTransition.name = "page-fade-in";
  }
}

/**
 * 特殊处理主页：如果路径为 `/` 并且打开了联系人侧边栏，则拼上 `/contact` 用于区别
 */
function normalizeMainPath(path: string, chat: ReturnType<typeof useChatStore>): string {
  if (["/friend", "/ai"].includes(path)) {
    return !chat.isOpenContact ? "/contact" : "/";
  }
  return path;
}
