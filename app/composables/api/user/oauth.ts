import type { Result } from "@/types/result";

/**
 * OAuth 平台代码枚举
 */
export enum OAuthPlatformCode {
  GITHUB = "github",
  GOOGLE = "google",
  GITEE = "gitee",
  WECHAT = "wechat",
}

/**
 * OAuth 平台信息
 */
export interface OAuthPlatformVO {
  code: OAuthPlatformCode // 平台代码 (github/google/gitee)
  name: string // 平台名称
  iconUrl: string // 平台图标URL
  enabled: boolean // 是否启用
}

/**
 * 用户绑定信息
 */
export interface UserOAuthVO {
  id: string
  platform: OAuthPlatformCode
  platformName: string
  nickname: string
  avatar: string
  email: string
  createTime: string
}

/**
 * OAuth 回调结果
 */
export interface OAuthCallbackVO {
  needBind: boolean // 是否需要绑定
  token: string | null // JWT Token（已绑定时返回）
  oauthKey: string | null // OAuth临时凭证Key（未绑定时返回，有效期5分钟）
  platform: OAuthPlatformCode | null // OAuth平台代码
  nickname: string | null // 第三方账号昵称
  avatar: string | null // 第三方账号头像
  email: string | null // 第三方账号邮箱
}

/**
 * OAuth 注册请求
 */
export interface OAuthRegisterDTO {
  oauthKey: string // OAuth临时凭证Key（必填）
  username?: string // 用户名（可选，不填自动生成）
  nickname?: string // 昵称（可选，不填使用第三方昵称）
}

/**
 * OAuth 绑定已有账号请求
 */
export interface OAuthLinkExistingDTO {
  oauthKey: string // OAuth临时凭证Key（必填）
  loginType: "username" | "phone" | "email" // 登录方式（必填）
  account: string // 登录账号（必填）
  credential: string // 密码或验证码（必填）
}


// 获取平台图标路径
export function getOAuthPlatformIcon(platform: OAuthPlatformCode): string {
  const iconMap: Record<string, string> = {
    [OAuthPlatformCode.GITHUB]: "/images/brand/github.svg",
    [OAuthPlatformCode.GOOGLE]: "/images/brand/google.svg",
    [OAuthPlatformCode.GITEE]: "/images/brand/gitee.svg",
    [OAuthPlatformCode.WECHAT]: "/images/brand/wechat.svg",
  };
  return iconMap[platform] || "";
}


/**
 * 获取支持的 OAuth 平台列表
 * @returns Promise<Result<OAuthPlatformVO[]>>
 */
export function getOAuthPlatforms(): Promise<Result<OAuthPlatformVO[]>> {
  return useHttp.get<Result<OAuthPlatformVO[]>>("/oauth/platforms");
}

/**
 * 获取授权 URL
 * @param platform 平台代码 (github/google/gitee)
 * @param redirectUri 回调地址（可选）
 * @returns Promise<Result<string>>
 */
export function getAuthorizeUrl(platform: OAuthPlatformCode, redirectUri?: string): Promise<Result<string>> {
  return useHttp.get<Result<string>>(`/oauth/authorize/${platform}`, { redirectUri });
}

/**
 * OAuth 回调登录
 * @param platform 平台代码
 * @param code 授权码
 * @param state 状态参数
 * @param redirectUri 回调地址（可选）
 * @returns Promise<Result<OAuthCallbackVO>> 返回 OAuth 回调结果
 */
export function oauthCallback(platform: OAuthPlatformCode, code: string, state: string, redirectUri?: string): Promise<Result<OAuthCallbackVO>> {
  return useHttp.get<Result<OAuthCallbackVO>>(`/oauth/callback/${platform}`, { code, state, redirectUri });
}

/**
 * 绑定第三方账号（需登录）
 * @param platform 平台代码
 * @param code 授权码
 * @param redirectUri 回调地址
 * @returns Promise<Result<boolean>>
 */
export function bindOAuth(platform: OAuthPlatformCode, code: string, redirectUri: string): Promise<Result<boolean>> {
  return useHttp.post<Result<boolean>>(
    `/oauth/bind/${platform}`,
    { code, redirectUri },
  );
}

/**
 * 解绑第三方账号（需登录）
 * @param platform 平台代码
 * @returns Promise<Result<boolean>>
 */
export function unbindOAuth(platform: OAuthPlatformCode): Promise<Result<boolean>> {
  return useHttp.deleted<Result<boolean>>(`/oauth/unbind/${platform}`);
}

/**
 * 获取用户绑定列表（需登录）
 * @returns Promise<Result<UserOAuthVO[]>>
 */
export function getBindList(): Promise<Result<UserOAuthVO[]>> {
  return useHttp.get<Result<UserOAuthVO[]>>("/oauth/bindList");
}

/**
 * 检查是否已绑定（需登录）
 * @param platform 平台代码
 * @returns Promise<Result<boolean>>
 */
export function checkIsBound(platform: OAuthPlatformCode): Promise<Result<boolean>> {
  return useHttp.get<Result<boolean>>(`/oauth/isBound/${platform}`);
}

/**
 * 生成 State 参数（用于自定义流程）
 * @returns Promise<Result<string>>
 */
export function generateState(): Promise<Result<string>> {
  return useHttp.get<Result<string>>("/oauth/state");
}

/**
 * OAuth 注册新用户
 * @param dto 注册请求参数
 * @returns Promise<Result<string>> 返回 JWT Token
 */
export function oauthRegister(dto: OAuthRegisterDTO): Promise<Result<string>> {
  return useHttp.post<Result<string>>("/oauth/register", dto);
}

/**
 * OAuth 绑定已有账号
 * @param dto 绑定请求参数
 * @returns Promise<Result<string>> 返回 JWT Token
 */
export function oauthLink(dto: OAuthLinkExistingDTO): Promise<Result<string>> {
  return useHttp.post<Result<string>>("/oauth/link", dto);
}
