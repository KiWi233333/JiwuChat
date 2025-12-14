import type { NavigationGuardReturn, RouteLocationNormalized } from "vue-router";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { detectIsDesktop } from "~/utils/routerGuard";

/** 未登录时开放的路由（登录页、OAuth 回调页） */
const UNAUTHENTICATED_ROUTES = ["/login", "/oauth/callback"];

/** 检查路径是否为未登录开放路由 */
function isUnauthenticatedRoute(path: string): boolean {
  return UNAUTHENTICATED_ROUTES.some(route =>
    path === route || path.startsWith(`${route}/`) || path.startsWith(`${route}?`),
  );
}

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
  const toPath = to.path;
  const fromPath = from.path;
  const isToUnauthRoute = isUnauthenticatedRoute(toPath);
  const isFromUnauthRoute = isUnauthenticatedRoute(fromPath);

  // ========== 未登录状态 ==========
  if (!user.isLogin) {
    // 未登录时，只允许访问开放路由
    if (isToUnauthRoute) {
      // 确保登录窗口已打开
      await ensureLoginWindow();
      return;
    }

    // 未登录访问受保护路由，重定向到登录页
    await ensureLoginWindow();
    return navigateTo("/login");
  }

  // ========== 已登录状态 ==========

  // 已登录用户访问开放路由（如 /oauth/callback），放行
  if (isToUnauthRoute) {
    return;
  }

  // 从开放路由（登录页/回调页）跳转到主页面，需要切换窗口
  if (isFromUnauthRoute && !isToUnauthRoute) {
    await switchToMainWindow();
    // 在登录窗口中阻止导航，让主窗口处理
    if (getCurrentWindow().label === LOGIN_WINDOW_LABEL) {
      return abortNavigation();
    }
    return;
  }

  // 扩展页面权限检查
  if (!fromPath.startsWith("/extend") && toPath.startsWith("/extend")) {
    return abortNavigation();
  }

  // 设置页面处理
  if (toPath === "/setting") {
    const { open } = useOpenSettingWind();
    open({ url: "/desktop/setting" });
    if (getCurrentWindow().label !== SETTING_WINDOW_LABEL) {
      return abortNavigation();
    }
  }
}

/**
 * 确保登录窗口已打开（未登录状态）
 */
async function ensureLoginWindow(): Promise<void> {
  try {
    await createWindow(LOGIN_WINDOW_LABEL);
    // 关闭其他窗口
    destroyWindow(MAIN_WINDOW_LABEL);
    destroyWindow(MSGBOX_WINDOW_LABEL);
    destroyWindow(EXTEND_WINDOW_LABEL);
    destroyWindow(SETTING_WINDOW_LABEL);
  }
  catch (e) {
    console.error("ensureLoginWindow error:", e);
  }
}

/**
 * 切换到主窗口（登录成功后）
 */
async function switchToMainWindow(): Promise<void> {
  try {
    // 先创建主窗口
    await createWindow(MAIN_WINDOW_LABEL);
    await createWindow(MSGBOX_WINDOW_LABEL);
    // 再关闭登录窗口
    await destroyWindow(LOGIN_WINDOW_LABEL);
  }
  catch (e) {
    console.error("switchToMainWindow error:", e);
  }
}

