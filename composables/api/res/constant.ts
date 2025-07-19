import type { OssConstantVO } from "~/init/system";

/**
 * 获取OSS常量
 *
 */
export async function getOssConstant(): Promise<Result<OssConstantVO>> {
  return useHttp.get<Result<OssConstantVO>>("/res/oss/constant");
}

/**
 * 获取系统常量
 *
 */
export async function getSystemConstant(): Promise<Result<SystemConstantVO>> {
  return useHttp.get<Result<SystemConstantVO>>("/res/system/constant");
}

export interface SystemConstantVO {
  ossInfo: OssConstantVO
  msgInfo: Record<MessageType, MsgConstantVO>
}

export interface MsgConstantVO {
  maxLength: number
}
