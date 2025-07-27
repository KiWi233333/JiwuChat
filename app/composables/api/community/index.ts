/**
 * 获取社区用户（分页）
 * @param page 页
 * @param size 个数
 * @param dto 查询参数
 * @returns Result<IPage<UserInfoVO>
 */
export function getCommUserPage(page: number, size: number, dto: SelectCommUserDTO, token: string) {
  return useFetch<Result<IPage<CommUserVO>>>(`${BaseUrl}/community/user/list/${page}/${size}`, {
    method: "POST",
    body: { ...dto },
    headers: { Authorization: token },
  });
}

/**
 * SelectCommUserDTO
 */
export interface SelectCommUserDTO {
  /**
   * 距离排序
   * 0 asc, 1 desc
   */
  distanceSort?: number
  /**
   * 邮箱
   */
  email?: string
  /**
   * 性别
   * 男 女 保密
   */
  gender?: string
  /**
   * 昵称
   */
  nickname?: string
  /**
   * 最新排序
   * 0 asc, 1 desc
   */
  timeSort?: number
  [property: string]: any
}


export function getCommUserInfoSe(userId: string, token: string) {
  return useHttp.get<Result<CommUserVO>>(`/community/user/${userId}`, {
  }, {
    headers: { Authorization: token },
  });
}

/**
 * 返回数据
 *
 * CommUserVO
 */
export interface CommUserVO {
  /**
   * 头像icon
   */
  avatar?: string
  /**
   * 生日
   */
  birthday?: string
  /**
   * 账号创建时间
   */
  createTime?: string
  /**
   * 邮箱
   */
  email?: string
  /**
   * 性别 （男|女|保密）
   */
  gender?: string
  /**
   * 最后登录时间
   */
  lastLoginTime?: string
  /**
   * 昵称
   */
  nickname?: string

  /**
   * 个性签名
   */
  slogan?: string
  [property: string]: any
}
