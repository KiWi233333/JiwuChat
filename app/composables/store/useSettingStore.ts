import type { OsType, Platform } from "@tauri-apps/plugin-os";
import type { Update } from "@tauri-apps/plugin-updater";
import type { Action } from "element-plus";
import type { ThemeConfig } from "~/composables/hooks/useThemeCustomization";
import type { ExtendItem } from "~/composables/tauri/extension";
import type { SystemConstantVO } from "~/init/system";
import { appDataDir } from "@tauri-apps/api/path";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { disable as disableAutostart, isEnabled as isAutostartEnabled } from "@tauri-apps/plugin-autostart";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { BaseDirectory } from "@tauri-apps/plugin-fs";
import { openPath } from "@tauri-apps/plugin-opener";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
// import { filename as windowStateFilename } from "@tauri-apps/plugin-window-state";
import { acceptHMRUpdate, defineStore } from "pinia";

/**
 * 默认呼叫铃声
 */
export const DEFAULT_RTC_CALL_BELL_URL = "/sound/bell.mp3";
export enum NotificationEnums {
  SYSTEM = "system",
  TRAY = "tray",
  CLOSE = "close",
}
export const DEFAULT_FONT_FAMILY_LIST = [
  { name: "系统字体", value: "system", url: "" },
  { name: "阿里妈妈方圆体", value: "AlimamaFangYuanTiVF", url: "/font/AlimamaFangYuanTiVF.woff2" },
  { name: "阿里巴巴健康体（盲文）", value: "AlibabaHealthFont2.0Pro", url: `${BaseUrlFont}/AlibabaHealthFont2.0Pro.ttc` },
  { name: "钉钉进步体", value: "DingTalk-JinBuTi", url: `${BaseUrlFont}/DingTalk-JinBuTi.woff2`, baseFontWeight: 300 },
  { name: "0xProtoNerdFont", value: "0xProtoNerdFont", url: `${BaseUrlFont}/0xProtoNerdFont.ttf` },
  { name: "HarmonyOS_Sans_SC", value: "HarmonyOS_Sans_SC", url: `${BaseUrlFont}/HarmonyOS_Sans_SC.woff2` },
];


// @unocss-include
// https://pinia.web3doc.top/ssr/nuxt.html#%E5%AE%89%E8%A3%85
export const useSettingStore = defineStore(
  SETTING_STORE_KEY,
  () => {
    const sysPermission = ref({
      isNotification: false,
      isNotificationSound: true,
    });
    const appUploader = ref({
      isCheckUpdatateLoad: false,
      isUpdating: false,
      isUpload: false,
      version: "",
      newVersion: "",
      contentLength: 0,
      downloaded: 0,
      downloadedText: "",
      ignoreVersion: [] as string[],
    });
    const appPlatform = ref<Platform | "web">("web");
    const osType = ref<OsType | "web">("web");
    const isWeb = computed(() => appPlatform.value === "web");
    // 用户页折叠
    const isUserFold = ref(true);
    const isUserCollapse = ref(true);
    // 主页页折叠
    const isCollapse = ref(true);// 侧边栏折叠
    // 设备状态
    const isMobileSize = ref(false);// 是否移动尺寸
    const isOpenContactSearch = ref(true); // 是否会话搜索
    const isUseWebsocket = ref(true); // 是否使用 websocket
    const isDesktop = computed(() => ["windows", "linux", "macos"].includes(osType.value));
    const isMobile = computed(() => ["android", "ios"].includes(osType.value));
    // --------------------- 系统环境常量 -----------------
    const systemConstant = ref<SystemConstantVO>({
      ossInfo: {
        image: {
          type: "image",
          path: "image/",
          code: 0,
          timeOut: 12000,
          fileSize: 3145728,
          fileType: "image/*",
        },
        file: {
          type: "file",
          path: "file/",
          code: 2,
          timeOut: 12000,
          fileSize: 52428800,
          fileType: "!image/*;!video/*",
        },
        video: {
          type: "video",
          path: "video/",
          code: 1,
          timeOut: 12000,
          fileSize: 20971520,
          fileType: "video/*;",
        },
        audio: {
          type: "audio",
          path: "audio/",
          code: 4,
          timeOut: 12000,
          fileSize: 10485760,
          fileType: "audio/mp3;audio/x-mpeg;audio/mpeg;audio/webm;audio/wav;video/webm;",
        },
        font: {
          type: "font",
          path: "font/",
          code: 3,
          timeOut: 12000,
          fileSize: 12582912,
          fileType: "font/*",
        },
      },
      msgInfo: {
        [MessageType.TEXT]: {
          maxLength: 2048,
        },
        [MessageType.IMG]: {
          maxLength: 2048,
        },
        [MessageType.VIDEO]: {
          maxLength: 2048,
        },
        [MessageType.FILE]: {
          maxLength: 2048,
        },
        [MessageType.SYSTEM]: {
          maxLength: 10240,
        },
        [MessageType.AI_CHAT]: {
          maxLength: 8192,
        },
        [MessageType.GROUP_NOTICE]: {
          maxLength: 4096,
        },
      },
    });
    // ---------------------快捷键-----------------
    const shortcutManager = useShortcuts();
    // ---------------------菜单-----------------
    const selectExtendMenuList = ref<ExtendItem[]>([]);
    // ---------------------设置-----------------
    const settingPage = ref(defaultSettingPage());
    function defaultSettingPage() {
      return {
        // 字体
        fontFamily: {
          value: !isMac() ? "AlimamaFangYuanTiVF" : "",
          list: [] as { name: string; value: string; url?: string; baseFontWeight?: number }[],
        },
        fontSize: {
          value: 16,
          list: [
            { name: "小", value: 12 },
            { name: "中", value: 14 },
            { name: "默认", value: 16 },
            { name: "超大", value: 18 },
          ],
        },
        modeToggle: {
          value: "system" as "light" | "dark" | "system",
          list: [
            { name: "系统", value: "system" },
            { name: "日间", value: "light" },
            { name: "夜间", value: "dark" },
          ],
        },
        // 主题
        customThemeConfig: null as ThemeConfig | null,

        // 翻译
        translation: {
          value: 1,
          targetLang: "zh" as TranslationEnums,
          stream: false,
          list: [] as TranslationToolVO[],
        },
        isAutoStart: false, // 开机自启
        isCloseAllTransition: false, // 是否关闭所有动画效果，包括页面切换动画和组件动画。
        animation: {
          pageTransition: false, // 页面切换动画
          listTransition: true, // 列表过渡动画
          msgListSkeleton: true, // 消息列表骨架屏
          dialogTransition: true, // 弹窗进入动画
          messageTransition: true, // 消息气泡动画
          themeTransition: true, // 主题切换动画
          hardwareAcceleration: false, // 硬件加速
          msgListScrollBottomAnimate: false, // 消息列表滚动到底部动画
        },
        isWindow10Shadow: false, // 是否启用 Windows 10 窗口阴影
        notificationType: isWeb.value ? NotificationEnums.SYSTEM : NotificationEnums.TRAY, // 托盘通知
        rtcCallBellUrl: DEFAULT_RTC_CALL_BELL_URL, // 呼叫铃声铃声
        // 音频设备设置
        audioDevice: {
          defaultMicrophone: "default" as string, // 默认麦克风设备ID，"default"表示系统默认
          microphoneList: [] as MediaDeviceInfo[], // 可用麦克风列表
          lastSelectedMicrophone: "" as string, // 上次选择的麦克风ID
          autoDetectDevice: true, // 是否自动检测新设备
        },
      };
    }
    const openShadow = computed(() => appPlatform.value !== "windows" || settingPage.value.isWindow10Shadow);
    // 翻译工具
    const translationTool = computed(() => settingPage.value.translation.list.find(item => item.value === settingPage.value.translation.value));
    const isDefaultRtcCallBell = computed(() => settingPage.value.rtcCallBellUrl === DEFAULT_RTC_CALL_BELL_URL);
    const isChatFold = ref(false);
    const isThemeChangeLoad = ref(false);

    // --------------------- 右键菜单 -----------------
    const colorMode = useColorMode();
    const contextMenuTheme = computed(() => colorMode.value === "dark" ? "mac dark" : "mac");

    // --------------------- 聊天设置 -----------------
    const showChatMenu = ref(true);
    async function checkMainWinVisible() {
      try {
        if (isWeb.value) {
          return true;
        }
        const wind = await WebviewWindow.getByLabel(MAIN_WINDOW_LABEL);
        if (!wind)
          return true;
        return wind.isFocused();
      }
      catch (e) {
        return true;
      }
    };

    // ---------------------- 下载管理 -----------------
    const BaseDirCode = BaseDirectory.AppData;
    const showDownloadPanel = ref(false);
    const fileDownloadMap = ref<Record<string, FileItem>>({});
    const fileDownloadList = computed(() => Object.values(fileDownloadMap.value).sort((a, b) => b.downloadTime - a.downloadTime));
    const appDataDownloadDirUrl = ref("");

    // 下载文件回调
    function fileDownProgressCallback(url: string, currentSize: number = 0, totalSize: number = 0, status: FileStatus = FileStatus.DOWNLOADING) {
      const item = fileDownloadMap.value[url];
      if (!item)
        return;
      item.currentSize = currentSize;
      item.totalSize = totalSize;
      item.status = status;
      if (currentSize >= totalSize)
        item.status = FileStatus.DOWNLOADED;
    }

    // 删除文件
    async function deleteDownloadFile(item: FileItem, checked: boolean = true) {
      const file = fileDownloadMap.value?.[item.url];
      if (!file)
        return;
      if (file.status === FileStatus.NOT_FOUND) {
        delete fileDownloadMap.value[item.url];
        return;
      }
      try {
        // 是否存在
        const isExists = await existsFile(file.localPath);
        if (checked && !isExists) {
          ElMessage.warning("文件已不存在，请重新删除记录！");
          file.status = FileStatus.NOT_FOUND;
          return;
        }
        await removeFile(item.localPath);
        delete fileDownloadMap.value[item.url];
      }
      catch (error) {
        console.warn(error);
        if (checked)
          ElMessage.warning("文件已打开，请关闭后再尝试删除！");
      }
    }

    // 打开文件
    async function openFileByDefaultApp(item: FileItem) {
      if (!item.mimeType)
        return;
      if (item.status === FileStatus.DOWNLOADING)
        return;
      // 是否存在
      const isExists = await existsFile(item.localPath);
      if (!item.localPath || !isExists) {
        ElMessage.warning("文件已不存在，请重新删除记录！");
        item.status = FileStatus.NOT_FOUND;
        return;
      }
      try {
      // 高风险文件扩展名列表
        const highRiskExtensions = [".exe", ".bat", ".cmd", ".scr", ".pif", ".vbs", ".js", ".jar", ".app", ".com", ".msi", ".dll"];
        const fileExtension = item.localPath.substring(item.localPath.lastIndexOf(".")).toLowerCase();

        if (highRiskExtensions.includes(fileExtension)) {
        // 对于高风险文件，打开其所在的文件夹而不是直接打开文件
          await openFileFolder(item);
        }
        else {
        // 对于其他文件，直接打开
          await openPath(item.localPath);
        }
      }
      catch (error) {
        console.warn(error);
        item.status = FileStatus.ERROR;
        ElMessage.error("打开文件失败！");
      }
    }

    // 确认下载文件
    async function checkDownloadPath() {
      if (!appDataDownloadDirUrl.value) {
        return !!(await changeDownloadDir());
      }
      if (!await existsFile(appDataDownloadDirUrl.value))
        return await mkdirFile(appDataDownloadDirUrl.value);

      return false;
    }

    // 切换下载目录
    async function changeDownloadDir() {
      const isDesktop = useSettingStore().isDesktop;
      if (!isDesktop) { // 移动端
        appDataDownloadDirUrl.value = computedPath(await appDataDir());
        return appDataDownloadDirUrl.value;
      }
      // 桌面端
      const path = await openDialog({
        multiple: false,
        directory: !!isDesktop, // 仅桌面端支持选择文件夹
      });
      if (!path)
        return;
      if (!await existsFile(path)) {
        ElMessage.error("选择路径不存在，请重新选择！");
        return;
      }
      appDataDownloadDirUrl.value = computedPath(path || `${await appDataDir()}/downloads`);
      ElMessage.success("下载路径已更改！");
      return appDataDownloadDirUrl.value;
    }

    // 打开文件所在文件夹
    async function openFileFolder(item: FileItem) {
      if (!item.localPath) {
        ElMessage.error("文件不存在！");
        item.status = FileStatus.NOT_FOUND;
        return;
      }
      // 全平台统一去除文件名，兼容不同操作系统的路径分隔符
      let folderPath = "";
      if (item.localPath.includes("\\")) { // Windows
        folderPath = computedPath(item.localPath.split("\\").slice(0, -1).join("\\"));
      }
      else {
        // 其他平台路径
        folderPath = computedPath(item.localPath.split("/").slice(0, -1).join("/"));
      }
      try {
        if (!await existsFile(folderPath)) {
          ElMessage.error("文件夹不存在！");
          return;
        }
        openPath(folderPath);
      }
      catch (error) {
        console.warn(error);
        ElMessage.error("打开文件夹失败！");
      }
    }
    /**
     * 检查更新
     * @returns 是否更新
     */
    async function checkUpdates(checkLog = false, {
      handleUploadInfo,
      handleOnUpload,
    }: {
      handleUploadInfo?: (update: Update) => void,
      handleOnUpload?: (update: Update) => void,
    } = {

    }) {
      try {
        if (isWeb.value || isMobile.value)
          return false;
        appUploader.value.isCheckUpdatateLoad = true;
        const update = (await check()) as Update;
        if (!update) {
          handleUploadInfo && handleUploadInfo(update);
        }
        appUploader.value.isUpload = !!update?.available;
        appUploader.value.isCheckUpdatateLoad = false;
        if (!appUploader.value.isUpload || !update.version) {
          appUploader.value.isCheckUpdatateLoad = false;
          appUploader.value.isUpdating = false;
          appUploader.value.isUpload = false;
          const route = useRoute();
          if (route.path.includes("/setting") && checkLog)
            ElMessage.info("当前版本已是最新版本！");
          return false;
        }
        appUploader.value.newVersion = update?.version; // 新版本号
        // 检查是否忽略当前版本
        if (!checkLog && appUploader.value.ignoreVersion.includes(update.version))
          return false;
        await ElMessageBox.confirm("检测到新版本，是否更新？", `版本 ${update.version}`, {
          confirmButtonText: "确定",
          cancelButtonText: "忽略此版本",
          center: true,
          callback: async (action: Action) => {
            if (action === "confirm") {
              handleAppUpdate(update, handleOnUpload);
            }
            else if (action === "cancel") {
              if (!appUploader.value.ignoreVersion.includes(update.version))
                appUploader.value.ignoreVersion.push(update.version);
            }
          },
        });
      }
      catch (error) {
        console.warn(error);
        appUploader.value.isCheckUpdatateLoad = false;
        appUploader.value.isUpload = false;
        appUploader.value.isCheckUpdatateLoad = false;
        appUploader.value.isUpdating = false;
        appUploader.value.downloaded = 0;
        appUploader.value.downloadedText = "";
        appUploader.value.contentLength = 0;
      }
    }

    /**
     * 处理更新
     */
    async function handleAppUpdate(updateInfo?: Update, handleOnUpload?: (update: Update) => void) {
      const update = updateInfo || (await check()) as Update;
      if (!update) {
        ElMessage.info("已经是最新版本，无需再更新了！");
        return;
      }
      handleOnUpload && handleOnUpload(update);

      appUploader.value.isUpdating = true;
      try {
        appUploader.value.contentLength = 0;
        appUploader.value.downloaded = 0;
        await update
          .download((e) => {
            switch (e.event) {
              case "Started":
                appUploader.value.contentLength = e.data.contentLength || 0;
                appUploader.value.downloaded = 0;
                appUploader.value.downloadedText = "";
                console.log(`开始下载，长度 ${e.data.contentLength} bytes`);
                break;
              case "Progress":
                appUploader.value.downloaded += e.data.chunkLength || 0;
                appUploader.value.downloadedText = `${((appUploader.value.downloaded || 0) / 1024 / 1024).toFixed(2)}MB / ${((appUploader.value.contentLength || 0) / 1024 / 1024).toFixed(2)}MB`;
                console.log(`下载中 ${appUploader.value.downloadedText}`);
                break;
              case "Finished":
                appUploader.value.downloadedText = "安装中...";
                break;
            }
          })
          .finally(() => {
            appUploader.value.isUpload = false;
            appUploader.value.isCheckUpdatateLoad = false;
            appUploader.value.newVersion = "";
          });
        // 安装中
        appUploader.value.downloadedText = "安装中...";
        setTimeout(() => {
          update.install().catch((err) => {
            appUploader.value.isUpdating = false;
            console.warn(err);
            ElMessage.error("安装失败，请稍后再试！");
            appUploader.value.isCheckUpdatateLoad = false;
          }).finally(() => {
            appUploader.value.downloaded = 0;
            appUploader.value.contentLength = 0;
            appUploader.value.isUpdating = false;
          });
        }, 1000);
      }
      catch (error) {
        console.log(error);
        ElMessage.error("更新失败！请检查网络或稍后再试！");
        appUploader.value.isCheckUpdatateLoad = false;
        appUploader.value.isUpload = false;
        appUploader.value.isCheckUpdatateLoad = false;
        appUploader.value.isUpdating = false;
        appUploader.value.downloaded = 0;
        appUploader.value.downloadedText = "";
        appUploader.value.contentLength = 0;
        appUploader.value.newVersion = "";
      }
    }

    async function loadSystemFonts() {
      settingPage.value.fontFamily.list = DEFAULT_FONT_FAMILY_LIST;
      // @ts-expect-error
      if (window.queryLocalFonts) {
        try {
          // @ts-expect-error
          const availableFonts = await window.queryLocalFonts();
          // 获取前20个可用字体
          const fontsMap = {} as { [key: string]: { name: string; value: string } };
          availableFonts.forEach((font: any) => {
            if (fontsMap[font.family])
              return;
            fontsMap[font.family] = {
              name: font.family,
              value: font.family,
            };
          });
          settingPage.value.fontFamily.list = [...settingPage.value.fontFamily.list, ...Object.values(fontsMap)];
        }
        catch (err) {
          console.error(err);
        }
      }
    }


    /**
     * 加载设置预设数据
     */
    function loadSettingPreData() {
      // 在组件挂载时获取翻译工具列表
      fetchTranslationTools();
    }
    // 获取翻译工具列表
    async function fetchTranslationTools() {
      try {
        const user = useUserStore(); // 假设有一个 user store 提供 token
        const token = user.getToken; // 获取用户 token
        const res = await getTranslationToolList(token);
        if (res.code === StatusCode.SUCCESS) {
          settingPage.value.translation.list = res.data;
        }
      }
      catch (error) {
        console.error("获取翻译工具列表错误:", error);
      }
    }

    /**
     * 重置设置
     */
    async function reset() {
      isChatFold.value = false;
      showChatMenu.value = true;
      isThemeChangeLoad.value = false;
      isUseWebsocket.value = true;
      appUploader.value = {
        isCheckUpdatateLoad: false,
        isUpdating: false,
        isUpload: false,
        version: "",
        newVersion: "",
        contentLength: 0,
        downloaded: 0,
        downloadedText: "",
        ignoreVersion: [] as string[],
      };
      isCollapse.value = true;
      isUserFold.value = true;
      isOpenContactSearch.value = true;
      isUserCollapse.value = true;
      // 下载管理
      showDownloadPanel.value = false;
      sysPermission.value = {
        isNotification: false,
        isNotificationSound: true,
      };
      settingPage.value = defaultSettingPage();
      selectExtendMenuList.value = [];
      fileDownloadMap.value = {};
      appDataDownloadDirUrl.value = "";
      loadSystemFonts();
      if (!isWeb.value) {
        await nextTick();
        await resetAllWindow();
        appDataDownloadDirUrl.value = computedPath(`${await appDataDir()}/downloads`);
        if (appDataDownloadDirUrl.value && !await existsFile(appDataDownloadDirUrl.value))
          await mkdirFile(appDataDownloadDirUrl.value);
        setTimeout(async () => { // 延迟300ms，防止闪屏
          if (isDesktop.value)
            await relaunch();
          else
            window?.location?.reload?.();
        }, 300);
      }
    }

    // 重置所有窗口状态
    async function resetAllWindow() {
      if (isWeb.value || !isDesktop.value)
        return false;

      try {
        // 自动重启
        if (await isAutostartEnabled())
          await disableAutostart();
        // TODO：删除窗口状态
        // // const file = await windowStateFilename();
        // if (file)
        //   await removeFile(`${await appDataDir()}\\${file}`);
        // return true;
      }
      catch (error) {
        console.error(error);
        return false;
      }
    }

    return {
      isMobileSize,
      isOpenContactSearch,
      isDesktop,
      isMobile,
      isChatFold,
      // state
      isCollapse,
      contextMenuTheme,
      isUserCollapse,
      isUserFold,
      sysPermission,
      settingPage,
      isThemeChangeLoad,
      appUploader,
      showChatMenu,
      showDownloadPanel,
      fileDownloadMap,
      fileDownloadList,
      appPlatform,
      systemConstant,
      translationTool,
      appDataDownloadDirUrl,
      BaseDirCode,
      osType,
      isUseWebsocket,
      isWeb,
      isDefaultRtcCallBell,
      selectExtendMenuList,
      openShadow,
      // actions
      checkUpdates,
      handleAppUpdate,
      checkMainWinVisible,
      loadSystemFonts,
      loadSettingPreData,
      reset,
      fileDownProgressCallback,
      openFileByDefaultApp,
      deleteDownloadFile,
      openFileFolder,
      changeDownloadDir,
      checkDownloadPath,
      shortcutManager,
      // getter
    };
  },
  {
    // https://prazdevs.github.io/pinia-plugin-persistedstate/frameworks/nuxt-3.html
    persist: {
      storage: piniaPluginPersistedstate.localStorage(),
    },
  },
);
if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useSettingStore, import.meta.hot));
