
/**
 * 获取AI机器人列表
 * @param token 登录令牌
 * @param showDetail 是否显示详细信息
 */
export function getAiRobotList(
  token: string,
  showDetail: isTrue = isTrue.FALESE,
) {
  return useHttp.get<Result<RobotUserVO[]>>(
    `/chat/ai/robot/list`,
    { showDetail: showDetail || isTrue.FALESE },
    { headers: { Authorization: token } },
  );
}

/**
 * 获取AI机器人列表 （房间号）
 * @param roomId 房间号
 * @param token 登录令牌
 */
export function getAiRobotListByRoomId(
  roomId: number,
  token: string,
) {
  return useHttp.get<Result<RobotUserVO[]>>(
    `/chat/ai/robot/list/${roomId}`,
    { },
    { headers: { Authorization: token } },
  );
}


/**
 * 机器人用户视图对象
 *
 * RobotUserVO
 */
export interface RobotUserVO {
  /**
   * AI模型代码
   */
  aiModelCode: number;
  /**
   * 用户昵称
   */
  nickname: string;
  /**
   * 用户头像URL
   */
  avatar?: string;
  /**
   * 用户是否被使用
   */
  isUsed?: boolean;
  /**
   * 用户ID
   */
  userId: string;
  /**
   * 用户名
   */
  username: string;

  isFriend?: isTrue;

  description?: string;
}
