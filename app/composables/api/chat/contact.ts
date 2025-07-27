/**
 * 获取会话列表（游标）
 * @param dto 条件
 * @param token token
 * @returns 分页
 */
export function getChatContactPage(dto: ContactPageDTO, token: string) {
  return useHttp.get<Result<CursorPage<ChatContactVO>>>(
    "/chat/contact/page",
    {
      pageSize: dto.pageSize,
      cursor: dto.cursor,
      type: dto.type,
    },
    {
      headers: {
        Authorization: token,
      },
    },
  );
}

export enum RoomType {
  /**
   * 群聊
   */
  GROUP = 1,
  /**
   * 单聊
   */
  SELFT = 2,

  AICHAT = 3,
}

/**
 * 会话详情
 * @param roomId 房间号
 * @param token token
 * @param roomType RoomType
 * @returns 分页
 */
export function getChatContactInfo(roomId: number, token: string, roomType: RoomType = RoomType.GROUP) {
  if (roomType === RoomType.GROUP) {
    return useHttp.get<Result<ChatContactDetailVO>>(
      `/chat/contact/${roomId}`,
      { },
      {
        headers: {
          Authorization: token,
        },
      },
    );
  }
  else if (roomType === RoomType.SELFT) {
    return useHttp.get<Result<ChatContactDetailVO>>(
      `/chat/contact/self/room/${roomId}`,
      { },
      {
        headers: {
          Authorization: token,
        },
      },
    );
  }
  else if (roomType === RoomType.AICHAT) {
    return useHttp.get<Result<ChatContactDetailVO>>(
      `/chat/contact/self/room/${roomId}`,
      { },
      {
        headers: {
          Authorization: token,
        },
      },
    );
  }
}

/**
 * 获取会话详情（用户id）
 * @param friendId 好友id
 * @param token token
 * @returns Result<ChatContactDetailVO>
 */
export function getSelfContactInfoByFriendUid(friendId: string, token: string) {
  return useHttp.get<Result<ChatContactDetailVO>>(
    `/chat/contact/self/${friendId}`,
    { },
    {
      headers: {
        Authorization: token,
      },
    },
  );
}

/**
 * 恢复会话（群聊）
 * @param roomId 房间号
 * @param token 身份
 * @returns 影响
 */
export function restoreGroupContact(roomId: number, token: string) {
  return useHttp.put<Result<ChatContactDetailVO>>(
    `/chat/contact/group/restore/${roomId}`,
    { },
    { headers: { Authorization: token } },
  );
}

/**
 * 恢复会话（单聊）
 * @param friendId 好友id
 * @param token 身份
 * @returns Result<ChatContactDetailVO>
 */
export function restoreSelfContact(friendId: string, token: string) {
  return useHttp.put<Result<ChatContactDetailVO>>(
    `/chat/contact/friend/restore/${friendId}`,
    { },
    { headers: { Authorization: token } },
  );
}

/**
 * 删除会话
 * @param roomId 房间号
 * @param token 身份
 * @returns 影响
 */
export function deleteContact(roomId: number, token: string) {
  return useHttp.deleted<Result<number>>(
    `/chat/contact/${roomId}`,
    {},
    { headers: { Authorization: token } },
  );
}

/**
 * 置顶会话
 * @param roomId 房间号
 * @param isPin 是否置顶
 * @param token 身份
 * @returns 影响
 */
export function pinContact(roomId: number, isPin: isTrue, token: string) {
  return useHttp.put<Result<WSPinContactMsg>>(
    `/chat/contact/pin/${roomId}/${isPin}`,
    { },
    { headers: { Authorization: token } },
  );
}


export interface ContactPageDTO {
  pageSize: number
  cursor?: string | null | undefined
  type?: RoomType | null | undefined
}

/**
 * 会话VO
 *
 * ChatContactVO
 */
export interface ChatContactVO {
  /**
   * 房间最后活跃时间(用来排序)
   */
  activeTime: number
  /**
   * 会话头像
   */
  avatar: string
  /**
   * 是否全员展示的会话 0否 1是
   */
  hotFlag: number
  /**
   * 会话名称
   */
  name: string
  /**
   * 房间id
   */
  roomId: number
  /**
   * 最新消息
   */
  text: string
  /**
   * 房间类型 1群聊 2单聊 3AI聊
   */
  type: RoomType
  /**
   * 未读数
   */
  unreadCount: number

  /**
   * 是否在会话中
   */
  selfExist?: number

  /**
   * 置顶时间
   */
  pinTime?: number

  noticeStatus?: NoticeStatusEnums

  /**
   * 免打扰状态
   */
  shieldStatus?: isTrue

  /**
   * 最后一条消息id
   */
  lastMsgId?: number
}

export const RoomTypeTextMap: Record<RoomType, string> = {
  [RoomType.GROUP]: "群",
  [RoomType.SELFT]: "个",
  [RoomType.AICHAT]: "AI",
};


export interface ChatContactDetailVO extends ChatContactVO {
  /**
   * 角色信息
   */
  member?: ChatGroupMember
  /**
   * 详细信息
   */
  roomGroup?: ChatRoomGroup

  /**
   * 好友id
   */
  targetUid?: string

}


/**
 * 角色信息
 *
 * ChatGroupMember
 */
export interface ChatGroupMember {
  /**
   * 成员uid
   */
  userId: string
  /**
   * 群组id
   */
  groupId: number
  /**
   * id
   */
  id: number
  /**
   * 成员角色1群主(可撤回，可移除，可解散，可发系统通知) 2管理员(可撤回，可移除) 3普通成员
   */
  role?: ChatRoomRoleEnum
  /**
   * 更新时间
   */
  updateTime?: string
  /**
   * 创建时间
   */
  createTime: string
}

/**
 * 详细信息
 *
 * ChatRoomGroup
 */
export interface ChatRoomGroup<T = RoomGroupExtJson> {
  /**
   * 群头像
   */
  avatar?: string
  /**
   * 创建时间
   */
  createTime: string
  /**
   * 逻辑删除
   */
  deleteStatus: number
  /**
   * 额外信息（根据不同类型房间有不同存储的东西）
   */
  extJson?: string
  /**
   * 额外信息
   */
  detail?: T
  /**
   * id
   */
  id: number
  /**
   * 群名称
   */
  name: string
  /**
   * 房间Id
   */
  roomId: number
  /**
   * 修改时间
   */
  updateTime?: string
}


/**
 * 额外信息（根据不同类型房间有不同存储的东西）
 *
 * RoomGroupExtJson
 */
export interface RoomGroupExtJson {
  /**
   * 群聊公告
   */
  notice?: null | string
  [property: string]: any
}


/**
 * 免打扰会话
 * @param roomId 房间号
 * @param shield 免打扰状态
 * @param token 身份
 * @returns 影响
 */
export function shieldContact(roomId: number, shield: number, token: string) {
  return useHttp.put<Result<WSUpdateContactInfoMsg>>(
    `/chat/contact/notice/shield/${roomId}/${shield}`,
    { },
    { headers: { Authorization: token } },
  );
}


/**
 * 提醒状态枚举
 */
export enum NoticeStatusEnums {
  // /**
  //  * 默认提醒
  //  */
  // DEFAULT = 0,
  /**
   * 接收消息但不提醒
   */
  NOT_NOTICE = 1,
  /**
   * 收进群助手且不提醒
   */
  NOT_NOTICE_BY_GROUP = 2,
  /**
   * 屏蔽群消息
   */
  SHIELD_GROUP = 3,
}
