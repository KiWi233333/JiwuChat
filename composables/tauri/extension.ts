import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

/**
 * 打开扩展窗口
 */
export function useOpenExtendWind() {
  const openItem = ref<ExtendItem>();
  const setting = useSettingStore();
  // 打开扩展窗口
  const open = async (item: ExtendItem, log: boolean = true) => {
    if (!item.url || item.loading) {
      return;
    }
    if (item.disabled) {
      ElMessage.warning("暂未开放！");
      return;
    }
    if (item.loading) {
      ElMessage.warning("扩展窗口正在加载中！");
      return;
    }
    // 判断是否已经打开
    if (setting.isDesktop) {
      const window = await WebviewWindow.getByLabel(EXTEND_WINDOW_LABEL);
      if (window) {
        if (openItem.value?.url !== item.url)
          ElMessage.warning("扩展窗口已经被占用！");
        nextTick(async () => {
          await window?.unminimize();
          await window?.show();
          await window?.setFocus();
        });
        return;
      }
    }
    item.loading = true;
    createWindow(EXTEND_WINDOW_LABEL, {
      url: item.url,
      title: item.title,
    })
      .then(() => {
        openItem.value = item;
      })
      .finally(() => {
        setTimeout(() => {
          item.loading = false;
        }, 300);
      });
  };
  return {
    open,
    openItem,
  };
}

export interface ExtendItem {
  icon: string;
  activeIcon?: string;
  url?: string;
  title: string;
  class?: string;
  disabled?: boolean,
  loading?: boolean;
  saveTime?: number;
}
