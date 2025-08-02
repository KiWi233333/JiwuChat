import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { appName } from "@/constants/index";

/**
 * 打开设置窗口
 */
export function useOpenSettingWind() {
  const openItem = ref<SettingItem>();
  const setting = useSettingStore();
  // 打开设置窗口
  const open = async (item: SettingItem) => {
    if (!item.url) {
      return false;
    }
    if (!setting.isDesktop) {
      return false;
    }
    // 判断是否已经打开
    if (setting.isDesktop) {
      const window = await WebviewWindow.getByLabel(SETTING_WINDOW_LABEL);
      if (window) {
        nextTick(async () => {
          await window?.unminimize();
          await window?.show();
          await window?.setFocus();
        });
        return true;
      }
    }

    const settingWindow = new WebviewWindow(SETTING_WINDOW_LABEL, {
      url: item.url,
      title: `${appName} - 设置`,
      width: 920,
      height: 820,
      minWidth: 920,
      minHeight: 820,
      shadow: setting.openShadow,
      resizable: true,
      decorations: setting.osType === "macos",
      titleBarStyle: setting.osType === "macos" ? "overlay" : undefined,
      hiddenTitle: setting.osType === "macos",
      transparent: true,
      focus: true,
      center: true,
      parent: MAIN_WINDOW_LABEL,
      backgroundColor: setting.osType === "macos"
        ? {
            red: 0,
            green: 0,
            blue: 0,
            alpha: 0.0,
          }
        : undefined,
    });

    settingWindow.once("tauri://created", () => {
      openItem.value = item;
    });

    settingWindow.once("tauri://error", (e) => {
      console.log(e);
    });
    return settingWindow;
  };
  return {
    open,
    openItem,
  };
}

export interface SettingItem {
  url: string;
}
