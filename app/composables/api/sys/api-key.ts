import type { Result } from "@/types/result";

// API Key管理相关接口

export enum ApiKeyStatus {
  ENABLE = 1,
  DISABLE = 0,
}

// 分页查询API密钥
export interface ApiKeyPageParams {
  keyName?: string;
  status?: ApiKeyStatus;
  startCreateTime?: string;
  endCreateTime?: string;
  pageNum?: number;
  pageSize?: number;
}

// API Key数据结构
export interface ApiKeyVO {
  id: string;
  userId?: string;
  userName?: string;
  keyName: string;
  apiKeyMasked: string;
  apiKey?: string; // 仅创建时返回
  status: ApiKeyStatus;
  statusDesc: string;
  expireTime?: string;
  isExpired: boolean;
  remark?: string;
  lastUsedTime?: string;
  createTime: string;
  updateTime: string;
}

// 创建API Key请求
export interface ApiKeyCreateDTO {
  keyName: string;
  expireTime?: string;
  remark?: string;
}

// 更新API Key请求
export interface ApiKeyUpdateDTO {
  id: string;
  keyName?: string;
  expireTime?: string;
  remark?: string;
}

// 分页响应
export interface IPageApiKeyVO {
  records: ApiKeyVO[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

// 创建API密钥响应
export interface ApiKeyExtraVO extends ApiKeyVO {
  apiKeyRaw: string;
}

// 分页查询API密钥
export function getApiKeyPage(params: ApiKeyPageParams, token: string): Promise<Result<IPageApiKeyVO>> {
  return useHttp.get<Result<IPageApiKeyVO>>(`${BaseUrl}/sys/api-key/page`, params, {
    headers: {
      Authorization: token,
    },
  });
}

// 获取API密钥详情
export function getApiKeyDetail(id: string, token: string): Promise<Result<ApiKeyVO>> {
  return useHttp.get<Result<ApiKeyVO>>(`${BaseUrl}/sys/api-key/${id}`, undefined, {
    headers: {
      Authorization: token,
    },
  });
}

// 创建API密钥
export function createApiKey(data: ApiKeyCreateDTO, token: string) {
  return useHttp.post<Result<ApiKeyExtraVO>>(`${BaseUrl}/sys/api-key`, data, {
    headers: {
      Authorization: token,
    },
  });
}

// 更新API密钥
export function updateApiKey(data: ApiKeyUpdateDTO, token: string): Promise<Result<boolean>> {
  return useHttp.put<Result<boolean>>(`${BaseUrl}/sys/api-key`, data, {
    headers: {
      Authorization: token,
    },
  });
}

// 删除API密钥
export function deleteApiKey(id: string, token: string): Promise<Result<boolean>> {
  return useHttp.deleted<Result<boolean>>(`${BaseUrl}/sys/api-key/${id}`, {}, {
    headers: {
      Authorization: token,
    },
  });
}

// 切换API密钥状态
export function toggleApiKeyStatus(id: string, status: ApiKeyStatus, token: string): Promise<Result<boolean>> {
  return useHttp.put<Result<boolean>>(`${BaseUrl}/sys/api-key/${id}/status/${status}`, undefined, {
    headers: {
      Authorization: token,
    },
  });
}
