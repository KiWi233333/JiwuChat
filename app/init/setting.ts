import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
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
    useModeToggle(val[0]);
  });
  nextTick(() => useModeToggle(setting.settingPage.modeToggle.value, undefined, false));

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
  setting.showDownloadPanel = false;

  // 4、设置字体 字体大小
  initFontAndFamily().catch(console.error);

  // 5、流畅模式
  watch(() => setting.settingPage.isCloseAllTransition, (val) => {
    if (val)
      addRootClass(STOP_TRANSITION_ALL_KEY);
    else
      removeRootClass(STOP_TRANSITION_ALL_KEY);
  }, {
    immediate: true,
  });
  // if (setting.settingPage.modeToggle.value === "auto") {
  //   const nowDate = new Date();
  //   useModeToggle(nowDate.getHours() < 18 && nowDate.getHours() > 6 ? "light" : "dark");
  // }
  setTimeout(() => {
    setting.isThemeChangeLoad = false;
  }, 1000);

  // 6、窗口大小变化
  setting.isMobileSize = window.innerWidth < 640;

  // 7. 使用防抖函数处理窗口大小变化
  const handleResizeDebounced = useThrottleFn(() => {
    addRootClass(STOP_TRANSITION_KEY);
    requestAnimationFrame(() => removeRootClass(STOP_TRANSITION_KEY));
  }, 200);
  const handleResize = () => {
    setting.isMobileSize = window?.innerWidth <= 768;
    handleResizeDebounced();
  };
  window.addEventListener("resize", handleResize);

  // 8、自动重启
  isAutoStartEnabled().then((isAutoStart) => {
    setting.settingPage.isAutoStart = isAutoStart;
  }).catch(() => {
    setting.settingPage.isAutoStart = false;
  });
  watchDebounced(() => setting.settingPage.isAutoStart, async (val) => {
    try {
      if (val)
        await enableAutoStart();
      else
        await disableAutoStart();
    }
    catch (error) {
      console.warn(error);
    }
  }, {
    debounce: 100,
  });

  // 9. 窗口阴影
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


  // 10、监听主题
  const { startWatchers } = useThemeCustomization();
  startWatchers();

  return () => {
  };
}

/**
 * 监听字体风格
 */
async function initFontAndFamily() {
  const setting = useSettingStore();

  const fontFamily = setting.settingPage.fontFamily.value;
  if (fontFamily)
    document.documentElement?.style.setProperty("--font-family", fontFamily);
  // 1. 设置字体大小
  watch(() => setting.settingPage.fontSize.value, (val) => {
    document.documentElement?.style.setProperty("--font-size", `${val}px`);
  }, {
    immediate: true,
  });

  // 2. 监听字体风格
  if (!setting.settingPage.fontFamily.list.length) {
    setting.settingPage.fontFamily.list = DEFAULT_FONT_FAMILY_LIST;
  }

  // 动态加载网络字体
  async function loadWebFont(fontItem: typeof DEFAULT_FONT_FAMILY_LIST[0]) {
    if (!fontItem.url || !document.fonts)
      return;

    try {
      const fontFace = new FontFace(
        fontItem.value,
        `url(${fontItem.url}) format("woff2")`,
        { weight: String(fontItem.baseFontWeight || 400) },
      );

      await fontFace.load();
      document.fonts.add(fontFace);
    }
    catch (error) {
      console.warn(`字体加载失败: ${fontItem.name}`, error);
    }
  }

  // 初始化一次
  loadFont(setting.settingPage.fontFamily.value).catch(console.error);

  async function loadFont(fontValue: string) {
    // 从默认字体列表中查找对应的字体配置
    const fontItem = DEFAULT_FONT_FAMILY_LIST.find(item => item.value === fontValue);

    // 如果是网络字体，先加载
    if (fontItem?.url) {
      await loadWebFont(fontItem);
    }
    // 如果 fontValue 是一个有效的字体名称，则将其作为首选字体，否则回退到系统默认字体
    const fontStack = `${fontValue}`;
    document.documentElement.style.setProperty("--font-family", fontStack);
  }

  // 监听字体变化并应用到根元素
  watch(
    () => setting.settingPage.fontFamily.value,
    async (fontValue) => {
      if (fontValue) {
        const loading = document
          ? ElLoading.service({
              fullscreen: true,
              text: "加载中...",
              background: "transparent",
              spinner: defaultLoadingIcon,
            })
          : null;
        await loadFont(fontValue);
        setTimeout(() => {
          loading?.close();
        }, 300);
      }
    },
  );
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

  if (import.meta.env.PROD) {
    window.addEventListener("contextmenu", onContextMenu);
  }

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
