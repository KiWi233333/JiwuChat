import type { NavigationGuardReturn, RouteLocationNormalized } from "vue-router";
import { detectIsDesktop } from "~/utils/routerGuard";

/** 未登录时开放的路由白名单 */
const WHITE_LIST_ROUTES = ["/login", "/oauth/callback"];

/** 检查路径是否在白名单中 */
function isWhiteListRoute(path: string): boolean {
  return WHITE_LIST_ROUTES.some(route =>
    path === route || path.startsWith(`${route}/`) || path.startsWith(`${route}?`),
  );
}

/** 桌面端专属路由（移动端/Web 禁止访问） */
const DESKTOP_ONLY_ROUTES = ["/msgbox", "/desktop"];

/** 检查是否为桌面端专属路由 */
function isDesktopOnlyRoute(path: string): boolean {
  return DESKTOP_ONLY_ROUTES.some(route =>
    path === route || path.startsWith(`${route}/`),
  );
}

export default defineNuxtRouteMiddleware(async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
): Promise<NavigationGuardReturn> => {
  const setting = useSettingStore();
  const isDesktop = await detectIsDesktop(setting);
  if (isDesktop) {
    return;
  }

  return handleMobileWebNavigation(to, from);
});

function handleMobileWebNavigation(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
): NavigationGuardReturn {
  const user = useUserStore();
  const toPath = to.path;

  // 桌面端专属路由，移动端/Web 禁止访问
  if (isDesktopOnlyRoute(toPath)) {
    return from.path && from.path !== toPath ? from.path : "/";
  }

  // 扩展页面在新窗口打开
  if (toPath.startsWith("/extend") && !from.path.startsWith("/extend")) {
    window.open(toPath, "_blank");
    return abortNavigation();
  }

  // 未登录处理
  if (!user.isLogin) {
    // 访问白名单路由，允许访问
    if (isWhiteListRoute(toPath))
      return;
    // 访问受保护路由，跳转登录页
    user.showLoginPageType = "login";
    return "/login";
  }

  // 已登录处理
  // 已登录访问登录页，重定向到来源页或首页
  if (toPath === "/login") {
    return from.path && from.path !== "/login" ? from.path : "/";
  }
}

