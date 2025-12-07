/**
 * OAuth 流程管理 Hook
 * 统一管理 OAuth 授权流程，支持桌面端深度链接和 Web 端 URL 跳转
 */

import type { OAuthCallbackPayload } from "./useDeepLink";
import type { OAuthCallbackVO, OAuthPlatformCode } from "~/composables/api/user/oauth";
import { bindOAuth, generateState, oauthCallback } from "~/composables/api/user/oauth";

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
 * 深度链接回调地址前缀
 */
const DEEP_LINK_CALLBACK_BASE = "jiwuchat://oauth/callback";

/**
 * 构建深度链接回调地址
 */
function buildDeepLinkRedirectUri(platform: OAuthPlatformCode, action: OAuthAction): string {
  return `${DEEP_LINK_CALLBACK_BASE}?platform=${platform}&action=${action}`;
}

/**
 * 构建 Web 端回调地址
 */
function buildWebRedirectUri(platform: OAuthPlatformCode, action: OAuthAction): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/oauth/callback?platform=${platform}&action=${action}`;
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
   * 获取重定向 URI
   */
  function getRedirectUri(): string {
    if (customRedirectUri)
      return customRedirectUri;

    if (setting.isDesktop) {
      return buildDeepLinkRedirectUri(platform, action);
    }

    return buildWebRedirectUri(platform, action);
  }

  /**
   * 启动 OAuth 授权流程
   */
  async function startOAuth(): Promise<void> {
    state.isLoading = true;
    state.error = null;

    try {
      // 1. 从后端获取 State（CSRF 防护）
      const stateRes = await generateState();
      if (stateRes.code !== StatusCode.SUCCESS || !stateRes.data) {
        throw new Error(stateRes.message || "获取 State 失败");
      }
      const oauthState = stateRes.data;
      state.currentState = oauthState;

      // 2. 获取授权 URL
      const redirectUri = getRedirectUri();
      const res = await getAuthorizeUrl(platform, redirectUri);

      if (res.code !== StatusCode.SUCCESS || !res.data) {
        throw new Error(res.message || "获取授权链接失败");
      }

      // 3. 授权 URL 添加 state 参数
      const authorizeUrl = new URL(res.data);
      authorizeUrl.searchParams.set("state", oauthState);

      // 4. 根据平台打开授权页面
      if (setting.isDesktop) {
        // 桌面端：使用系统浏览器打开
        const { openUrl } = await import("@tauri-apps/plugin-opener");
        await openUrl(authorizeUrl.toString());
        state.isWaitingCallback = true;
        console.log("[useOAuthFlow] 桌面端：已打开系统浏览器，等待深度链接回调");
      }
      else {
        // Web 端：页面跳转
        console.log("[useOAuthFlow] Web 端：跳转到授权页面");
        window.location.href = authorizeUrl.toString();
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
   * @param payload 深度链接回调数据
   */
  async function handleDeepLinkCallback(payload: OAuthCallbackPayload): Promise<void> {
    console.log("[useOAuthFlow] 处理深度链接回调:", payload);
    state.isWaitingCallback = false;

    // 检查错误
    if (payload.error) {
      state.error = new Error(payload.error);
      onError?.(state.error);
      return;
    }

    // 检查必要参数
    if (!payload.code || !payload.state) {
      state.error = new Error("回调参数不完整");
      onError?.(state.error);
      return;
    }

    // State 验证由后端完成，直接调用回调处理
    await handleCallback(payload.code, payload.state);
  }

  /**
   * 处理授权回调
   * @param code 授权码
   * @param stateParam State 参数
   * @param redirectUri 重定向 URI（Web 端使用）
   */
  async function handleCallback(code: string, stateParam: string, redirectUri?: string): Promise<void> {
    state.isLoading = true;
    state.error = null;

    try {
      // 根据 action 类型处理
      if (action === "bind") {
        // 绑定第三方账号
        const res = await bindOAuth(platform, code, redirectUri || getRedirectUri());
        if (res.code === StatusCode.SUCCESS) {
          ElMessage.success("绑定成功");
          onBindSuccess?.();
        }
        else {
          throw new Error(res.message || "绑定失败");
        }
      }
      else {
        // 登录 / 注册
        const res = await oauthCallback(platform, code, stateParam, redirectUri || getRedirectUri());
        if (res.code === StatusCode.SUCCESS && res.data) {
          onSuccess?.(res.data);
        }
        else {
          throw new Error(res.message || "授权回调处理失败");
        }
      }
    }
    catch (err) {
      state.error = err instanceof Error ? err : new Error(String(err));
      onError?.(state.error);
      console.error("[useOAuthFlow] 处理授权回调失败:", err);
    }
    finally {
      state.isLoading = false;
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
    /** 处理授权回调 */
    handleCallback,
    /** 取消等待回调 */
    cancelWaiting,
    /** 重置状态 */
    reset,
    /** 获取重定向 URI */
    getRedirectUri,
  };
}
