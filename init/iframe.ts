
export const IFRAME_TOGGLE_THEME_EVENT = "toggle-theme";

// 切换主题
export function useIframeInit() {
  const setting = useSettingStore();
  if (!window.parent || setting.appPlatform !== "web")
    return;
  // 监听消息
  // const onMessage = (event: MessageEvent) => {
  //   const { data } = event;
  //   if (data.type === IFRAME_TOGGLE_THEME_EVENT) {
  //     const {
  //       theme = "",
  //       isAnimated = false,
  //     } = data.message || {};
  //     if (["dark", "light", "system"].includes(theme))
  //       useModeToggle(theme, undefined, isAnimated);
  //   }
  // };
  // window.addEventListener("message", onMessage, false);
  // // 发送切换主题
  // watch(() => setting.settingPage.modeToggle.value, (theme) => {
  //   window?.parent?.postMessage({
  //     type: IFRAME_TOGGLE_THEME_EVENT,
  //     message: {
  //       theme,
  //       isAnimated: false,
  //     },
  //   }, "*");
  // });
  return () => {
    // window.removeEventListener("message", onMessage, false);
  };
}

