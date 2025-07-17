import { getVersion } from "@tauri-apps/api/app";


/**
 * 设置 - 版本公告
 */
export function useSettingNotice({
  watchParamsReload,
}: {
  watchParamsReload?: boolean;
} = {
  watchParamsReload: false,
}) {
  const setting = useSettingStore();
  const showNotice = ref(false);
  const notice = ref<string>("# 暂无内容"); // 公告内容
  const runtime = useRuntimeConfig();
  const currentVersion = computed(() => setting.isDesktop ? setting.appUploader.version : runtime.public.version);

  // 显示新版本 + 当前版本 更新时间线
  const showUpateNoticeLine = ref(false);

  // 公告
  async function showVersionNotice(version: string) {
    const v = version.replaceAll("v", "");
    const res = await getVersionNotice(v);
    if (res.code !== StatusCode.SUCCESS)
      return;
    if (res?.data?.notice)
      notice.value = (res.data.notice || "");
    showNotice.value = true;
  }

  // 检查更新
  async function handleCheckUpadate() {
    if (setting.isWeb)
      return;
    if (setting.isMobile) {
      // 获取最新版本比对
      const res = await getLatestVersion();
      if (!res.version) {
        return;
      }
      if (res.version === setting.appUploader.version) {
        ElNotification({
          message: "当前已是最新版本",
          type: "success",
        });
        return;
      }
      // 更新安卓端
      return;
    }
    setting.checkUpdates(true, {
      handleOnUpload: () => {
        showUpateNoticeLine.value = false;
      },
    });
  }

  // 分页器
  const user = useUserStore();
  const isLoading = ref<boolean>(false);
  const page = ref<number>(0);
  const size = ref<number>(10);
  const searchParams = ref<ResAppVersionPageDTO>({
    timeSortKey: TimeSortKeyEnum.CREATE,
    timeSort: TimeSortType.DESC,
    isLatest: undefined,
    keyword: undefined,
  });
  const isShowResult = ref<boolean>(false);
  const pageInfo = ref({
    total: 0,
    pages: 0,
    size: 0,
    current: 0,
  });

  const versionList = reactive<ResAppVersionCommVO[]>([]);
  const isNoMore = computed(() => pageInfo.value.current > 0 && pageInfo.value.current >= pageInfo.value.pages);
  const isEmpty = computed(() => pageInfo.value.current > 0 && versionList.length === 0);

  if (watchParamsReload) {
    watchDebounced(
      searchParams,
      () => {
        reloadVersionPage();
      },
      {
        deep: true,
      },
    );
  }

  /**
   * 重新加载版本列表
   */
  function reloadVersionPage() {
    page.value = 0;
    versionList.length = 0;
    pageInfo.value = {
      total: 0,
      pages: 0,
      size: 0,
      current: 0,
    };
    searchParams.value = {
      timeSortKey: TimeSortKeyEnum.CREATE,
      timeSort: TimeSortType.DESC,
      isLatest: undefined,
      keyword: undefined,
    };
    // 加载
    loadVersionPage();
  }
  /**
   * 加载版本列表
   * @param dto 参数
   */
  async function loadVersionPage(dto: ResAppVersionPageDTO = {}) {
    try {
      if (isNoMore.value || isLoading.value)
        return;
      isLoading.value = true;
      page.value++;
      const res = await getAppVersionPage(page.value, size.value, {
        ...searchParams.value,
        ...dto,
      }, user.getToken);
      // 展示结果
      pageInfo.value = {
        total: res.data.total,
        pages: res.data.pages,
        size: res.data.size,
        current: res.data.current,
      };
      versionList.push(...res.data.records);
    }
    catch (e) {
      console.error(e);
    }
    finally {
      isLoading.value = false;
      isShowResult.value = true;
    }
  }

  // 更新
  onMounted(async () => {
    setting.loadSystemFonts();
    // 公告列表
    reloadVersionPage();
    if (setting.isWeb)
      return;
    const version = await getVersion();
    // 公告
    if (version) {
      getVersionNotice(version).then((res) => {
        if (res.code !== StatusCode.SUCCESS)
          ElMessage.closeAll("error");
        if (res?.data?.notice)
          notice.value = (res.data.notice || "");
      });
    }
    // 检查更新
    setting.appUploader.version = version;
    if (!setting.appUploader.isCheckUpdatateLoad) {
      setting.checkUpdates(false);
    }
  });

  return {
    showNotice,
    notice,
    currentVersion,
    showUpateNoticeLine,
    showVersionNotice,
    handleCheckUpadate,

    // 分页列表
    isNoMore,
    isEmpty,
    isLoading,
    isShowResult,
    pageInfo,
    versionList,
    searchParams,
    loadVersionPage,
    reloadVersionPage,
  };
}

/**
 * 设置 - 铃声初始化
 */
export function useSettingBell() {
  const setting = useSettingStore();
  // 播放默认铃声
  const audioRaw = ref<HTMLAudioElement>();
  function togglePlayRtcCallBell(url?: string) {
    if (!url)
      return;
    if (audioRaw.value) {
      audioRaw.value.pause?.();
      audioRaw.value.remove?.();
      audioRaw.value = undefined;
      return;
    }
    audioRaw.value = new Audio(url);
    audioRaw.value.play();
    audioRaw.value.onended = () => {
      audioRaw.value?.remove?.();
      audioRaw.value = undefined;
    };
  }

  // 切换默认铃声
  function toggleRtcCallBell() {
    ElMessageBox.prompt("", {
      title: "更改铃声",
      inputType: "text",
      inputValue: setting.settingPage.rtcCallBellUrl,
      center: true,
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      inputErrorMessage: "请输入正确的铃声地址",
      inputPlaceholder: "请输入铃声网络地址",
      lockScroll: true,
    }).then(({ value, action }) => {
      const val = value?.trim();
      if (action === "confirm") {
        if (!val) {
          ElNotification.warning("已关闭铃声！");
          setting.settingPage.rtcCallBellUrl = "";
          return;
        }
        // 正则判断
        const reg = /^https?:\/\/[^\s/$.?#].\S*$/;
        if (DEFAULT_RTC_CALL_BELL_URL !== val && !reg.test(val)) {
          ElMessage.error("请输入正确的铃声地址");
          return;
        }
        setting.settingPage.rtcCallBellUrl = val;
      }
    });
  }
  onDeactivated(() => {
    audioRaw.value?.pause?.();
    audioRaw.value?.remove?.();
    audioRaw.value = undefined;
  });

  return {
    audioRaw,
    togglePlayRtcCallBell,
    toggleRtcCallBell,
  };
}


/**
 * 设置 - 主题
 */
export function useSettingTheme() {
  const setting = useSettingStore();
  // 主题
  const themeConfigList = setting.settingPage.modeToggle.list.map(item => ({
    ...item,
    label: item.name,
    value: item.value,
  }));
  const thePostion = ref({
    clientX: 0,
    clientY: 0,
  });
  const theme = computed({
    get: () => setting.settingPage.modeToggle.value,
    set: (val: string) => {
      useModeToggle(val, thePostion.value as MouseEvent);
      setting.settingPage.modeToggle.value = val;
    },
  });

  return {
    theme,
    themeConfigList,
    thePostion,
  };
}
