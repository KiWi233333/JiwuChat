import { addRootClass, removeRootClass, STOP_TRANSITION_ALL_KEY } from "./utils";

/**
 * 初始化主题相关配置
 */
export function useThemeInit() {
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

  // 2、流畅模式
  watch(() => setting.settingPage.isCloseAllTransition, (val) => {
    if (val)
      addRootClass(STOP_TRANSITION_ALL_KEY);
    else
      removeRootClass(STOP_TRANSITION_ALL_KEY);
  }, {
    immediate: true,
  });

  setTimeout(() => {
    setting.isThemeChangeLoad = false;
  }, 1000);

  // 3、监听主题自定义
  const { startWatchers } = useThemeCustomization();
  startWatchers();
}
