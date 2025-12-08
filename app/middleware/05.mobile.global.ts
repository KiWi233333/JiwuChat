import type { NavigationGuardReturn, RouteLocationNormalized } from "vue-router";
import { checkInWhiteList, detectIsDesktop } from "~/utils/routerGuard";

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

  // 检查是否在白名单中
  const inWhiteList = checkInWhiteList(to.path);

  if (!inWhiteList) {
    if (!user.isLogin) {
      user.showLoginPageType = "login";
      return "/login";
    }
  }
  else if (to.path === "/login") {
    if (user.isLogin) {
      return from.path && from.path !== "/login" ? from.path : "/";
    }
  }

  // 扩展页面权限检查
  if (to.path.startsWith("/extend") && !from.path.startsWith("/extend")) {
    window.open(to.path, "_blank");
    return abortNavigation();
  }
}

