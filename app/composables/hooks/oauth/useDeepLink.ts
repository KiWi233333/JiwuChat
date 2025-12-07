/**
 * OAuth 深度链接监听 Hook
 * 用于桌面端监听 Tauri 深度链接回调事件
 */

import type { UnlistenFn } from "@tauri-apps/api/event";
import type { OAuthPlatformCode } from "~/composables/api/user/oauth";

/**
 * 深度链接回调数据结构（后端中转模式）
 * 后端处理完 OAuth 后会 302 重定向到深度链接，携带结果参数
 */
export interface OAuthCallbackPayload {
  // 基础信息
  platform: OAuthPlatformCode | null;
  action: "login" | "bind" | "register" | null;

  // 登录结果（needBind=false 时）
  needBind?: boolean;
  token?: string;

  // 需要绑定时的信息（needBind=true 时）
  oauthKey?: string;
  nickname?: string;
  avatar?: string;
  email?: string;

  // 绑定结果
  bindSuccess?: boolean;

  // 错误信息
  error?: string;
  errorCode?: string;
  message?: string;

  // 原始 URL（调试用）
  raw_url: string;
}

/**
 * 深度链接监听 Hook 配置
 */
export interface UseOAuthDeepLinkOptions {
  /** 收到回调时的处理函数 */
  onCallback?: (payload: OAuthCallbackPayload) => void;
  /** 是否自动开始监听（默认 true） */
  autoListen?: boolean;
}

/**
 * OAuth 深度链接监听 Hook
 *
 * @description 仅在桌面端生效，监听 Tauri 事件系统的 `oauth-callback` 事件
 *
 * @example
 * ```ts
 * const { isListening, lastPayload, startListening, stopListening } = useOAuthDeepLink({
 *   onCallback: (payload) => {
 *     console.log('收到 OAuth 回调:', payload);
 *   }
 * });
 * ```
 */
export function useOAuthDeepLink(options: UseOAuthDeepLinkOptions = {}) {
  const { onCallback, autoListen = true } = options;
  const setting = useSettingStore();

  // 是否正在监听
  const isListening = ref(false);
  // 最新收到的回调数据
  const lastPayload = ref<OAuthCallbackPayload | null>(null);
  // 取消监听函数
  let unlistenFn: UnlistenFn | null = null;

  /**
   * 开始监听深度链接回调
   */
  async function startListening() {
    // 仅桌面端支持
    if (!setting.isDesktop) {
      console.log("[useOAuthDeepLink] 非桌面端，跳过深度链接监听");
      return;
    }

    if (isListening.value) {
      console.log("[useOAuthDeepLink] 已在监听中");
      return;
    }

    try {
      const { listen } = await import("@tauri-apps/api/event");

      unlistenFn = await listen<OAuthCallbackPayload>("oauth-callback", (event) => {
        console.log("[useOAuthDeepLink] 收到 OAuth 回调:", event.payload);
        lastPayload.value = event.payload;
        onCallback?.(event.payload);
      });

      isListening.value = true;
      console.log("[useOAuthDeepLink] 开始监听深度链接");
    }
    catch (e) {
      console.error("[useOAuthDeepLink] 监听深度链接失败:", e);
    }
  }

  /**
   * 停止监听深度链接回调
   */
  function stopListening() {
    if (unlistenFn) {
      unlistenFn();
      unlistenFn = null;
    }
    isListening.value = false;
  }

  /**
   * 清除最新回调数据
   */
  function clearPayload() {
    lastPayload.value = null;
  }

  // 自动开始监听
  onMounted(() => {
    if (autoListen && setting.isDesktop) {
      startListening();
    }
  });

  // 组件卸载时取消监听
  onUnmounted(() => {
    stopListening();
  });

  return {
    /** 是否正在监听 */
    isListening: readonly(isListening),
    /** 最新收到的回调数据 */
    lastPayload: readonly(lastPayload),
    /** 开始监听 */
    startListening,
    /** 停止监听 */
    stopListening,
    /** 清除最新回调数据 */
    clearPayload,
  };
}
