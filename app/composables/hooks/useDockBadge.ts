import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * macOS Dock 徽章管理
 * 用于在 macOS 系统下显示未读消息数量的徽章
 */
export function useDockBadge() {
  const setting = useSettingStore();

  // 是否支持 dock badge (仅 macOS)
  const isDockBadgeSupported = computed(() => {
    return setting.osType === "macos" && !setting.isWeb;
  });

  /**
   * 设置 dock badge 数量
   * @param count 徽章数量，0 或 undefined 表示清除徽章
   */
  async function setDockBadgeCount(count: number = 0) {
    if (!isDockBadgeSupported.value) {
      return;
    }

    try {
      const currentWindow = getCurrentWindow();
      if (count <= 0) {
        // 清除徽章 - 传递 null 来清除
        await currentWindow.setBadgeCount(undefined);
      }
      else {
        // 设置徽章数量
        await currentWindow.setBadgeCount(count);
      }
    }
    catch (error) {
      console.warn("设置 dock badge 失败:", error);
    }
  }

  /**
   * 清除 dock badge
   */
  async function clearDockBadge() {
    if (!isDockBadgeSupported.value) {
      return;
    }

    try {
      const currentWindow = getCurrentWindow();
      await currentWindow.setBadgeCount(undefined);
    }
    catch (error) {
      console.warn("清除 dock badge 失败:", error);
    }
  }

  return {
    isDockBadgeSupported,
    setDockBadgeCount,
    clearDockBadge,
  };
}
