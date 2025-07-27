import type { EpPropMergeType } from "element-plus/lib/utils";
import type { Config, Extra, UploadProgress } from "qiniu-js/esm/upload/base";
import type { PartialObserver } from "qiniu-js/esm/utils/observable";
import * as qiniu from "qiniu-js";

/**
 * @param file 上传文件
 * @param filenameKey 目标文件名
 * @param token 上传凭证
 * @returns 返回用于上传任务的可观察对象
 */
export function uploadOssFile(
  file: File,
  filenameKey: string | null = null,
  token: string,
  observer: PartialObserver<UploadProgress, qiniu.QiniuError | qiniu.QiniuRequestError | qiniu.QiniuNetworkError, any>,
  putExtra?: Partial<Extra>,
  config?: Config,
) {
  const observable = qiniu.upload(file, filenameKey, token, putExtra, config);
  return observable.subscribe(observer); // 上传开始
}

/**
 * @param file 上传文件
 * @param fileName 目标文件名
 * @param token 上传凭证
 * @param putExtra 上传文件的相关资源信息配置
 * @param config 上传任务的配置
 * @returns 返回用于上传任务的可观察对象
 */
export function uploadOssFileSe(
  file: File,
  fileName: string | null = null,
  token: string,
  putExtra?: Partial<Extra>,
  config?: Config,
) {
  return qiniu.upload(file, fileName, token, putExtra, config);
}

const qiniuOssErrorCode = new Map([
  [298, "部分操作执行成功！"],
  [400, "请求报文格式错误！"],
  [401, "认证授权失败！"],
  [403, "权限不足，拒绝访问！"],
  [404, "资源不存在！"],
  [405, "请求方式错误！"],
  [406, "上传的数据 CRC32 校验错误！"],
  [413, "请求资源大小大于指定的最大值！"],
  [419, "用户账号被冻结！"],
  [478, "镜像回源失败！"],
  [502, "错误网关！"],
  [503, "服务端不可用！"],
  [504, "服务端操作超时！"],
  [573, "单个资源访问频率过高！"],
  [579, "上传成功但是回调失败！"],
  [599, "服务端操作失败！"],
  [608, "资源内容被修改！"],
  [612, "指定资源不存在或已被删除！"],
  [614, "目标资源已存在！"],
  [630, "已创建的空间数量达到上限，无法创建新空间！"],
  [631, "指定空间不存在！"],
  [640, "调用列举资源(list)接口时，指定非法的marker参数！"],
  [701, "在断点续上传过程中，后续上传接收地址不正确或ctx信息已过期！"],
]);
Object.freeze(qiniuOssErrorCode);

const defaultErrorMsg = "上传失败，请稍后再试！";
/**
 * 获取上传失败错误
 *
 * @returns 错误提示
 */
export function getOssErrorCode(e: qiniu.QiniuError | qiniu.QiniuRequestError | qiniu.QiniuNetworkError): string {
  if ((e as qiniu.QiniuNetworkError).code) {
    return qiniuOssErrorCode.get((e as qiniu.QiniuNetworkError).code) || defaultErrorMsg;
  }
  return defaultErrorMsg;
}

/**
 * 获取上传临时凭证token（图片）
 * @param fileType 文件类型
 * @param token 用户token
 * @returns Result<ResOssVO>
 */
export function getResToken(fileType: OssFileType, token: string) {
  return useHttp.get<Result<ResOssVO>>(`/res/user/${fileType}`, {}, {
    headers: {
      Authorization: token,
    },
  });
}
/**
 * 删除oss文件
 * @param key 文件名
 * @param token 用户token
 * @returns Result<string>
 */
export function deleteOssFile(key: string, token: string) {
  return useHttp.deleted<Result<string>>(`/res/user/files?key=${key}`, {
  }, {
    headers: {
      Authorization: token,
    },
  });
}

export enum OssFileType {
  IMAGE = "image",
  VIDEO = "video",
  FILE = "file",
  FONT = "font",
  SOUND = "sound",
}
/**
 * oss上传临时凭证VO
 */
export interface ResOssVO {
  url: string
  key: string
  uploadToken: string
  endDateTime: number
}

export interface OssFile {
  file: File | undefined
  id: string
  status: EpPropMergeType<StringConstructor, "" | "success" | "warning" | "exception", unknown> | undefined
  percent: number
  key?: string
  subscribe?: any
  children?: OssFile[]
  // 图片信息
  width?: number;
  height?: number;
  // 视频信息
  duration?: number;
  thumbSize?: number;
  thumbWidth?: number;
  thumbHeight?: number;
}
