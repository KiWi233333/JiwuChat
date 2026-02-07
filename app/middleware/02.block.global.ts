import type { NavigationGuardReturn, RouteLocationNormalized } from "vue-router";
import { getBlockNavigationMessage } from "~/utils/routerGuard";

export default defineNuxtRouteMiddleware((
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
): NavigationGuardReturn => {
  const setting = useSettingStore();
  // 检测 Element Plus 弹窗，如果有弹窗打开则阻止导航并关闭弹窗
  if (hasElementPlusPopup()) {
    closeTopElementPlusPopup();
    return abortNavigation();
  }

  // web + 大尺寸
  if (setting.isWeb && !setting.isMobileSize && to.path === "/setting") {
    return "/setting/notification";
  }

  if (shouldBlockNavigation(to, from) && !to.query?.dis) {
    return abortNavigation(getBlockNavigationMessage(to.path));
  }
});

/**
 * 检测是否有 Element Plus 弹窗打开
 */
function hasElementPlusPopup(): boolean {
  if (typeof document === "undefined")
    return false;

  // Element Plus 弹窗选择器
  const selectors = [
    ".el-message-box__wrapper",
    ".el-overlay-dialog",
    ".el-overlay:has(.el-message-box)",
    ".el-overlay:has(.el-dialog)",
    ".el-overlay:has(.el-drawer)",
  ];

  for (const selector of selectors) {
    try {
      const elements = document.querySelectorAll<HTMLElement>(selector);
      for (const el of elements) {
        const style = window.getComputedStyle(el);
        if (style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0") {
          return true;
        }
      }
    }
    catch {
      continue;
    }
  }
  return false;
}

/**
 * 关闭最上层的 Element Plus 弹窗
 */
function closeTopElementPlusPopup(): void {
  if (typeof document === "undefined")
    return;

  // 优先关闭 MessageBox
  const messageBoxClose = document.querySelector<HTMLButtonElement>(".el-message-box__headerbtn");
  if (messageBoxClose) {
    messageBoxClose.click();
    return;
  }

  // 关闭 Dialog
  const dialogClose = document.querySelector<HTMLButtonElement>(".el-dialog__headerbtn");
  if (dialogClose) {
    dialogClose.click();
    return;
  }

  // 关闭 Drawer
  const drawerClose = document.querySelector<HTMLButtonElement>(".el-drawer__close-btn");
  if (drawerClose) {
    drawerClose.click();
    return;
  }

  // 备用：触发 ESC 键
  const escEvent = new KeyboardEvent("keydown", {
    key: "Escape",
    code: "Escape",
    keyCode: 27,
    which: 27,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(escEvent);
}

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

