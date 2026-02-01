import type { NavigationGuardReturn, RouteLocationNormalized } from "vue-router";
import { getBlockNavigationMessage } from "~/utils/routerGuard";

export default defineNuxtRouteMiddleware((
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
): NavigationGuardReturn => {
  if (shouldBlockNavigation(to, from) && !to.query?.dis) {
    return abortNavigation(getBlockNavigationMessage(to.path));
  }
});

function shouldBlockNavigation(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
): boolean {
  // 消息页面限制
  if (from.path !== "/msg" && to.path === "/msg") {
    return true;
  }

  // 极物圈商品页限制
  if (to.path.startsWith("/goods/detail")) {
    return true;
  }

  return false;
}

