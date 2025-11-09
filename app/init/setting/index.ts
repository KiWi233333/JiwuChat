import { useAutoStartInit } from "./autostart";
import { initFontAndFamily } from "./font";
import { useThemeInit } from "./theme";
import { useUpdateInit } from "./update";
import { removeRootClass, STOP_TRANSITION_KEY } from "./utils";
import { useWindowInit } from "./window";

export { useHotkeyInit } from "./hotkey";
// 重新导出工具函数和常量
export { addRootClass, IS_DEV, IS_PROD, removeRootClass, STOP_TRANSITION_ALL_KEY, STOP_TRANSITION_KEY } from "./utils";
export { useWindowVisibilityInit } from "./visibility";

/**
 * 设置配置初始化
 */
export function useSettingInit() {
  const setting = useSettingStore();

  // 1、主题相关初始化
  useThemeInit();

  // 2、获取版本更新
  useUpdateInit();

  // 3、准备完成关闭加载动画
  removeRootClass(STOP_TRANSITION_KEY);
  setting.showDownloadPanel = false;

  // 4、设置字体 字体大小
  initFontAndFamily().catch(console.error);

  // 5、窗口相关初始化
  const unMountedWindow = useWindowInit();

  // 6、自动重启
  useAutoStartInit();

  return () => {
    unMountedWindow?.();
  };
}
