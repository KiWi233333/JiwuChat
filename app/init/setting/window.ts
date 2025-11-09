import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { addRootClass, removeRootClass, STOP_TRANSITION_KEY } from "./utils";

/**
 * 初始化窗口相关配置
 */
export function useWindowInit() {
  const setting = useSettingStore();

  // 1、初始化窗口大小
  setting.isMobileSize = window.innerWidth < 640;

  // 2. 使用防抖函数处理窗口大小变化
  const handleResizeDebounced = useThrottleFn(() => {
    addRootClass(STOP_TRANSITION_KEY);
    requestAnimationFrame(() => removeRootClass(STOP_TRANSITION_KEY));
  }, 200);

  const handleResize = () => {
    setting.isMobileSize = window?.innerWidth <= 768;
    handleResizeDebounced();
  };

  window.addEventListener("resize", handleResize);

  // 3. 窗口阴影 (Windows 10)
  useWindowsVersion()
    .then(async (version) => {
      if (version === "Windows 10") {
        console.log("checkWind10CloseShadow checking...");
        watch(() => setting.settingPage.isWindow10Shadow, (val) => {
          if (setting.isDesktop) {
            getCurrentWebviewWindow()?.setShadow(val);
          }
        }, {
          immediate: true,
        });
      }
    })
    .catch(console.error);

  return () => {
    window.removeEventListener("resize", handleResize);
  };
}
