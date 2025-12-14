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
  const chat = useChatStore();
  const setting = useSettingStore();

  // 消息页面限制
  if (from.path !== "/msg" && to.path === "/msg") {
    return true;
  }

  // 极物圈商品页限制
  if (to.path.startsWith("/goods/detail")) {
    return true;
  }

  // 移动尺寸特定限制
  if (setting.isMobileSize) {
    // 聊天详情页移动端返回处理
    if (from.path === "/" && to.path !== "/" && !to.query?.dis) {
      if (chat.isOpenGroupMember) {
        chat.isOpenGroupMember = false;
        return true;
      }
      if (!chat.isOpenContact) {
        chat.isOpenContact = true;
        return true;
      }
      return false;
    }

    // 好友面板处理
    if (from.path === "/friend" && to.path !== "/friend"
      && chat.showTheFriendPanel) {
      chat.showTheFriendPanel = false;
      return true;
    }
  }

  return false;
}

