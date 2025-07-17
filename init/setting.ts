import {
  disable as disableAutoStart,
  enable as enableAutoStart,
  isEnabled as isAutoStartEnabled,
} from "@tauri-apps/plugin-autostart";

// 动画禁用
export const STOP_TRANSITION_ALL_KEY = "stop-transition-all";
export const STOP_TRANSITION_KEY = "stop-transition";
export function addRootClass(className: string | "stop-transition-all" | "stop-transition") {
  document?.documentElement?.classList?.remove(className);
  document?.documentElement?.classList?.add(className);
}

export function removeRootClass(className: string | "stop-transition-all" | "stop-transition") {
  document?.documentElement?.classList?.remove(className);
}
export const IS_DEV = import.meta.env.DEV;
export const IS_PROD = import.meta.env.PROD;

function onVisibilityChange() {
  const chat = useChatStore();
  const route = useRoute();
  console.log("visibilitychange", !document.hidden);
  if (route.path === "/")
    chat.isVisible = !document.hidden;
  else
    chat.isVisible = false;
}

export function useSettingInit() {
  const setting = useSettingStore();
  // 1、主题切换
  setting.isThemeChangeLoad = true;
  const colorMode = useColorMode();
  watch(() => [setting.settingPage.modeToggle.value, colorMode.value], (val) => {
    if (!val[0])
      return;
    useModeToggle(val[0], undefined, true);
  });
  nextTick(() => {
    useModeToggle(setting.settingPage.modeToggle.value, undefined, true);
  });
  const unlistenStore = useSyncSettingStore();
  // 2、获取版本更新
  const route = useRoute();
  if (route.path !== "/msg") {
    setting.appUploader.isCheckUpdatateLoad = false;
    setting.appUploader.isUpdating = false;
    setting.appUploader.isUpload = false;
    setting.appUploader.version = "";
    setting.appUploader.newVersion = "";
    setting.appUploader.contentLength = 0;
    setting.appUploader.downloaded = 0;
    setting.appUploader.downloadedText = "";
    setting.checkUpdates(false);
  }

  // 3、准备完成关闭加载动画
  removeRootClass(STOP_TRANSITION_KEY);
  ElMessage.closeAll("error");
  setting.showDownloadPanel = false;
  // 4、设置字体
  const font = setting.settingPage.fontFamily.value || null;
  if (font)
    document.documentElement?.style.setProperty("--font-family", font);
  // 字体大小
  const fontSize = setting.settingPage.fontSize.value || null;
  if (fontSize) {
    document.documentElement?.style.setProperty("--font-size", `${fontSize}px`);
  }
  // 5、流畅模式
  watch(() => setting.settingPage.isCloseAllTransition, (val) => {
    if (val)
      addRootClass(STOP_TRANSITION_ALL_KEY);
    else
      removeRootClass(STOP_TRANSITION_ALL_KEY);
  }, {
    immediate: true,
  });
  if (setting.settingPage.modeToggle.value === "auto") {
    const nowDate = new Date();
    useModeToggle(nowDate.getHours() < 18 && nowDate.getHours() > 6 ? "light" : "dark");
  }
  setTimeout(() => {
    setting.isThemeChangeLoad = false;
  }, 1000);

  // 6、窗口大小变化
  setting.isMobileSize = window.innerWidth < 640;
  // 7. 使用防抖函数处理窗口大小变化
  const handleResizeDebounced = useThrottleFn(() => {
    addRootClass(STOP_TRANSITION_KEY);
    setting.isMobileSize = window?.innerWidth <= 768;
    removeRootClass(STOP_TRANSITION_KEY);
  }, 200);
  const handleResize = () => {
    handleResizeDebounced();
  };

  window.addEventListener("resize", handleResize);

  // 7、自动重启
  isAutoStartEnabled().then((isAutoStart) => {
    setting.settingPage.isAutoStart = isAutoStart;
  }).catch(() => {
    setting.settingPage.isAutoStart = false;
  });
  watch(() => setting.settingPage.isAutoStart, async (val) => {
    try {
      if (val)
        await enableAutoStart();
      else
        await disableAutoStart();
    }
    catch (error) {
      console.warn(error);
    }
  });

  return () => {
    removeRootClass(STOP_TRANSITION_KEY);
    unlistenStore();
    const setting = useSettingStore();
    setting.appUploader.isCheckUpdatateLoad = false;
    setting.appUploader.isUpdating = false;
    setting.appUploader.isUpload = false;
  };
}


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

  window.addEventListener("contextmenu", onContextMenu);

  return () => {
    unMountedShortcuts();
    window.removeEventListener("contextmenu", onContextMenu);
  };
}


/**
 * 初始化窗口监听可见性
 */
export function useWindowVisibilityInit() {
  document.addEventListener("visibilitychange", onVisibilityChange);
  return () => {
    // console.log("remove visibilitychange");
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
