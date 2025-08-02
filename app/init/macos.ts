import { listen } from "@tauri-apps/api/event";

export function useMacOsInit() {
  // 监听红绿灯关闭
  const setting = useSettingStore();
  if (setting.osType !== "macos")
    return;
  listen("close_window", (event) => {
    closeWindowHandler();
  });
  return () => {
  };
}

