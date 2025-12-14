/**
 * OAuth 深度链接监听 Hook
 * 用于桌面端监听 Tauri 深度链接回调事件
 */

import type { UnlistenFn } from "@tauri-apps/api/event";
import type { OAuthPlatformCode } from "~/composables/api/user/oauth";

/** OAuth 动作类型 */
export type OAuthAction = "login" | "bind";

/**
 * 深度链接回调数据结构
 */
export interface OAuthCallbackPayload {
  platform: OAuthPlatformCode | null;
  action: OAuthAction | null;
  error?: string;
  errorCode?: string;
  message?: string;
  raw_url: string;
  // 登录场景
  needBind?: boolean;
  token?: string;
  oauthKey?: string;
  nickname?: string;
  avatar?: string;
  email?: string;
  // 绑定场景
  bindSuccess?: boolean;
}

export interface UseOAuthDeepLinkOptions {
  onCallback?: (payload: OAuthCallbackPayload) => void;
  autoListen?: boolean;
}

/**
 * OAuth 深度链接监听 Hook（仅桌面端生效）
 */
export function useOAuthDeepLink(options: UseOAuthDeepLinkOptions = {}) {
  const { onCallback, autoListen = true } = options;
  const setting = useSettingStore();

  const isListening = ref(false);
  const lastPayload = ref<OAuthCallbackPayload | null>(null);
  let unlistenFn: UnlistenFn | null = null;

  async function startListening() {
    if ((!setting.isDesktop && !setting.isMobile) || isListening.value)
      return;
    try {
      const { listen } = await import("@tauri-apps/api/event");
      unlistenFn = await listen<OAuthCallbackPayload>("oauth-callback", (event) => {
        lastPayload.value = event.payload;
        onCallback?.(event.payload);
      });
      isListening.value = true;
    }
    catch (e) {
      // 监听失败时静默处理
      console.error(e);
    }
  }

  function stopListening() {
    unlistenFn?.();
    unlistenFn = null;
    isListening.value = false;
  }

  function clearPayload() {
    lastPayload.value = null;
  }

  const canAutoStart = computed(
    () => autoListen && (setting.isDesktop || setting.isMobile) && typeof window !== "undefined",
  );

  watch(canAutoStart, (shouldListen) => {
    shouldListen ? startListening() : stopListening();
  }, { immediate: true });

  onUnmounted(stopListening);

  return {
    isListening: readonly(isListening),
    lastPayload: readonly(lastPayload),
    startListening,
    stopListening,
    clearPayload,
  };
}
