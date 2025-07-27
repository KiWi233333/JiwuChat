import type { Result } from "@/types/result";
import type { ids } from "~/types";

/**
 * 获取用户地址列表
 * @param token token
 */
export function getAddressList(token: string) {
  return useHttp.get<Result<AddressInfoVO[]>>("/user/address", {}, { headers: { Authorization: token } });
}
// 地址信息
export interface AddressInfoVO {
  id: string
  name: string
  userId: string
  isDefault: number
  province: string
  city: string
  county: string
  address: string
  postalCode: string
  phone: string
  createTime: string
  updateTime: string
}

/**
 * 添加收货地址
 * @param dto
 * @param token
 */
export function addAddressByDTO(dto: AddressDTO, token: string) {
  dto.isDefault = +dto.isDefault;
  return useHttp.post<Result<string>>("/user/address", { ...dto }, { headers: { Authorization: token } });
}

// 添加收货地址参数
export interface AddressDTO {
  name: string
  phone: string
  isDefault: number | boolean // 是否默认
  province: string
  city: string
  county: string
  address: string
  postalCode: string
}

/**
 * 更新收货地址
 * @param addressId 地址id
 * @param dto
 * @param token
 */
export function updateAddressById(addressId: string, dto: AddressDTO, token: string) {
  dto.isDefault = +dto.isDefault;
  return useHttp.put<Result<string>>(`/user/address/${addressId}`, { ...dto }, { headers: { Authorization: token } });
}

/**
 * 设为默认地址
 * @param addressId 地址id
 * @param isDefault
 * @param token
 */
export function updateDefaultAddress(addressId: string, isDefault: number, token: string) {
  return useHttp.put<Result<string>>(`/user/address/default/${addressId}`, { isDefault: +isDefault }, { headers: { Authorization: token } });
}

/**
 * 删除收货地址(单个)
 * @param addressId 收货地址id
 * @param token
 */
export function deleteAddressById(addressId: string, token: string) {
  return useHttp.deleted<Result<string>>(`/user/address/one/${addressId}`, {}, { headers: { Authorization: token } });
}

/**
 * 删除收货地址(批量)
 * @param ids
 * @param token
 */
export function deleteBatchAddressByIds(ids: ids, token: string) {
  return useHttp.deleted<Result<string>>("/user/address/some", {
    ids,
  }, { headers: { Authorization: token } });
}
