
/**
 * 获取版本公告
 * @param version 版本号
 * @returns Result<AppVersionInfoVO>
 */
export function getVersionNotice(version: string) {
  return useHttp.get<Result<AppVersionInfoVO>>(`/res/app/version/${version}`);
}

/**
 * 获取最新版本信息
 * @returns Result<any>
 *
 */
export function getLatestVersion() {
  return useHttp.get<AppPlatformsJSON>("/res/app/latest");
}

/**
 * 获取版本列表（分页）
 * @param page 页码
 * @param size 页大小
 * @param dto 查询条件
 * @param token token
 */
export function getAppVersionPage(page: number, size: number, dto: ResAppVersionPageDTO, token: string) {
  return useHttp.post<Result<IPage<ResAppVersionCommVO>>>(`/res/app/version/${page}/${size}`, {
    ...dto,
  }, { headers: { Authorization: token } });
}


export interface ResAppVersionPageDTO {
  /**
   * 关键字
   */
  keyword?: string;
  /**
   * 是否最新版本
   */
  isLatest?: isTrue;
  /**
   * 创建日期排序
   */
  timeSort?: TimeSortType;
  /**
   * 日期排序
   */
  timeSortKey?: TimeSortKeyEnum;
}

export enum TimeSortType {
  /**
   * 升序
   */
  ASC = "asc",
  /**
   * 降序
   */
  DESC = "desc",
}

export enum TimeSortKeyEnum {
  /**
   * 创建时间
   */
  CREATE = "create",
  /**
   * 更新时间
   */
  UPDATE = "update",
}

/**
 * ResAppVersionCommVO
 */
export interface ResAppVersionCommVO {
  /**
   * ID
   */
  id: number;
  /**
   * 是否为最新版本，1表示最新，0表示不是
   */
  isLatest: isTrue;
  /**
   * 更新公告
   */
  notice?: string;
  /**
   * 公告概要
   */
  noticeSummary?: string;
  /**
   * 版本号 1.0.0
   */
  version: string;
  /**
   * 版本号名称 v1.0.0
   */
  versionLabel?: string;
  /**
   * tauri更新器内容
   */
  updaterJson?: AppPlatformsJSON;
  createTime: string;
  updateTime?: string;
}


/**
 * 返回数据
 *
 * AppVersionInfoVO
 */
export interface AppVersionInfoVO {
  /**
   * 版本号
   */
  version: string
  /**
   * 公告
   */
  notice?: null | string
  /**
   * 公告摘要
   */
  noticeSummary?: null | string
  /**
   * TAURI Updater内容
   */
  updaterJson?: AppPlatformsJSON
  /**
   * 创建时间
   */
  createTime: string


}


export interface AppPlatformsJSON {
  version: string
  notes?: string
  pub_date?: string
  platforms: AppPlatforms
}
export interface AppPlatforms {
  "darwin-aarch64": DarwinAarch64
  "darwin-x86_64": DarwinAarch64
  "windows-x86_64": DarwinAarch64
  "linux-x86_64": DarwinAarch64
}

export interface DarwinAarch64 {
  signature: string
  url: string
}
