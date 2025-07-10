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


export function useSettingDefault() {
  const setting = useSettingStore();


  // 通知设置
  const notificationTypeList = computed(() => (setting.isMobile || setting.isWeb)
    ? [
        {
          label: "系统",
          value: NotificationEnums.SYSTEM,
        },
        {
          label: "关闭",
          value: NotificationEnums.CLOSE,
        },
      ]
    : [
        {
          label: "托盘",
          value: NotificationEnums.TRAY,
        },
        {
          label: "系统",
          value: NotificationEnums.SYSTEM,
        },
        {
          label: "关闭",
          value: NotificationEnums.CLOSE,
        },
      ],
  );

  // 切换流畅模式
  function changeAnimateMode(val: any) {
    if (val)
      document.documentElement.classList.add("stop-transition-all");
    else
      document.documentElement.classList.remove("stop-transition-all");
  }

  return {
    notificationTypeList,
    changeAnimateMode,
  };
}
