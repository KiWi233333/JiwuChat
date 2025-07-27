import type { Result } from "../../../types/result";

/**
 * 获取用户钱包信息
 * @param token token
 * @returns UserWallet
 */
export function getUserWallet(token: string) {
  return useHttp.get<Result<UserWalletVO>>("/user/wallet", {}, {
    headers: {
      Authorization: token,
    },
  });
}
// 用户钱包
export interface UserWalletVO {
  userId: string
  balance: number
  recharge: number
  spend: number
  points: number
  updateTime: string
  createTime: string
}


/**
 * 获取充值套餐
 * @returns WalletComboVO[]
 */
export function getWalletCombo(token: string) {
  return useHttp.get<Result<WalletComboVO[]>>("/user/wallet/combo", {

  }, {
    headers: {
      Authorization: token,
    },
  });
}
// 充值套餐
export interface WalletComboVO {
  id: number
  name: string
  discount: number
  amount: number
  points: number
  createTime: string
  updateTime: string
}


/**
 * 用户充值
 * @param dto AddWalletDTO
 * @param token token
 * @returns AddWalletDTO
 */
export function addUserWallet(dto: AddWalletDTO, token: string) {
  return useHttp.post<Result<UserWalletVO>>("/user/wallet", {}, {
    body: {
      ...dto,
    },
    headers: {
      Authorization: token,
    },

  });
}
// 充值钱包
export interface AddWalletDTO {
  type: RechangeType// 0 任意额度 1 套餐
  amount?: number
  id?: string
}
// 充值类型
export enum RechangeType {
  AUTO = 0, // 0 任意额度
  COMBO = 1, // 1 套餐
}
