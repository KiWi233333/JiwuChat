/**
 * OAuth 流程管理 Hook
 * 统一管理 OAuth 授权流程，支持桌面端深度链接和 Web 端 URL 跳转
 *
 * 后端中转模式：
 * 1. 前端请求授权URL，传递 clientRedirectUri（前端回调地址）
 * 2. 后端生成 state 并存储 clientRedirectUri
 * 3. 用户授权后，OAuth 平台回调后端
 * 4. 后端处理完成后 302 重定向到前端 clientRedirectUri，携带结果参数
 * 5. 前端从 URL 参数解析结果
 */

import type { OAuthCallbackPayload } from "./useDeepLink";
import type { OAuthCallbackVO, OAuthPlatformCode } from "~/composables/api/user/oauth";

/**
 * OAuth 授权动作类型
 */
export type OAuthAction = "login" | "bind" | "register";

/**
 * OAuth 流程配置选项
 */
export interface UseOAuthFlowOptions {
  /** OAuth 平台 */
  platform: OAuthPlatformCode;
  /** 授权动作类型 */
  action?: OAuthAction;
  /** 授权成功回调 */
  onSuccess?: (data: OAuthCallbackVO) => void;
  /** 绑定成功回调（action 为 bind 时） */
  onBindSuccess?: () => void;
  /** 授权错误回调 */
  onError?: (error: Error) => void;
  /** State 验证失败回调 */
  onStateInvalid?: (error: string) => void;
  /** 自定义重定向 URI（可选） */
  customRedirectUri?: string;
}

/**
 * OAuth 流程状态
 */
export interface OAuthFlowState {
  /** 是否正在加载 */
  isLoading: boolean;
  /** 是否正在等待回调 */
  isWaitingCallback: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 当前 State */
  currentState: string | null;
}

/**
 * 深度链接协议
 */
const DEEP_LINK_PROTOCOL = "jiwuchat://";

/**
 * 构建前端回调地址（clientRedirectUri）
 * 桌面端使用深度链接，Web 端使用 HTTP 地址
 */
function buildClientRedirectUri(platform: OAuthPlatformCode, action: OAuthAction, isDesktop: boolean): string {
  if (isDesktop) {
    // 桌面端：使用深度链接
    return `${DEEP_LINK_PROTOCOL}oauth/callback?platform=${platform}&action=${action}`;
  }
  // Web 端：使用当前域名
  const url = new URL(`${window.location.origin}/oauth/callback`);
  url.searchParams.set("platform", platform);
  url.searchParams.set("action", action);
  return url.toString();
}

/**
 * OAuth 流程管理 Hook
 *
 * @description 提供统一的 OAuth 授权流程管理
 * - 桌面端：使用深度链接 `jiwuchat://oauth/callback` 接收回调
 * - Web 端：使用 URL 重定向接收回调
 *
 * @example
 * ```ts
 * const { startOAuth, handleCallback, state } = useOAuthFlow({
 *   platform: OAuthPlatformCode.GITHUB,
 *   action: 'login',
 *   onSuccess: (data) => {
 *     if (!data.needBind && data.token) {
 *       // 直接登录成功
 *       userStore.onUserLogin(data.token);
 *     }
 *   },
 *   onError: (err) => {
 *     ElMessage.error(err.message);
 *   }
 * });
 *
 * // 点击登录按钮
 * await startOAuth();
 * ```
 */
export function useOAuthFlow(options: UseOAuthFlowOptions) {
  const {
    platform,
    action = "login",
    onSuccess,
    onBindSuccess,
    onError,
    onStateInvalid,
    customRedirectUri,
  } = options;

  const setting = useSettingStore();

  // 流程状态
  const state = reactive<OAuthFlowState>({
    isLoading: false,
    isWaitingCallback: false,
    error: null,
    currentState: null,
  });

  /**
   * 获取前端回调地址（clientRedirectUri）
   * 后端处理完 OAuth 后会 302 重定向到此地址
   */
  function getClientRedirectUri(): string {
    if (customRedirectUri)
      return customRedirectUri;

    return buildClientRedirectUri(platform, action, setting.isDesktop);
  }

  /**
   * 启动 OAuth 授权流程（后端中转模式）
   */
  async function startOAuth(): Promise<void> {
    state.isLoading = true;
    state.error = null;

    try {
      // 获取授权 URL，传递前端回调地址
      const clientRedirectUri = getClientRedirectUri();
      const res = await getAuthorizeUrl(platform, clientRedirectUri);

      if (res.code !== StatusCode.SUCCESS || !res.data) {
        throw new Error(res.message || "获取授权链接失败");
      }

      // 后端返回的授权 URL 已包含 state 参数
      const authorizeUrl = res.data;

      // 根据平台打开授权页面
      if (setting.isDesktop) {
        // 桌面端：使用系统浏览器打开
        const { openUrl } = await import("@tauri-apps/plugin-opener");
        await openUrl(authorizeUrl);
        state.isWaitingCallback = true;
        console.log("[useOAuthFlow] 桌面端：已打开系统浏览器，等待深度链接回调");
      }
      else {
        // Web 端：页面跳转
        console.log("[useOAuthFlow] Web 端：跳转到授权页面");
        window.location.href = authorizeUrl;
      }
    }
    catch (err) {
      state.error = err instanceof Error ? err : new Error(String(err));
      onError?.(state.error);
      console.error("[useOAuthFlow] 启动授权流程失败:", err);
    }
    finally {
      state.isLoading = false;
    }
  }

  /**
   * 处理深度链接回调（桌面端专用）
   * 后端中转模式：回调 URL 已经包含处理结果
   * @param payload 深度链接回调数据
   */
  async function handleDeepLinkCallback(payload: OAuthCallbackPayload): Promise<void> {
    console.log("[useOAuthFlow] 处理深度链接回调:", payload);
    state.isWaitingCallback = false;

    // 检查错误
    if (payload.error) {
      const errorMsg = payload.message ? decodeURIComponent(payload.message) : payload.error;
      state.error = new Error(errorMsg);
      onError?.(state.error);
      return;
    }

    // 处理绑定流程结果
    if (action === "bind") {
      if (payload.bindSuccess || payload.token) {
        // 绑定成功
        ElMessage.success("绑定成功");
        onBindSuccess?.();
      }
      else if (payload.message) {
        // 绑定失败，有错误消息
        state.error = new Error(decodeURIComponent(payload.message));
        onError?.(state.error);
      }
      else {
        state.error = new Error("绑定失败");
        onError?.(state.error);
      }
      return;
    }

    // 处理登录流程结果
    if (payload.needBind === false && payload.token) {
      // 无需绑定，直接登录成功
      const data: OAuthCallbackVO = {
        needBind: false,
        token: payload.token,
        oauthKey: null,
        platform: payload.platform || null,
        nickname: null,
        avatar: null,
        email: null,
      };
      onSuccess?.(data);
    }
    else if (payload.needBind === true && payload.oauthKey) {
      // 需要绑定
      const data: OAuthCallbackVO = {
        needBind: true,
        token: null,
        oauthKey: payload.oauthKey,
        platform: payload.platform || null,
        nickname: payload.nickname ? decodeURIComponent(payload.nickname) : null,
        avatar: payload.avatar ? decodeURIComponent(payload.avatar) : null,
        email: payload.email ? decodeURIComponent(payload.email) : null,
      };
      onSuccess?.(data);
    }
    else if (payload.message) {
      // 有错误消息
      state.error = new Error(decodeURIComponent(payload.message));
      onError?.(state.error);
    }
    else {
      state.error = new Error("授权回调数据异常");
      onError?.(state.error);
    }
  }

  /**
   * 取消等待回调
   */
  function cancelWaiting(): void {
    state.isWaitingCallback = false;
    state.currentState = null;
  }

  /**
   * 重置状态
   */
  function reset(): void {
    state.isLoading = false;
    state.isWaitingCallback = false;
    state.error = null;
    state.currentState = null;
  }

  return {
    /** 流程状态 */
    state: readonly(state),
    /** 启动 OAuth 授权流程 */
    startOAuth,
    /** 处理深度链接回调（桌面端） */
    handleDeepLinkCallback,
    /** 取消等待回调 */
    cancelWaiting,
    /** 重置状态 */
    reset,
    /** 获取前端回调地址 */
    getClientRedirectUri,
  };
}
