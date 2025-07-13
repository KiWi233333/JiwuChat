import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import {
  disable as disableAutoStart,
  enable as enableAutoStart,
  isEnabled as isAutoStartEnabled,
} from "@tauri-apps/plugin-autostart";

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
  const app = document.body;
  if (app)
    app.classList.remove("stop-transition");
  ElMessage.closeAll("error");
  setting.showDownloadPanel = false;
  // 4、设置字体
  const font = setting.settingPage.fontFamily.value || null;
  if (font)
    document.documentElement.style.setProperty("--font-family", font);
  // 字体大小
  const fontSize = setting.settingPage.fontSize.value || null;
  if (fontSize) {
    document.documentElement.style.setProperty("--font-size", `${fontSize}px`);
  }
  // 5、流畅模式
  if (setting.settingPage.isCloseAllTransition)
    document.documentElement.classList.add("stop-transition-all");
  else
    document.documentElement.classList.remove("stop-transition-all");
  if (setting.settingPage.modeToggle.value === "auto") {
    const nowDate = new Date();
    useModeToggle(nowDate.getHours() < 18 && nowDate.getHours() > 6 ? "light" : "dark");
  }
  setTimeout(() => {
    setting.isThemeChangeLoad = false;
  }, 1000);

  // 6、窗口大小变化
  setting.isMobileSize = window.innerWidth < 640;
  let timer: NodeJS.Timeout | null = null;
  function onResize() {
    const setting = useSettingStore();
    if (timer)
      clearTimeout(timer); // 清除之前的定时器，避免重复触发
    const app = document.documentElement;
    if (app)
      app.classList.add("stop-transition");

    const osType = localStorage.getItem("osType");
    if (osType && ["windows", "macos", "linux"].includes(osType) && IGNORE_SAVE_WINDOW_STATE_LABELS.includes(getCurrentWebviewWindow().label)) {
      return;
    }
    timer = setTimeout(async () => {
      if (app)
        app.classList.remove("stop-transition");
      setting.isMobileSize = window?.innerWidth <= 768; // 判断是否为移动端
      timer = null;
      // if (setting.isDesktop) { // 迁移rust保存
      //   // console.log("save window state");
      //   if (saving.value) {
      //     return;
      //   }
      //   saving.value = true;
      //   // await saveWindowState(StateFlags.ALL); // TODO: 保存窗口状态
      //   saving.value = false;
      // }
    }, 200);
  }
  window.addEventListener("resize", onResize);

  // 7、页面加载完整后，滚动到底部
  setTimeout(() => {
    nextTick(() => {
      const chat = useChatStore();
      chat?.scrollBottom(false);
    });
  }, 0);

  // 8、自动重启
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
    window.removeEventListener("resize", onResize);
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
