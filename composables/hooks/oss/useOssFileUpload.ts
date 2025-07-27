import type { OssFile } from "@/composables/api/res";
import { useFileDialog } from "@vueuse/core";
import * as qiniu from "qiniu-js";
import { onUnmounted } from "vue";
import { deleteOssFile, getOssErrorCode, getResToken, OssFileType, uploadOssFileSe } from "@/composables/api/res";
import { StatusCode } from "@/types/result";

export interface FileUploadConfig {
  /** 文件上传数量限制 */
  limit?: number;
  /** 文件大小限制（字节） */
  size?: number;
  /** 文件最小大小限制（字节） */
  minSize?: number;
  /** 是否支持多文件上传 */
  multiple?: boolean;
  /** 接受的文件类型 */
  accept?: string;
  /** 上传文件类型 */
  uploadType?: OssFileType;
  /** 上传质量 */
  uploadQuality?: number | undefined;
  /** 是否选择目录而不是文件 */
  directory?: boolean;
  /** 上传组件的属性 */
  capture?: string | undefined;
}

export interface FileSelectConfig {
  /** 接受的文件类型 */
  accept?: string;
  /** 是否支持多文件上传 */
  multiple?: boolean;
  /** 是否选择目录而不是文件 */
  directory?: boolean;
  /** 上传组件的属性 */
  capture?: string | undefined;
}

export interface OssUploadResult {
  success: boolean;
  file?: OssFile;
  error?: string;
}

export interface FileAnalysis {
  type: OssFileType;
  size: number;
  mimeType: string;
  name: string;
  isValid: boolean;
  error?: string;
}

/**
 * 文件上传管理Hook - 处理上传逻辑和文件生命周期管理
 *
 * 功能特性：
 * 1. 文件上传（图片、视频、普通文件）
 * 2. 文件收集器：使用Map管理所有ossFile的生命周期
 * 3. 自动清理：组件卸载时自动清理所有文件资源
 * 4. 手动清理：提供多种清理API
 * 5. 文件统计：获取当前管理的文件数量和状态
 *
 * ```
 */
export function useOssFileUpload() {
  const user = useUserStore();

  // 文件收集器 - 使用Map管理所有ossFile
  const fileRegistry = new Map<OssFile, {
    /** 上传开始时间 */
    startTime: number;
    /** 是否已完成（成功或失败） */
    completed: boolean;
    /** 清理函数 */
    cleanup?: () => void;
  }>();

  /**
   * 注册文件到收集器
   */
  function registerFile(ossFile: OssFile): void {
    fileRegistry.set(ossFile, {
      startTime: Date.now(),
      completed: false,
    });
  }

  /**
   * 从收集器中移除文件并清理资源
   */
  function unregisterFile(ossFile: OssFile): void {
    const fileInfo = fileRegistry.get(ossFile);
    if (fileInfo) {
      // 执行清理函数
      fileInfo.cleanup?.();
      // 释放文件资源
      releaseFile(ossFile);
      // 从收集器中移除
      fileRegistry.delete(ossFile);
    }
  }

  /**
   * 标记文件为已完成
   */
  function markFileCompleted(ossFile: OssFile): void {
    const fileInfo = fileRegistry.get(ossFile);
    if (fileInfo) {
      fileInfo.completed = true;
    }
  }

  /**
   * 清理所有已完成的文件
   */
  function cleanupCompletedFiles(): void {
    for (const [ossFile, fileInfo] of fileRegistry.entries()) {
      if (fileInfo.completed) {
        unregisterFile(ossFile);
      }
    }
  }

  /**
   * 清理所有文件（通常在组件卸载时调用）
   */
  function cleanupAllFiles(): void {
    for (const [ossFile] of fileRegistry.entries()) {
      unregisterFile(ossFile);
    }
  }

  /**
   * 获取当前管理的文件统计信息
   */
  function getFileStats() {
    const total = fileRegistry.size;
    let uploading = 0;
    let completed = 0;

    for (const [, fileInfo] of fileRegistry.entries()) {
      if (fileInfo.completed) {
        completed++;
      }
      else {
        uploading++;
      }
    }

    return { total, uploading, completed };
  }

  /**
   * 根据文件大小和限制自动计算图片质量
   */
  function calculateAutoQuality(fileSize: number, maxSize?: number): number {
    if (!maxSize) {
      return 0.6;
    }

    if (fileSize <= maxSize * 0.8) {
      return 0.8;
    }

    const ratio = fileSize / maxSize;

    if (ratio <= 1) {
      return Math.max(0.4, 0.8 - (ratio - 0.8) * 2);
    }
    else if (ratio <= 1.5) {
      return Math.max(0.2, 0.4 - (ratio - 1) * 0.4);
    }
    else {
      return 0.1;
    }
  }

  /**
   * 文件大小验证
   */
  function validateFileSize(file: File, config: FileUploadConfig): string | null {
    const { size, minSize } = config;

    if (size !== undefined && file.size > size) {
      return `文件大小不能超过${formatFileSize(size)}`;
    }
    if (minSize !== undefined && file.size < minSize) {
      return `文件大小不能小于${formatFileSize(minSize)}`;
    }
    return null;
  }

  /**
   * Promise 包装的上传函数
   */
  function qiniuUploadPromise(
    ossFile: OssFile,
    key: string,
    token: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const observable = uploadOssFileSe(ossFile.file!, key, token);
      const subscribe = observable.subscribe({
        next(res) {
          if (ossFile) {
            ossFile.percent = +(res.total.percent?.toFixed?.(2) || 0);
          }
        },
        error(e: qiniu.QiniuError | qiniu.QiniuRequestError | qiniu.QiniuNetworkError) {
          if (ossFile) {
            ossFile.status = "warning";
            let errorMsg = "上传失败，请稍后再试！";

            if (e) {
              errorMsg = getOssErrorCode(e);
            }
            else {
              ossFile.status = "exception";
            }

            reject(new Error(errorMsg));
          }
          else {
            reject(e);
          }
        },
        complete() {
          ossFile.status = "success";
          ossFile.percent = 100;
          resolve();
        },
      });

      // 保存订阅对象
      ossFile.subscribe = subscribe;
    });
  }

  /**
   * 上传指定文件
   */
  async function uploadFile(ossFile: OssFile, config: {
    uploadQuality?: number,
    maxSize?: number
    customUploadType?: OssFileType
    uploadTokenConfig?: {
      url: string
      key: string
      uploadToken: string
      endDateTime: number
    }
  } = {}, completeFormData?: (data: Partial<ChatMessageDTO>) => void): Promise<OssUploadResult> {
    const {
      uploadQuality,
      maxSize,
      uploadTokenConfig = undefined,
      customUploadType,
    } = config;
    if (!ossFile) {
      return { success: false, error: "文件不存在" };
    }

    // 注册文件到收集器
    registerFile(ossFile);

    try {
      ossFile.status = "";
      // 分析文件类型
      const uploadTypeRes = analyzeFile(ossFile.file!, customUploadType);
      const uploadType = uploadTypeRes.type;
      if (!ossFile.file) {
        throw new Error("文件引用不存在，请重新选择！");
      }
      const getToken = async () => {
        let uploadTokenResult = uploadTokenConfig;
        if (!uploadTokenConfig) {
          const upToken = await getResToken(uploadType, user.getToken);
          if (upToken.code !== StatusCode.SUCCESS) {
            throw new Error(upToken.message);
          }
          ossFile.key = upToken.data.key;
          uploadTokenResult = upToken.data;
        }
        else {
          ossFile.key = uploadTokenConfig.key;
        }
        if (!uploadTokenResult?.uploadToken) {
          throw new Error("上传凭证错误，请重新上传！");
        }
        return uploadTokenResult;
      };
      // 根据文件类型处理上传
      if (uploadType === OssFileType.IMAGE && ossFile.file.type.startsWith("image/")) {
        // 获取图片尺寸
        await new Promise<void>((resolve) => {
          const url = window.URL || window.webkitURL;
          const img = new Image();
          const targetUrl = url.createObjectURL(ossFile.file!);
          img.src = targetUrl;
          img.onload = () => {
            ossFile.id = targetUrl;
            ossFile.width = img.width;
            ossFile.height = img.height;
            resolve();
          };
          completeFormData?.({
            body: {
              url: targetUrl,
              width: img.width,
              height: img.height,
            } as ImgBodyDTO,
          });
        });


        // 获取上传凭证
        const uploadTokenResult = await getToken();
        ossFile.key = uploadTokenResult.key;
        // GIF 文件不压缩，直接上传
        if (ossFile.file.type === "image/gif") {
          await qiniuUploadPromise(ossFile, ossFile.key, uploadTokenResult?.uploadToken);
        }
        else {
          const calculatedQuality = uploadQuality !== undefined
            ? uploadQuality
            : calculateAutoQuality(ossFile.file.size, maxSize);

          const options = {
            quality: calculatedQuality,
            noCompressIfLarger: true,
          };
          const res = await qiniu.compressImage(ossFile.file, options);
          const compressedFile = res.dist as File;

          // 压缩后检查文件大小
          const sizeError = validateFileSize(compressedFile, config);
          if (sizeError) {
            throw new Error(sizeError);
          }

          await qiniuUploadPromise(ossFile, ossFile.key, uploadTokenResult?.uploadToken);
        }
      }
      else if (uploadType === OssFileType.VIDEO) {
        // 获取视频封面
        const {
          blob,
          width,
          height,
          duration,
          size: thumbSize,
        } = await generateVideoThumbnail(ossFile.file, { quality: 0.15, mimeType: "image/png" });
        if (duration <= 0) {
          throw new Error("视频时长小于1s，请重新选择！");
        }
        const coverFileRaw = new File([blob], "cover.png", { type: blob.type });
        const coverUrl = URL.createObjectURL(coverFileRaw);
        const coverFile = shallowReactive<OssFile>({
          id: coverUrl,
          // key: coverRes.data.key,
          status: "",
          percent: 0,
          file: coverFileRaw,
          duration,
          thumbWidth: width,
          thumbHeight: height,
          thumbSize,
        });
        ossFile.children = [coverFile];
        ossFile.duration = duration;
        ossFile.thumbHeight = height;
        ossFile.thumbWidth = width;
        ossFile.thumbSize = thumbSize;
        // 处理
        completeFormData?.({
          body: {
            size: ossFile.file?.size,
            duration,
            thumbUrl: coverUrl,
            thumbSize,
            thumbWidth: width,
            thumbHeight: height,
          } as VideoBodyDTO,
        });
        // 上传封面
        const coverRes = await getResToken(OssFileType.IMAGE, user.getToken);
        if (coverRes.code !== StatusCode.SUCCESS) {
          throw new Error(coverRes.message);
        }
        coverFile.key = coverRes.data.key;
        if (!coverFile.key) {
          return {
            success: false,
            error: "视频文件上传失败，缺少上传凭证！",
            file: ossFile,
          };
        }
        // 注册封面文件到收集器
        registerFile(coverFile);
        // 上传封面
        await qiniuUploadPromise(coverFile, coverFile.key, coverRes.data.uploadToken);
        // 标记封面文件为已完成
        markFileCompleted(coverFile);
        const uploadTokenResult = await getToken();
        ossFile.key = uploadTokenResult.key;
        // 上传视频
        await qiniuUploadPromise(ossFile, ossFile.key, uploadTokenResult?.uploadToken);
      }
      else if (customUploadType === OssFileType.SOUND) {
        const uploadTokenResult = await getToken();
        completeFormData?.({
          body: {
            url: ossFile.key,
          } as SoundBodyDTO,
        });
        ossFile.key = uploadTokenResult.key;
        await qiniuUploadPromise(ossFile, ossFile.key, uploadTokenResult?.uploadToken);
      }
      else {
        // 其他文件类型直接上传
        const uploadTokenResult = await getToken();
        completeFormData?.({
          body: {
            url: ossFile.key,
            fileName: ossFile.file?.name,
            size: ossFile.file?.size,
            mimeType: ossFile.file?.type,
          } as FileBodyDTO,
        });
        ossFile.key = uploadTokenResult.key;
        await qiniuUploadPromise(ossFile, ossFile.key, uploadTokenResult?.uploadToken);
      }

      // 标记文件为已完成
      markFileCompleted(ossFile);
      return { success: true, file: ossFile };
    }
    catch (error: Error | any) {
      ossFile.status = "exception";
      // 标记文件为已完成（失败也是完成状态）
      markFileCompleted(ossFile);
      console.log("上传文件失败:");
      return {
        success: false,
        error: (error instanceof Error || error?.message) ? error.message : "上传失败，请重试！",
        file: ossFile,
      };
    }
  }


  /**
   * 删除已上传的文件
   */
  async function deleteFile(ossFile: OssFile): Promise<boolean> {
    try {
      // 如果文件正在上传中，取消上传
      if (ossFile.subscribe && ossFile.status !== "success") {
        ossFile.subscribe.unsubscribe();
        // 从收集器中移除（取消上传的文件）
        unregisterFile(ossFile);
        return false;
      }
      if (!ossFile?.key) {
        // 从收集器中移除（没有key的文件）
        unregisterFile(ossFile);
        return false;
      }

      // 删除文件及其子文件（如视频封面）
      const filesToDelete = [ossFile, ...(ossFile.children || [])];

      for (const item of filesToDelete) {
        if (item.key) {
          const res = await deleteOssFile(item.key, user.getToken);
          if (res.code !== StatusCode.SUCCESS && res.code !== StatusCode.DELETE_NOEXIST_ERR) {
            console.warn(`删除文件失败: ${item.key}`);
          }
        }
        // 从收集器中移除子文件
        if (item !== ossFile) {
          unregisterFile(item);
        }
      }

      // 从收集器中移除主文件
      unregisterFile(ossFile);
      return true;
    }
    catch (error) {
      console.error("删除文件失败:", error);
      // 即使删除失败，也从收集器中移除
      unregisterFile(ossFile);
      return false;
    }
  }

  /**
   * 释放文件资源
   */
  function releaseFile(ossFile: OssFile): boolean {
    if (!ossFile) {
      return false;
    }

    // 取消上传订阅
    if (ossFile.subscribe) {
      ossFile.subscribe.unsubscribe();
    }

    // 释放 blob URL
    if (ossFile.id && ossFile.id.startsWith("blob:")) {
      URL.revokeObjectURL(ossFile.id);
    }

    return true;
  }


  // 在组件卸载时自动清理所有文件
  if (typeof onUnmounted !== "undefined") {
    onUnmounted(() => {
      cleanupAllFiles();
    });
  }

  return {
    // 方法
    uploadFile,
    deleteFile,
    releaseFile,
    getFile: (ossFile: OssFile) => fileRegistry.get(ossFile),

    // 文件收集器管理方法
    registerFile,
    unregisterFile,
    markFileCompleted,
    cleanupCompletedFiles,
    cleanupAllFiles,
    getFileStats,

  };
}

/**
 * 分析文件类型和有效性
 */
function analyzeFile(file: File, uploadType?: OssFileType): FileAnalysis {
  const { type: mimeType, size, name } = file;

  let type: OssFileType;
  let isValid = true;
  let error: string | undefined;

  // 根据MIME类型判断文件类型
  if (mimeType.startsWith("image/")) {
    type = OssFileType.IMAGE;
  }
  else if (mimeType.startsWith("video/")) {
    type = OssFileType.VIDEO;
  }
  else if (uploadType === OssFileType.SOUND) {
    type = OssFileType.SOUND;
  }
  else {
    type = OssFileType.FILE;
  }

  // 基础验证
  if (size === 0) {
    isValid = false;
    error = "文件大小为0，可能为空文件！";
  }

  return {
    type,
    size,
    mimeType,
    name,
    isValid,
    error,
  };
}
/**
 * 文件操作Hook - 提供文件选择等操作
 */
export function useFileActions(onChangeHandler: (files: FileList | null) => void) {
  /**
   * 选择文件
   */
  function selectFile(config: FileSelectConfig = {}): Promise<File[]> {
    const {
      accept = "*",
      multiple = false,
      directory = false,
      capture = undefined,
    } = config;

    return new Promise((resolve, reject) => {
      const {
        files: selectedFiles,
        open,
        reset,
        onChange,
        onCancel,
      } = useFileDialog({
        accept,
        multiple,
        directory,
        reset: true,
        capture,
      });

      // 监听文件选择
      const stopWatchFiles = watch(selectedFiles, (files) => {
        if (files && files.length > 0) {
          resolve(Array.from(files));
        }
      });
      const { off: offOnChange } = onChange(onChangeHandler);


      // 监听取消事件
      onCancel(() => {
        cleanup();
      });

      // 清理函数
      function cleanup() {
        stopWatchFiles();
        offOnChange();
        reset();
      }

      // 打开文件选择器
      open();
    });
  }

  /**
   * 根据文件类型获取预设配置
   */
  function getPresetConfig(type: OssFileType, capture?: string): FileUploadConfig {
    const setting = useSettingStore();
    const ossInfo = setting.systemConstant.ossInfo;

    const configs: Record<OssFileType, FileUploadConfig | undefined> = {
      [OssFileType.IMAGE]: {
        accept: "image/*",
        multiple: true,
        size: ossInfo.image.fileSize,
        uploadType: OssFileType.IMAGE,
        uploadQuality: 0.6,
        directory: false,
        capture,
      },
      [OssFileType.VIDEO]: {
        accept: "video/*",
        multiple: true,
        size: ossInfo.video.fileSize,
        uploadType: OssFileType.VIDEO,
        directory: false,
        uploadQuality: 0.6,
        capture,
      },
      [OssFileType.FILE]: {
        accept: "!image/*, !video/*",
        multiple: true,
        size: ossInfo.file.fileSize,
        uploadType: OssFileType.FILE,
        directory: false,
        capture,
      },
      [OssFileType.SOUND]: undefined,
      // {
      //   accept: "audio/*",
      //   multiple: true,
      //   size: ossInfo.file.fileSize, // 假设使用文件大小限制
      //   uploadType: OssFileType.SOUND,
      //   directory: false,
      //   capture,
      // },
      [OssFileType.FONT]: undefined,
      // [OssFileType.FONT]: {
      //   accept: ".ttf,.otf,.woff,.woff2",
      //   multiple: false,
      //   size: ossInfo.file.fileSize,
      //   uploadType: OssFileType.FONT,
      //   directory: false,
      //   capture,
      // },
    };

    return configs?.[type] || configs[OssFileType.FILE]!;
  }

  /**
   * 快速选择特定类型文件
   */
  async function selectImageFiles(capture?: string): Promise<File[]> {
    const config = getPresetConfig(OssFileType.IMAGE, capture);
    return selectFile({
      accept: config.accept,
      multiple: config.multiple,
      directory: config.directory,
      capture: config.capture,
    });
  }

  async function selectVideoFiles(capture?: string): Promise<File[]> {
    const config = getPresetConfig(OssFileType.VIDEO, capture);
    return selectFile({
      accept: config.accept,
      multiple: config.multiple,
      directory: config.directory,
      capture: config.capture,
    });
  }

  async function selectAnyFiles(): Promise<File[]> {
    return selectFile({ accept: "*/*", multiple: true });
  }

  return {
    // 核心方法
    selectFile,
    analyzeFile,
    getPresetConfig,

    // 便捷方法
    selectImageFiles,
    selectVideoFiles,
    selectAnyFiles,
  };
}
