// 返回值定义
export interface Result<T> {
  [x: string]: any
  code: StatusCode
  message: string
  data: T
}
export enum StatusCode {
  SUCCESS = 20000,
  INSERT_ERR = 20001,
  DELETE_NOEXIST_ERR = 20002,
  SELECT_ERR = 20003,
  UPDATE_ERR = 20004,
  LINK_NULL_ERR = 20005,
  NULL_ERR = 40001,
  TOKEN_ERR = 40002,
  PARAM_ERR = 40003,
  BUSY_ERR = 40004,
  DEFAULT_ERR = 40005,
  PERMISSION_ERR = 40006,
  TOKEN_EXPIRED_ERR = 40007,
  STATUS_OFF_ERR = 40008,
  TOKEN_DEVICE_ERR = 40009,
}

export const StatusCodeText: {
  [key in StatusCode]: string
} = {
  [StatusCode.SUCCESS]: "操作成功",
  [StatusCode.INSERT_ERR]: "添加或已经存在",
  [StatusCode.DELETE_NOEXIST_ERR]: "被删或不存在",
  [StatusCode.SELECT_ERR]: "查询不到",
  [StatusCode.UPDATE_ERR]: "修改失败",
  [StatusCode.LINK_NULL_ERR]: "链接元素不存在",
  [StatusCode.NULL_ERR]: "空值错误",
  [StatusCode.TOKEN_ERR]: "认证失败",
  [StatusCode.PARAM_ERR]: "参数错误",
  [StatusCode.BUSY_ERR]: "阻塞或被占用繁忙",
  [StatusCode.DEFAULT_ERR]: "操作错误，请重试！",
  [StatusCode.PERMISSION_ERR]: "权限不足",
  [StatusCode.TOKEN_EXPIRED_ERR]: "身份过期，请重新登录！",
  [StatusCode.STATUS_OFF_ERR]: "账号被封禁，详情联系客服！",
  [StatusCode.TOKEN_DEVICE_ERR]: "认证失败，登录设备有误！",
};


export enum Sort {
  ASC = 0,
  DESC = 1, // 降序
}
export enum isTrue {
  TRUE = 1,
  FALESE = 0,
}
