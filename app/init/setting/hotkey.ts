import { IS_PROD } from "./utils";

/**
 * 初始化快捷键
 */
export function useHotkeyInit() {
  // 使用 hook 方式初始化快捷键
  const setting = useSettingStore();
  const unMountedShortcuts = setting.shortcutManager.initShortcuts();

  // 保持兼容性 - 阻止右键菜单
  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  if (IS_PROD) {
    window.addEventListener("contextmenu", onContextMenu);
  }

  return () => {
    unMountedShortcuts();
    window.removeEventListener("contextmenu", onContextMenu);
  };
}
