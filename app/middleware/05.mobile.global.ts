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

  // 检查是否在白名单中
  const inWhiteList = isWhiteListRoute(toPath);

  if (!inWhiteList) {
    // 非白名单路由，需要登录
    if (!user.isLogin) {
      user.showLoginPageType = "login";
      return "/login";
    }
  }
  else if (toPath === "/login") {
    // 已登录用户访问登录页，重定向
    if (user.isLogin) {
      return from.path && from.path !== "/login" ? from.path : "/";
    }
  }

  // 扩展页面权限检查
  if (toPath.startsWith("/extend") && !from.path.startsWith("/extend")) {
    window.open(toPath, "_blank");
    return abortNavigation();
  }
}

