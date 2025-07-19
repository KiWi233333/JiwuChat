
// 接口请求获取基本系统常量
export async function initSystemConstant() {
  loadSystemConstant();
}
// 加载OSS常量
async function loadSystemConstant() {
  const setting = useSettingStore();
  // OSS文件要求（限制）
  try {
    const res = await getSystemConstant();
    if (res.code === StatusCode.SUCCESS) {
      setting.systemConstant = res.data;
    }
    else {
      ElMessage.closeAll("error");
      console.warn("获取OSS配置失败", res);
    }
  }
  catch (error) {
    ElMessage.closeAll("error");
    console.error("获取OSS配置失败", error);
  }
}

// 加载OSS常量
async function loadOssConstant() {
  const setting = useSettingStore();
  // OSS文件要求（限制）
  try {
    const ossRes = await getOssConstant();
    if (ossRes.code === StatusCode.SUCCESS) {
      setting.systemConstant.ossInfo = ossRes.data;
    }
    else {
      ElMessage.closeAll("error");
      console.warn("获取OSS配置失败", ossRes);
    }
  }
  catch (error) {
    ElMessage.closeAll("error");
    console.error("获取OSS配置失败", error);
  }
}

export interface SystemConstantVO {
  ossInfo: OssConstantVO
  msgInfo: Partial<Record<MessageType, MsgConstantVO>>
}

export interface OssConstantVO extends Record<OssConstantItemType, OssConstantItemVO> {

}
export type OssConstantItemType = "image" | "video" | "file" | "font" | "audio";
export interface OssConstantItemVO {
  /**
   * 文件类型
   */
  code?: OssFileCodeType;
  /**
   * 文件后缀
   */
  fileSize?: number;
  fileType?: string;
  path?: string;
  timeOut?: number;
  type?: string;
}

export enum OssFileCodeType {
  IMAGE = 0,
  VIDEO = 1,
  FILE = 2,
  FONT = 3,
  SOUND = 4,
}
