import type { NavigationGuardReturn, RouteLocationNormalized } from "vue-router";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  detectIsDesktop,
  shouldBypassDesktopGuard,
} from "~/utils/routerGuard";

export default defineNuxtRouteMiddleware(async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
): Promise<NavigationGuardReturn> => {
  const setting = useSettingStore();
  const isDesktop = await detectIsDesktop(setting);
  if (!isDesktop) {
    return;
  }

  return await handleDesktopNavigation(to, from);
});

async function handleDesktopNavigation(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
): Promise<NavigationGuardReturn> {
  const user = useUserStore();

  // 登录流程或回调页之间跳转不拦截（桌面端）
  if (shouldBypassDesktopGuard(to.path, from.path)) {
    return;
  }

  // 登录状态路由控制
  if (!user.isLogin) {
    await loadLoginWindow();

    // 登录页面导航限制
    if ((from.path !== "/login" && to.path === "/login")
      || (from.path === "/login" && to.path !== "/login")) {
      return abortNavigation();
    }
  }
  else {
    // 已登录用户的登录页面访问限制
    if (from.path !== "/login" && to.path === "/login") {
      return abortNavigation();
    }

    // 从登录页导航逻辑
    if (from.path === "/login") {
      await loadMainWindow();
      if (to.path !== "/login") {
        return abortNavigation();
      }
    }
    // 扩展页面权限检查
    if (!from.path.startsWith("/extend") && to.path.startsWith("/extend")) {
      return abortNavigation();
    }
    // 页面权限检查
    if (to.path === "/setting") {
      const { open } = useOpenSettingWind();
      open({
        url: "/desktop/setting",
      });
      if (getCurrentWindow().label !== SETTING_WINDOW_LABEL) {
        return abortNavigation();
      }
    }
  }
}

/**
 * 加载登录页
 */
async function loadLoginWindow(): Promise<void> {
  try {
    await detectIsDesktop(useSettingStore());
    await createWindow(LOGIN_WINDOW_LABEL);
    destroyWindow(MAIN_WINDOW_LABEL);
    destroyWindow(MSGBOX_WINDOW_LABEL);
    destroyWindow(EXTEND_WINDOW_LABEL);
    destroyWindow(SETTING_WINDOW_LABEL);
  }
  catch (e) {
    console.error(e);
  }
}

/**
 * 加载主页
 */
async function loadMainWindow(): Promise<void> {
  try {
    await createWindow(MSGBOX_WINDOW_LABEL);
    await createWindow(MAIN_WINDOW_LABEL);
    await destroyWindow(LOGIN_WINDOW_LABEL);
  }
  catch (e) {
    console.error(e);
  }
}

