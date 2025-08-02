
import { useIframeInit } from "./iframe";
import { useAuthInit, useMsgBoxWebViewInit, userTauriInit } from "./init";
import { useMacOsInit } from "./macos";
import { useHotkeyInit, useSettingInit, useWindowVisibilityInit } from "./setting";
import { initSettingStoreSync } from "./share";
import { initSystemConstant } from "./system";
import { useWsInit, useWSUnmounted } from "./ws";

let unMountedMsgBoxWebView: (() => void) | undefined;
let unMountedTauri: (() => void) | undefined;
let unMountedSettingInit: (() => void) | undefined;
let unMountedHotkeyInit: (() => void) | undefined;
let unMountedIframeInit: (() => void) | undefined;
let unMountedWindowVisibilityInit: (() => void) | undefined;
let unMountedSettingStoreSync: (() => void) | undefined;
let unMountedMacOsInit: (() => void) | undefined;


/**
 * 通用初始化
 */
export async function useDefaultInit() {
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
  // 跨标签页同步
  unMountedSettingStoreSync = initSettingStoreSync();
  // macos初始化
  unMountedMacOsInit = useMacOsInit();
}

/**
 * 初始化
 */
export async function useInit() {
  // 通用初始化
  useDefaultInit();
  // 会话
  useWsInit();
  // Tauri
  userTauriInit().then((call) => {
    unMountedTauri = call || (() => {});
  });
  // 窗口
  unMountedMsgBoxWebView = await useMsgBoxWebViewInit();
}

// 卸载
export async function useUnmounted() {
  unMountedTauri?.();
  useWSUnmounted?.();
  unMountedMsgBoxWebView?.();
  unMountedSettingStoreSync?.();
  unMountedSettingInit?.();
  unMountedHotkeyInit?.();
  unMountedIframeInit?.();
  unMountedWindowVisibilityInit?.();
}
