import type { LogicalPosition } from "@tauri-apps/api/dpi";
import { PhysicalPosition } from "@tauri-apps/api/dpi";
import { listen } from "@tauri-apps/api/event";
import { appDataDir } from "@tauri-apps/api/path";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { isPermissionGranted, requestPermission } from "@tauri-apps/plugin-notification";
import { openUrl } from "@tauri-apps/plugin-opener";
import { type as osType, platform } from "@tauri-apps/plugin-os";
import { restoreStateCurrent, StateFlags } from "@tauri-apps/plugin-window-state";
import { MSG_WEBVIEW_WIDTH, useFlashTray } from "~/composables/tauri/window";


/**
 * Tauri事件
 */
export async function userTauriInit() {
  const setting = useSettingStore();
  try {
    const appPlatform = platform();
    if (!appPlatform)
      return;
    setting.appPlatform = appPlatform;
  }
  catch (error) {
    // console.warn(error);
    setting.appPlatform = "web";
    setting.osType = "web";
    return;
  }
  try {
    const osTypeName = osType();
    if (!osTypeName)
      return;
    localStorage.setItem("osType", osTypeName); // 存储到本地
    setting.osType = osTypeName;
  }
  catch (error) {
    // console.warn(error);
    setting.appPlatform = "web";
    setting.osType = "web";
    return;
  }
  const isMobileSystem = ["android", "ios"].includes(setting.osType);

  // 1、初始化窗口状态
  if (!isMobileSystem) { // 非移动端才有该功能
    restoreStateCurrent(StateFlags.ALL);
  }
  // msgbox 默认不调整
  const main = WebviewWindow.getCurrent();
  if (main.label === "msgbox" && useRoute().path !== "/msg") {
    navigateTo("/msg");
    return;
  }
  main.show();

  // 监听open_url事件
  const unListenOpenUrl = await listen<PayloadType>("open_url", (e) => {
    const url = e.payload.message; // 路径
    const urlProgram = setting.isMobile ? "inAppBrowser" : "";
    if (url)
      openUrl(url, urlProgram);
  });
  // 监听路由事件
  const unListenRouter = await listen<PayloadType>("router", (e) => {
    const path = e.payload.message; // 路径
    if (path)
      navigateTo(path);
  });

  // 2、获取通知权限
  let permissionGranted = await isPermissionGranted();
  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === "granted";
    setting.sysPermission.isNotification = permissionGranted; // 更新通知权限状态
  }
  else {
    setting.sysPermission.isNotification = permissionGranted; // 更新通知权限状态
  }
  // 3、获取文件路径
  if (!await existsFile(setting.appDataDownloadDirUrl))
    setting.appDataDownloadDirUrl = `${await appDataDir()}\\downloads`;

  return () => {
    unListenRouter?.();
    unListenOpenUrl?.();
  };
}

/**
 * 初始化用户信息
 */
export function useAuthInit() {
  const user = useUserStore();
  // 用于iframe嵌入快速登录
  const route = useRoute();
  const iframeToken = route.query.token;
  if (iframeToken && !user.isLogin) {
    let loading = {} as any;
    loading = ElLoading.service({ fullscreen: true, text: "正在登录，请稍等..." });
    user.onUserLogin(String(iframeToken), true, undefined, () => {
      setTimeout(() => {
        loading?.close?.();
      }, 300);
    });
  }
  else {
    // 确认是否登录
    user.onCheckLogin();
  }
}


// resolveUnReadContact
async function resolveUnReadContact(contact: ChatContactExtra | undefined) {
  if (!contact)
    return;
  const chat = useChatStore();
  const mainWin = WebviewWindow.getCurrent();
  await navigateTo("/");
  await mainWin.show();
  await mainWin.isMinimized() && await mainWin.unminimize();
  chat.setContact(contact);
  if (contact && chat.theRoomId === contact?.roomId)
    chat.setReadRoom(contact?.roomId);
  await nextTick();
  chat.scrollBottom(false);
}

async function resolveUserApply() {
  const chat = useChatStore();
  if (chat.applyUnReadCount > 0) {
    const mainWin = WebviewWindow.getCurrent();
    await navigateTo("/friend");
    await mainWin?.show();
    await mainWin?.isMinimized() && await mainWin?.unminimize();
    await mainWin?.setFocus();
    // 切换到好友申请页面
    chat.setTheFriendOpt(FriendOptType.NewFriend);
  }
}

/**
 * 初始化消息通知窗口 (仅限桌面端)
 */
export async function useMsgBoxWebViewInit() {
  let platformName = "web";
  const MSG_WEBVIEW_HEIGHT = ref(300);
  try {
    platformName = platform();
  }
  catch (error) {
    return;
  }
  if (!["windows", "linux", "macos"].includes(platformName))
    return;
  restoreStateCurrent(StateFlags.ALL);
  const chat = useChatStore();
  const setting = useSettingStore();
  const user = useUserStore();
  const ws = useWsStore();

  // 监听消息通知事件
  const channel = new BroadcastChannel("main_channel");
  channel.addEventListener("message", handleChannelMsg);
  // 是否有新消息，控制图标闪烁
  const { start, stop, activeIcon, onlineUrl, offlineUrl } = await useFlashTray();
  watchDebounced([() => chat.isNewMsg, () => setting.settingPage.notificationType], async ([newAllMsg, notificationType], oldVal) => {
    if (notificationType !== NotificationEnums.TRAY || !newAllMsg) {
      stop();
      return;
    }
    if (newAllMsg)
      start(true);
  }, {
    immediate: true,
    debounce: 300,
  });
  const online = useOnline();

  watch(() => user.isLogin && online.value && ws.status === WsStatusEnum.OPEN, (newVal, oldVal) => {
    activeIcon.value = newVal ? onlineUrl : offlineUrl;
  }, {
    immediate: true,
  });

  // 判断是否已存在消息通知窗口
  const webview = await WebviewWindow.getByLabel(MSGBOX_WINDOW_LABEL);
  if (!webview)
    return;

  // 获取消息通知窗口
  const msgbox = await WebviewWindow.getByLabel("msgbox");
  if (msgbox) {
    msgbox?.innerSize().then((size) => {
      MSG_WEBVIEW_HEIGHT.value = size.height;
    });
  }


  // 监听点击事件消息通知事件
  const trayClickUnlisten = await listen("tray_click", async (event) => {
    const win = await WebviewWindow.getByLabel(MAIN_WINDOW_LABEL);
    if (!win)
      return;

    if (chat.isNewMsg) {
      // 消费第一个未读消息
      const contact = chat.unReadContactList[0];
      if (chat.applyUnReadCount > 0) {
        resolveUserApply(); // 处理好友申请
        return;
      }
      resolveUnReadContact(contact);
    }
    else {
      stop();
    }
  });

  // 鼠标移入托盘
  const trayMouseoverUnlisten = await listen("tray_mouseenter", async (event) => {
    if (!chat.isNewMsg)
      return;
    if (useSettingStore().settingPage.notificationType !== NotificationEnums.TRAY) { // 未开启托盘通知
      return;
    }
    const win = await WebviewWindow.getByLabel("msgbox");
    if (!win)
      return;
    const position = event.payload as LogicalPosition;

    const setting = useSettingStore();
    const screenSize = window.screen;

    // 获取屏幕缩放比例
    const scaleFactor = await win.scaleFactor() || window.devicePixelRatio || 1;

    // 计算任务栏尺寸（考虑缩放）
    const taskWidth = (screenSize.width - screenSize.availWidth) * scaleFactor;
    const taskHeight = (screenSize.height - screenSize.availHeight) * scaleFactor;

    // 计算可用屏幕尺寸（考虑缩放）
    const availWidth = screenSize.availWidth * scaleFactor;
    const availHeight = screenSize.availHeight * scaleFactor;

    // 消息窗口尺寸（考虑缩放）
    const msgWidth = MSG_WEBVIEW_WIDTH;
    const msgHeight = MSG_WEBVIEW_HEIGHT.value;

    if (setting.osType === "windows") {
      // 任务栏 上下左右四个位置
      let x = position.x - msgWidth / 2;
      let y = position.y - msgHeight;

      // 调整位置，确保窗口完全在屏幕内
      if (x < 0) {
        x = taskWidth;
        y = position.y - msgHeight / 2;
      }
      if (y < 0) {
        x = position.x - msgWidth / 2;
        y = taskHeight;
      }
      if (x + msgWidth > availWidth) {
        x = availWidth - msgWidth;
        y = position.y - msgHeight / 2;
      }
      if (y + msgHeight > availHeight) {
        y = availHeight - msgHeight;
      }
      // 使用 LogicalPosition 设置位置
      if (!await win.isVisible()) {
        await win.setPosition(new PhysicalPosition(x, y).toLogical(scaleFactor));
      }
    }
    else if (setting.osType === "macos") {
      // macOS 托盘位置通常在顶部，调整窗口位置
      const x = position.x - msgWidth / 2;
      const y = position.y;
      if (!await win.isVisible()) {
        await win.setPosition(new PhysicalPosition(x, y).toLogical(scaleFactor));
      }
    }
    await win.setAlwaysOnTop(true);
    await win.show();
  });

  // 移出托盘
  const debounceTrayleave = useDebounceFn(async (event) => {
    const win = await WebviewWindow.getByLabel("msgbox");
    if (!win)
      return;
    if (!await win.isFocused()) {
      await win.hide();
    }
  }, 300);
  const trayMouseoutUnlisten = await listen("tray_mouseleave", debounceTrayleave);

  return () => {
    stop();
    channel.removeEventListener("message", handleChannelMsg);
    trayMouseoverUnlisten?.();
    trayClickUnlisten?.();
    trayMouseoutUnlisten?.();
  };
}

/**
 * 处理消息通知事件
 * @param event 事件
 * @returns void
 */
async function handleChannelMsg(event: MessageEvent) {
  const payload = event.data;
  const ws = useWsStore();
  const user = useUserStore();
  const chat = useChatStore();
  const mainWin = await WebviewWindow?.getByLabel(MAIN_WINDOW_LABEL);

  if (!payload)
    return;

  // 是否托盘通知
  const setting = useSettingStore();
  if (setting.settingPage.notificationType !== NotificationEnums.TRAY) {
    return;
  }
  const { type, data } = payload;
  if (type === "readContact") { // 读取单个
    if (!data.roomId)
      return;
    chat.setContact(chat.contactMap[data.roomId]);
    if (chat.theRoomId === data.roomId)
      chat.setReadRoom(data.roomId);
    if (mainWin) {
      await navigateTo("/");
      await mainWin?.show();
      await mainWin.isMinimized() && await mainWin.unminimize();
      await mainWin?.setFocus();
      chat.scrollBottom(false);
    }
  }
  else if (type === "readAllContact") { // 读取全部
    await navigateTo("/");
    resolveUserApply(); // 处理好友申请
    chat.unReadContactList.forEach((p) => {
      setMsgReadByRoomId(p.roomId, user.getToken).then((res) => {
        if (res.code !== StatusCode.SUCCESS)
          return false;
        p.unreadCount = 0;
        ws.wsMsgList.newMsg = ws.wsMsgList.newMsg.filter(k => k.message.roomId !== p.roomId);
        if (p.roomId === chat.theRoomId) {
          chat.theContact.unreadCount = 0;
          chat.theContact.unreadMsgList = [];
        }
      }).catch(() => {
        console.warn("readAllContact error");
      });
      return p;
    });
  }
  else if (type === "openFriendApply") { // 打开好友申请页面
    if (mainWin) {
      resolveUserApply();
    }
  }
}
