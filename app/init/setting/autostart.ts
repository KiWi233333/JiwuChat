import {
  disable as disableAutoStart,
  enable as enableAutoStart,
  isEnabled as isAutoStartEnabled,
} from "@tauri-apps/plugin-autostart";

/**
 * 初始化自动启动配置
 */
export function useAutoStartInit() {
  const setting = useSettingStore();

  // 获取当前自动启动状态
  isAutoStartEnabled().then((isAutoStart) => {
    setting.settingPage.isAutoStart = isAutoStart;
  }).catch(() => {
    setting.settingPage.isAutoStart = false;
  });

  // 监听自动启动配置变化
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
}
