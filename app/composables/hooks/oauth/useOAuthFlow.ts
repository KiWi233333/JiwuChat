/**
 * OAuth 流程管理 Hook
 * 统一管理 OAuth 授权流程，支持桌面端深度链接和 Web 端 URL 跳转
 */

import type { OAuthAction, OAuthCallbackPayload } from "./useDeepLink";
import type { OAuthCallbackVO, OAuthPlatformCode } from "~/composables/api/user/oauth";
import { getAuthorizeUrl } from "~/composables/api/user/oauth";

export interface UseOAuthFlowOptions {
  platform: OAuthPlatformCode;
  action?: OAuthAction;
  onSuccess?: (data: OAuthCallbackVO) => void;
  onBindSuccess?: () => void;
  onError?: (error: Error) => void;
  customRedirectUri?: string;
}

export interface OAuthFlowState {
  isLoading: boolean;
  isWaitingCallback: boolean;
  error: Error | null;
}

const DEEP_LINK_PROTOCOL = "jiwuchat://";

/**
 * 构建前端回调地址
 * - login: 回调到 /oauth/callback 处理登录/注册
 * - bind: 回调到 /user/safe 处理绑定结果
 */
function buildClientRedirectUri(platform: OAuthPlatformCode, action: OAuthAction, isDesktop: boolean): string {
  // 根据 action 确定回调路径
  const callbackPath = action === "bind" ? "/user/safe" : "/oauth/callback";

  if (isDesktop) {
    return `${DEEP_LINK_PROTOCOL}oauth/callback?platform=${platform}&action=${action}`;
  }

  const url = new URL(`${window.location.origin}${callbackPath}`);
  url.searchParams.set("platform", platform);
  url.searchParams.set("action", action);
  return url.toString();
}

/**
 * OAuth 流程管理 Hook
 */
export function useOAuthFlow(options: UseOAuthFlowOptions) {
  const { platform, action = "login", onSuccess, onBindSuccess, onError, customRedirectUri } = options;
  const setting = useSettingStore();

  const state = reactive<OAuthFlowState>({
    isLoading: false,
    isWaitingCallback: false,
    error: null,
  });

  function getClientRedirectUri(): string {
    return customRedirectUri || buildClientRedirectUri(platform, action, setting.isDesktop);
  }

  async function startOAuth(): Promise<void> {
    state.isLoading = true;
    state.error = null;

    try {
      const clientRedirectUri = getClientRedirectUri();
      const res = await getAuthorizeUrl(platform, clientRedirectUri);

      if (res.code !== StatusCode.SUCCESS || !res.data) {
        throw new Error(res.message || "获取授权链接失败");
      }

      if (setting.isDesktop) {
        const { openUrl } = await import("@tauri-apps/plugin-opener");
        await openUrl(res.data);
        state.isWaitingCallback = true;
      }
      else {
        window.location.href = res.data;
      }
    }
    catch (err) {
      state.error = err instanceof Error ? err : new Error(String(err));
      onError?.(state.error);
    }
    finally {
      state.isLoading = false;
    }
  }

  async function handleDeepLinkCallback(payload: OAuthCallbackPayload): Promise<void> {
    state.isWaitingCallback = false;

    if (payload.error) {
      state.error = new Error(payload.message ? decodeURIComponent(payload.message) : payload.error);
      onError?.(state.error);
      return;
    }

    if (action === "bind") {
      if (payload.bindSuccess || payload.token) {
        ElMessage.success("绑定成功");
        onBindSuccess?.();
      }
      else {
        state.error = new Error(payload.message ? decodeURIComponent(payload.message) : "绑定失败");
        onError?.(state.error);
      }
      return;
    }

    // 处理登录流程
    if (payload.needBind === false && payload.token) {
      onSuccess?.({
        needBind: false,
        token: payload.token,
        oauthKey: null,
        platform: payload.platform,
        nickname: null,
        avatar: null,
        email: null,
      });
    }
    else if (payload.needBind === true && payload.oauthKey) {
      onSuccess?.({
        needBind: true,
        token: null,
        oauthKey: payload.oauthKey,
        platform: payload.platform,
        nickname: payload.nickname ? decodeURIComponent(payload.nickname) : null,
        avatar: payload.avatar ? decodeURIComponent(payload.avatar) : null,
        email: payload.email ? decodeURIComponent(payload.email) : null,
      });
    }
    else {
      state.error = new Error(payload.message ? decodeURIComponent(payload.message) : "授权回调数据异常");
      onError?.(state.error);
    }
  }

  function cancelWaiting(): void {
    state.isWaitingCallback = false;
  }

  function reset(): void {
    state.isLoading = false;
    state.isWaitingCallback = false;
    state.error = null;
  }

  onBeforeUnmount(() => {
    cancelWaiting();
    reset();
  });

  return {
    state: readonly(state),
    startOAuth,
    handleDeepLinkCallback,
    cancelWaiting,
    reset,
    getClientRedirectUri,
  };
}
