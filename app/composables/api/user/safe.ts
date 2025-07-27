import type { isTrue, Result } from "@/types/result";

/**
 * 获取用户登录设备信息列表
 * @param token token
 * @returns Result<DeviceInfo[]>
 */
export function getLoginDeviceList(token: string) {
  return useHttp.get<Result<DeviceInfo[]>>("/user/device", {}, { headers: { Authorization: token } });
}

/**
 * 用户下线
 * @param userAgent
 * @param token
 * @returns Result<number>
 */
export function toUserOffline(userAgent: string[], token: string) {
  return useHttp.deleted<Result<number>>("/user/device", { userAgent }, { headers: { Authorization: token } });
}

// 设备信息
export interface DeviceInfo {
  ip: string
  id: number
  isLocal: isTrue
  browser: string
  userAgentString: string
  operatingSystem: string
  browserVersion: BrowserVersion
  ipInfo: IpInfo
}
// IpInfo
export interface IpInfo {
  country: null | string,
  region: null | string,
  province: null | string,
  city: string,
  isp: string,
  address: string,
  addressAndIsp: string
}
// 浏览器信息
export interface BrowserVersion {
  version: string
  majorVersion: string
  minorVersion: string
}
