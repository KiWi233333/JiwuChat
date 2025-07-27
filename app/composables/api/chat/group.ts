/**
 * 获取群组列表（游标）
 * @param pageSize 大小
 * @param cursor 游标
 * @param token token
 * @returns 分页
 */
export function getChatGroupRoomPage(pageSize = 10, cursor: string | number | null, token: string) {
  return useHttp.get<Result<CursorPage<ChatRoomGroupVO>>>(
    "/chat/room/group/page",
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
export interface ChatRoomGroupVO {
  /**
   * id
   */
  id: number;
  /**
   * 群名称
   */
  name: string;
  /**
   * 成员角色1群主(可撤回，可移除，可解散，可发系统通知) 2管理员(可撤回，可移除) 3普通成员
   * 成员角色
   */
  role: number;
  /**
   * 房间Id
   */
  roomId: number;
  /**
   * 群头像
   */
  avatar?: string;
  /**
   * 创建时间
   */
  createTime?: string;
  /**
   * 逻辑删除(0-正常,1-删除)
   */
  deleteStatus?: number;
  /**
   * 额外信息（根据不同类型房间有不同存储的东西）
   */
  detail?: RoomGroupExtJson;
  /**
   * 加入群聊的时间
   */
  joinTime?: string;
  /**
   * 成员更新时间
   */
  memberUpdateTime?: string;
  /**
   * 修改时间
   */
  updateTime?: string;
}
