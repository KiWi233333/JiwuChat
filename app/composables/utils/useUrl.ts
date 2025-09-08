import { openUrl } from "@tauri-apps/plugin-opener";
import { open } from "@tauri-apps/plugin-shell";

/**
 * 打开链接
 * @param url 链接
 */
export function useOpenUrl(url: string) {
  const setting = useSettingStore();
  // 兼容桌面端和安卓端
  if (setting.isDesktop) {
    // Tauri2 桌面端和安卓端都支持 openUrl
    openUrl(url);
  }
  else if (setting.isMobile) {
    open(url);
  }
  else {
    window.open(url, "_blank");
  }
}
