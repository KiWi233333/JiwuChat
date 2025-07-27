/**
 * 获取好友列表（游标）
 * @param pageSize 大小
 * @param cursor 游标
 * @param token token
 * @returns 分页
 */
export function getChatFriendPage(pageSize = 10, cursor: string | number | null, token: string) {
  return useHttp.get<Result<CursorPage<ChatUserFriendVO>>>(
    "/chat/user/friend/page",
    {
      pageSize,
      cursor,
    },
    {
      headers: {
        Authorization: token,
      },
    },
  );
}

/**
 * 获取好友列表（分页）
 *
 * @param page 页码
 * @param size 个数
 * @param dto 参数
 * @param token token
 * @returns 分页
 */
export function getChatFriendPageV2(page = 1, size = 10, dto: ChatUserFriendPageDTO, token: string) {
  return useHttp.post<Result<IPage<ChatUserFriendVO>>>(
    `/chat/user/friend/page/${page}/${size}`,
    dto,
    { headers: { Authorization: token } },
  );
}
export interface ChatUserFriendPageDTO {
  keyWord?: string;
}
/**
 * 好友VO
 */
export interface ChatUserFriendVO {
  /**
   * 好友uid
   */
  userId: string;
  nickName?: string;
  avatar?: string;

  type: UserType
  /**
   * 在线状态 1在线 0离线
   */
  activeStatus?: ChatOfflineType;
  [property: string]: any;
}


/**
 * 获取好友申请列表（游标）
 * @param page 游标
 * @param size 大小
 * @param token token
 * @returns 分页
 */
export function getChatFriendApplyPage(page = 10, size: string | number | null, token: string) {
  return useHttp.get<Result<ChatApplyPageVO<ChatUserFriendApplyVO>>>(
    "/chat/user/friend/apply/page",
    {
      page,
      size,
    },
    {
      headers: {
        Authorization: token,
      },
    },
  );
}


/**
 * 查询用户列表
 * @param page 页码
 * @param size 个数
 * @param dto 参数
 * @returns 分页数据
 */
export function getUserSeListByPage(page: number, size: number, dto: ChatUserInfoPageDTO, token: string) {
  return useHttp.post<Result<IPage<ChatUserSeInfoVO>>>(`/chat/user/friend/user/${page}/${size}`, { ...dto }, {
    headers: {
      Authorization: token,
    },
  });
}
export interface ChatUserSeInfoVO {
  id: string;
  username: string;
  email?: string;
  nickname: string;
  gender?: Gender;
  avatar?: string;
  createTime: string;
  updateTime: string;
}

/**
 * ChatUserInfoPageDTO
 */
export interface ChatUserInfoPageDTO {
  /**
   * 关键字（用户名、昵称、手机号、邮箱）
   */
  keyWord?: null | string;
  /**
   * 用户id
   */
  userId?: null | string;
}


/**
 * 返回数据
 *
 * PageBaseVO«ChatUserFriendApplyVO»
 */
export interface ChatApplyPageVO<T> {
  /**
   * 当前页数
   */
  current: number | null;
  /**
   * 是否最后一页
   */
  isLast: boolean | null;
  /**
   * 每页查询数量
   */
  pageSize: number | null;
  /**
   * 数据列表
   */
  records: T[];
  /**
   * 总记录数
   */
  total: number | null;
}

/**
 * 好友校验
 *
 * ChatUserFriendApplyVO
 */
export interface ChatUserFriendApplyVO {
  /**
   * 申请id
   */
  applyId: number;
  /**
   * 申请信息
   */
  msg: string;
  /**
   * 申请状态 （0-待审批，1-同意）
   */
  status: ChatApplyStatusType;
  /**
   * 申请类型 1加好友
   */
  type: number;

  createTime: number;
  /**
   * 申请人uid
   */
  userId: string;
  user: {
    id?: string;
    avatar?: string;
    slogen?: string;
    nickName?: string;
    gender?: string;
  };
}

export enum ChatApplyStatusType {
  Load = 0,
  Argee = 1,
  Reject = 2,
}


/**
 * 获取申请未读数
 * @param token token
 * @returns 数据
 */
export function getApplyUnRead(token: string) {
  return useHttp.get<Result<ChatUserFriendUnReadVO>>(
    "/chat/user/friend/apply/unread",
    {
    },
    {
      headers: {
        Authorization: token,
      },
    },
  );
}

/**
 * 返回数据
 *
 * ChatUserFriendUnReadVO
 */
export interface ChatUserFriendUnReadVO {
  /**
   * 申请列表的未读数
   */
  unReadCount: number;
}

/**
 * 申请好友
 * @param dto 参数
 * @param token token
 * @returns 分页
 */
export function addFriendApply(dto: ChatUserFriendApplyDTO, token: string) {
  return useHttp.post<Result<number>>(
    "/chat/user/friend/apply",
    {
      ...dto,
    },
    {
      headers: {
        Authorization: token,
      },
    },
  );
}


/**
 * ChatUserFriendApplyDTO
 */
export interface ChatUserFriendApplyDTO {
  /**
   * 申请信息
   */
  msg: string;
  /**
   * 好友uid
   */
  targetUid: string;
}

/**
 * 批量判断是否是好友
 * @param dto 好友列表
 * @param token 身份
 * @return 结果
 */
export function isChatFriend(dto: ChatUserFriendCheckDTO, token: string) {
  return useHttp.post<Result<ChatUserFriendCheckVO>>(
    "/chat/user/friend/check",
    {
      ...dto,
    },
    {
      headers: {
        Authorization: token,
      },
    },
  );
}
/**
 * ChatUserFriendCheckDTO
 */
export interface ChatUserFriendCheckDTO {
  /**
   * 校验好友的uid
   */
  uidList: string[];
}

/**
 * 返回数据
 *
 * ChatUserFriendCheckVO
 */
export interface ChatUserFriendCheckVO {
  /**
   * 校验结果
   */
  checkedList: FriendCheck[];
}

/**
 * 是否为好友
 *
 * FriendCheck
 */
export interface FriendCheck {
  isFriend: isTrue;
  uid: string;
}

/**
 * 删除好友
 * @param targetUid 好友id
 * @param token 身份
 * @returns 参数
 */
export function deleteFriendById(targetUid: string, token: string) {
  return useHttp.deleted<Result<number>>(
    `/chat/user/friend/${targetUid}`,
    {
    },
    {
      headers: {
        Authorization: token,
      },
    },
  );
}
// 好友菜单面板
export interface TheFriendOpt<T = any> {
  type: FriendOptType;
  data: T;
}

export enum FriendOptType {
  Empty = -1, // 空白
  User = 0, // 用户个人页面
  NewFriend = 1, // 添加
  Group = 2, // 群组
  AiRobot = 3, // 添加ai机器人
  GROUP_MEMBER = 4, // 群成员
}


/**
 * 同意好友申请
 * @param dto 参数
 * @param token token
 * @returns 结果
 */
export function argeeFriendApply(dto: ChatUserFriendApproveDTO, token: string) {
  return useHttp.put<Result<number>>(
    "/chat/user/friend/apply",
    {
      ...dto,
    },
    {
      headers: {
        Authorization: token,
      },
    },
  );
}
/**
 * 拒绝好友申请
 * @param dto 参数
 * @param token token
 * @returns 结果
 */
export function rejectFriendApply(dto: ChatUserFriendRejectDTO, token: string) {
  return useHttp.deleted<Result<number>>(
    "/chat/user/friend/apply",
    {
      ...dto,
    },
    {
      headers: {
        Authorization: token,
      },
    },
  );
}
/**
 * ChatUserFriendApproveDTO
 */
export interface ChatUserFriendApproveDTO {
  /**
   * 申请id
   */
  applyId: number;
}
/**
 * ChatUserFriendRejectDTO
 */
export interface ChatUserFriendRejectDTO {
  /**
   * 申请id
   */
  applyId: number;
}
