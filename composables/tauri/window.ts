
import { invoke } from "@tauri-apps/api/core";
import { resolveResource } from "@tauri-apps/api/path";
import { TrayIcon } from "@tauri-apps/api/tray";
import { getCurrentWebviewWindow, WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { appName } from "~/constants";

export const MAIN_WINDOW_LABEL = "main";
export const LOGIN_WINDOW_LABEL = "login";
export const MSGBOX_WINDOW_LABEL = "msgbox";
export const EXTEND_WINDOW_LABEL = "extend";

/** 消息窗口的宽度 */
export const MSG_WEBVIEW_WIDTH = 240;
// 非持久化窗口状态标签
export const IGNORE_SAVE_WINDOW_STATE_LABELS = [
  MSGBOX_WINDOW_LABEL,
  EXTEND_WINDOW_LABEL,
];

// 退出应用窗口标签 （关闭按钮）
export const EXIT_APP_WINDOW_LABELS = [
  LOGIN_WINDOW_LABEL,
];
// 关闭窗口标签 （关闭按钮）
export const CLOSE_DESTORY_WINDOW_LABELS = [
  EXTEND_WINDOW_LABEL,
];
export type Labels = "login" | "main" | "msgbox" | "extend";

/**
 * 退出应用
 */
export const exitApp = () => invoke("exit_app");

/**
 * 获取当前窗口实例
 * @param destroyOnClose 是否销毁窗口
 */
export async function closeWindowHandler(destroyOnClose = false) {
  const setting = useSettingStore();
  if (!setting.isDesktop) {
    return;
  }
  const appWindow = getCurrentWebviewWindow();
  // 关闭登录窗口
  if (destroyOnClose || EXIT_APP_WINDOW_LABELS.includes(appWindow?.label)) {
    ElMessageBox.confirm(`确定要关闭${appName}程序吗？`, "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      center: true,
      callback: async (action: string) => {
        if (action === "confirm") {
          await exitApp();
        }
      },
    });
    return;
  }
  else if (CLOSE_DESTORY_WINDOW_LABELS.includes(appWindow?.label)) {
    ElMessageBox.confirm(`是否关闭当前扩展程序？`, "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      center: true,
      callback: async (action: string) => {
        if (action === "confirm") {
          // 聚焦到主窗口
          const mainWindow = await WebviewWindow.getByLabel(MAIN_WINDOW_LABEL);
          if (mainWindow) {
            mainWindow.setFocus();
          }
          // 销毁当前窗口
          await appWindow?.destroy();
        }
      },
    });
    return;
  }
  await appWindow?.hide();
}


export async function destroyWindow(label: Labels) {
  const wind = await WebviewWindow.getByLabel(label);
  if (wind) {
    try {
      await wind.destroy();
      return true;
    }
    catch (err) {
      return false;
    }
  }
}

export async function minimizeWindow(label?: Labels) {
  const setting = useSettingStore();
  // 自定义弹窗
  const dom = document.getElementById(CustomeDialogPopupId);
  if (dom && dom.dataset.modelValue === "true") {
    return;
  }
  if (!setting.isDesktop) {
    return;
  }
  const chat = useChatStore();
  if (!chat.notDialogShow) {
    chat.notDialogShow = false;
    return;
  }
  const wind = label ? await WebviewWindow.getByLabel(label) : getCurrentWebviewWindow();
  wind?.minimize();
}


const labelRouteMap = {
  login: {
    title: `${appName} - 登录`,
    label: LOGIN_WINDOW_LABEL,
    url: "/login",
  },
  main: {
    title: appName,
    label: MAIN_WINDOW_LABEL,
    url: "/",
  },
  msgbox: {
    title: `${appName} - 消息`,
    label: MSGBOX_WINDOW_LABEL,
    url: "/msgbox",
  },
  extend: {
    title: `${appName} - 扩展`,
    label: EXTEND_WINDOW_LABEL,
    url: "/extend",
    data: {

    },
  },
};

/**
 * 创建指定标签的窗口
 * @param label 窗口标签
 * @returns 是否创建成功
 */
export async function createWindow(label: keyof typeof labelRouteMap, data?: { title: string, url: string }): Promise<boolean> {
  try {
    if (!labelRouteMap[label])
      throw new Error("窗口标签不存在!");
    const url = data?.url || labelRouteMap[label].url;
    const title = data?.title || labelRouteMap[label].title;
    if (data) {
      setWindowSharedData(data);
    }

    // 适配移动端和web
    const setting = useSettingStore();
    if (!setting.isDesktop) {
      await navigateTo(url);
      return true;
    }
    return await invoke(`create_window`, { label, title, url, shadow: !setting.settingPage.isWindow10Shadow });
  }
  catch (err) {
    console.warn(err);
    return false;
  }
}

/**
 * 窗口共享的本地数据
 */
export const DEFAULT_WINDOW_SHARED_DATA_KEY = "window_share_data";
/**
 * 设置窗口共享的本地数据
 * @param data 本地数据
 * @param key 本地数据键
 */
export function setWindowSharedData(data: Record<string, any>, key: string = DEFAULT_WINDOW_SHARED_DATA_KEY) {
  localStorage.setItem(key, JSON.stringify(data));
}
/**
 * 获取窗口共享的本地数据
 * @param key 本地数据键
 * @returns 本地数据
 */
export function getwindowSharedData(key: string = DEFAULT_WINDOW_SHARED_DATA_KEY) {
  return JSON.parse(localStorage.getItem(key) || "{}");
}

/**
 * 窗口显示
 * @param label 窗口标签
 * @returns 窗口实例
 */
export async function showWindow(label: "login" | "main" | "msgbox") {
  const wind = await WebviewWindow.getByLabel(label);
  if (wind) {
    await wind.show();
    await wind.setFocus();
    return wind;
  }
  else {
    return null;
  }
}

export const TrayIconId = "tray_icon";

/**
 * 显示或隐藏闪烁托盘图标。
 */
export async function useFlashTray() {
  const flashTimer = ref<NodeJS.Timeout | null>(null);
  const open = ref(false);
  const activeIcon = ref("icons/icon.png");
  const setting = useSettingStore();
  const iconUrl = await resolveResource("./icons/icon.png");
  const onlineUrl = await resolveResource("./res/online.png");
  const offlineUrl = await resolveResource("./res/offline.png");
  const msgUrl = await resolveResource("./res/msg.png");
  const tray = await TrayIcon.getById(TrayIconId).catch((err) => {
    console.error("获取托盘图标失败", err);
  });
  async function setTrayIcon(icon: string | null) {
    try {
      if (!tray)
        return;
      if (icon === null)
        icon = setting.osType === "linux" ? activeIcon.value : null; // 兼容Linux系统
      tray?.setIcon(icon);
    }
    catch (err) {
      console.error("设置托盘图标失败", err);
      tray?.setIcon(iconUrl);
    }
  }

  const stop = async () => {
    if (flashTimer.value) {
      clearInterval(flashTimer.value);
      flashTimer.value = null; // 清空定时器引用
    }
    setTrayIcon(activeIcon.value);
  };

  const start = async (bool: boolean = false, duration: number = 500) => {
    const tray = await TrayIcon.getById(TrayIconId).catch((err) => {
      console.error("获取托盘图标失败", err);
    });

    if (bool && tray) {
      if (flashTimer.value)
        clearInterval(flashTimer.value);
      flashTimer.value = setInterval(() => {
        setTrayIcon(open.value ? null : msgUrl);
        open.value = !open.value;
      }, duration);
    }
    else {
      stop();
    }
  };

  watch(activeIcon, (newVal, oldVal) => {
    if (newVal === oldVal)
      return;
    setTrayIcon(newVal);
  }, { immediate: true });

  return {
    iconUrl,
    onlineUrl,
    offlineUrl,
    msgUrl,
    activeIcon,
    open,
    start,
    stop,
  };
}
