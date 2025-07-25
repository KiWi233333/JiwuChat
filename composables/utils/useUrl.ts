import { openUrl } from "@tauri-apps/plugin-opener";

/**
 * 打开链接
 * @param url 链接
 */
export function useOpenUrl(url: string) {
  const setting = useSettingStore();
  if (setting.isDesktop) {
    openUrl(url);
  }
  else {
    window.open(url, "_blank");
  }
}
