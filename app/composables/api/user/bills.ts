/**
 * 获取用户账单信息（分页）
 * @param page 页码
 * @param size 个数
 * @param dto 筛选参数
 * @param token token
 * @returns UserWallet
 */
export function getBillsPage(page: number, size: number, dto: BillsDTO, token: string) {
  return useHttp.post<Result<IPage<BillsInfoVO>>>(`/user/bills/list/${page}/${size}`, {}, {
    headers: {
      Authorization: token,
    },
    body: {
      ...dto,
    },
  });
}
// 分页筛选参数
export interface BillsDTO {
  orderId?: string
  currencyType?: CurrencyType
  endTime?: string
  startTime?: string
  type?: BillsType
}
/**
 * 账单详情VO
 */
export interface BillsInfoVO {
  id: string
  userId: string
  ordersId: string
  voucherId?: any
  amount: number
  title: string
  type: number
  currencyType: number
  updateTime: string
  createTime: string
}

/**
 * 获取账单统计（详细）
 * @param dto
 * @param token
 * @returns Result<BillsTotalVO>
 */
export function getBillsTotal(dto: BillsTotaDTO, token: string) {
  return useHttp.post<Result<BillsTotalVO>>("/user/bills/total/detail", {}, {
    headers: {
      Authorization: token,
    },
    body: {
      ...dto,
    },
  });
}

enum BillsTypeText {
  SHOP_IN = "退款收入",
  SHOP_OUT = "购物消费",
  POINT_IN = "积分收入",
  SHOP_POINT_IN = "积分消费",
}

/**
 * 获取账单统计（时间）
 * @param dto
 * @param token
 * @returns Result<BillsTimeTotalVO[]>
 */
export function getBillsTotalTable(dto: BillsTimeTotalDTO, token: string) {
  return useHttp.post<Result<BillsTimeTotalVO[]>>("/user/bills/total", {}, {
    headers: {
      Authorization: token,
    },
    body: {
      ...dto,
    },
  });
}
/**
 * BillsTimeTotalDTO
 */
export interface BillsTimeTotalDTO {
  currencyType?: CurrencyType | null
  timeType: TimeType
  type?: number | null
}
/**
 * 时间类型
 */
export enum TimeType {
  Day = "DAY",
  Month = "MONTH",
  Year = "YEAR",
}

/**
 * 账单统计（总的每年每月每日）
 *
 * BillsTimeTotalVO
 */
export interface BillsTimeTotalVO {
  /**
   * 货币类型 0：余额，1：积分
   */
  currencyType?: CurrencyType
  /**
   * 0：支出，1：收入
   */
  type?: BillsType
  /**
   * 时间
   * 时间文本
   */
  time?: string
  /**
   * 总计
   */
  total?: number
}

/**
 * 统计数据接口
 */
export interface BillsTotalVO {
  totalIn?: number
  totalOut?: number
}
// 账单参数
export interface BillsTotaDTO {
  /** 收支类型 0支出，1收入 */
  type?: BillsType
  /** 货币类型 0金钱，1积分 */
  currencyType: CurrencyType
  endTime?: string
  startTime?: string
}
/**
 * 账单类型
 */
export enum BillsType {
  /** 支出 */
  OUT = 0,
  /** 收入 */
  IN = 1,
}

/**
 * 货币类型
 * 0金钱
 * 1积分
 */
export enum CurrencyType {
  /** 0：金钱 */
  BALANCE = 0,
  /** 1：积分 */
  POINT = 1,
}
