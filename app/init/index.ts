
import { useWsInit, useWSUnmounted } from "~/composables/hooks/ws/useWsCore";
import { useIframeInit } from "./iframe";
import { useAuthInit, useMsgBoxWebViewInit, userTauriInit } from "./init";
import { useMacOsInit } from "./macos";
import { useHotkeyInit, useSettingInit, useWindowVisibilityInit } from "./setting";
import { initSystemConstant } from "./system";

let unMountedMsgBoxWebView: (() => void) | undefined;
let unMountedTauri: (() => void) | undefined;
let unMountedSettingInit: (() => void) | undefined;
let unMountedHotkeyInit: (() => void) | undefined;
let unMountedIframeInit: (() => void) | undefined;
let unMountedWindowVisibilityInit: (() => void) | undefined;
let unMountedMacOsInit: (() => void) | undefined;


/**
 * 通用初始化
 */
async function useDefaultInit() {
  // 鉴权
  useAuthInit();
  // 系统常量
  initSystemConstant();
  // 初始化窗口可见性
  unMountedWindowVisibilityInit = useWindowVisibilityInit();
  // 设置配置
  unMountedSettingInit = useSettingInit();
  // 初始化快捷键
  unMountedHotkeyInit = useHotkeyInit();
  // iframe通信
  unMountedIframeInit = useIframeInit();
  // 硬件加速管理
  useHardwareAcceleration();
  // 主题自定义管理
  initThemeCustomization();
  // macos初始化
  unMountedMacOsInit = useMacOsInit();
  // Tauri 初始化判断
  userTauriInit().then((call) => {
    unMountedTauri = call || (() => {});
  });
  // 窗口
  unMountedMsgBoxWebView = await useMsgBoxWebViewInit();
}

/**
 * 初始化
 */
async function useInit() {
  // 通用初始化
  useDefaultInit();
  // 会话
  useWsInit();
}

// 卸载
async function useUnmounted() {
  unMountedTauri?.();
  useWSUnmounted?.();
  unMountedMsgBoxWebView?.();
  unMountedSettingInit?.();
  unMountedHotkeyInit?.();
  unMountedIframeInit?.();
  unMountedWindowVisibilityInit?.();
  unMountedMacOsInit?.();
}

/**
 * 初始化
 */
export function appMounted() {
// 初始化
  const route = useRoute();
  const setting = useSettingStore();
  const isIframe = ref(false);
  const showShadowBorderRadius = computed(() => setting.isWeb && !setting.isMobileSize && !isIframe.value);
  const isWindow10 = ref(false);
  // @unocss-include
  const getRootClass = computed(() =>
    ({
      "sm:(w-100vw mx-a h-full)  md:(w-100vw mx-a h-full) lg:(w-1360px mx-a h-92vh max-w-86vw max-h-1020px) shadow-lg": !isIframe.value && setting.isWeb, // iframe
      "!w-24rem h-fit !min-h-28rem flex-row-c-c h-fit !max-h-32rem !rounded-3 border-default-3 dark:(!border-op-20 bg-dark-8 bg-op-90 backdrop-blur-4) shadow-lg": ["login", "oauth-callback"].includes(route.name as string) && !setting.isMobileSize && setting.isWeb, // 登录页
      "!rounded-2 !wind-border-default": showShadowBorderRadius.value || route.path === "/msg" || (setting.isDesktop && isWindow10 && !setting.settingPage.isWindow10Shadow && route.path !== "/msg"),
      "!rounded-0 border-default-t border-color-[#595959b3] dark:border-color-dark-2": (setting.isDesktop && isWindow10 && setting.settingPage.isWindow10Shadow && route.path !== "/msg"),
    }));


  onMounted(async () => {
    if (window) // 判断是否在iframe中
      isIframe.value = window?.self !== undefined && window?.self !== window?.top;
    if (route.path === "/msg" || route.path.startsWith("/extend") || (setting.isDesktop && route.path === "/login") || (setting.isDesktop && route.path.startsWith("/desktop"))) { // 无需链接的情况
      useDefaultInit();
    }
    else {
      useInit();
    }
    if (setting.isDesktop) {
      const v = await useWindowsVersion();
      isWindow10.value = v === "Windows 10";
    }
  });

  onUnmounted(useUnmounted);

  return {
    getRootClass,
  };
}
