<script lang="ts" setup>
import type { InputHTMLAttributes, ShallowReactive } from "vue";
import type { OssFile } from "@/composables/api/res";
import * as qiniu from "qiniu-js";
import { deleteOssFile, getOssErrorCode, getResToken, OssFileType, uploadOssFileSe } from "@/composables/api/res";
import { StatusCode } from "@/types/result";

const {
  limit = 1,
  size,
  minSize,
  draggable = false,
  preClass = "",
  errorClass = "",
  inputClass = "",
  inputProps = {},
  multiple = false,
  showEdit = true,
  showDelete = true,
  required = false,
  isAnimate = true,
  disable = false,
  modelValue = [] as OssFile[],
  accept = "image/*",
  acceptDesc = [
    "image/jpeg",
    "image/png",
    "image/bmp",
    "image/webp",
    "image/jpg",
    "image/tiff",
    "image/tif",
    "image/ico",
    "image/x-icon",
    "image/gif",
    "image/svg+xml",
    "image/heic",
    "image/heif",
    "image/raw",
    "image/apng",
  ],
  uploadType = OssFileType.IMAGE,
  uploadQuality = undefined,
  autoUpload = true,
  preview = true,
} = defineProps<Props>();
// emit
const emit = defineEmits<{
  (e: "submit", newKey: string, pathList: string[], fileList: OssFile[]): any
  (e: "errorMsg", errorStr: string): any
  (e: "update:modelValue", date: OssFile[]): any
  (e: "onChange", files: File[]): any
}>();

interface Props {
  limit?: number
  multiple?: boolean
  showEdit?: boolean
  showDelete?: boolean
  required?: boolean
  modelValue?: OssFile[]
  preview?: boolean
  disable?: boolean
  isAnimate?: boolean
  uploadQuality?: number | undefined
  autoUpload?: boolean
  inputProps?: InputHTMLAttributes
  /**
   * 文件类型
   * @default 'image/*'
   */
  accept?: string
  acceptDesc?: string[]
  uploadType?: OssFileType
  /**
   * 文件大小限制 单位：Byte
   */
  size?: number
  minSize?: number
  draggable?: boolean
  preClass?: string
  errorClass?: string
  inputClass?: string
}

const user = useUserStore();

/**
 * 根据文件大小和限制自动计算图片质量
 * @param fileSize 文件大小（字节）
 * @param maxSize 最大文件大小限制（字节）
 * @returns 计算出的图片质量（0-1之间）
 */
function calculateAutoQuality(fileSize: number, maxSize?: number): number {
  // 如果没有设置大小限制，使用默认质量
  if (!maxSize) {
    return 0.6;
  }

  // 如果文件已经小于限制的80%，使用较高质量
  if (fileSize <= maxSize * 0.8) {
    return 0.8;
  }

  // 如果文件大小接近限制，需要更低的质量
  const ratio = fileSize / maxSize;

  if (ratio <= 1) {
    // 线性插值：当文件大小从80%增长到100%时，质量从0.8降到0.4
    return Math.max(0.4, 0.8 - (ratio - 0.8) * 2);
  }
  else if (ratio <= 1.5) {
    // 文件超过限制但不太多，使用较低质量
    return Math.max(0.2, 0.4 - (ratio - 1) * 0.4);
  }
  else {
    // 文件明显超过限制，使用最低质量
    return 0.1;
  }
}

// 已上传文件列表 (public)
const fileList = ref<OssFile[]>(modelValue || []);
const pathList = computed(() => {
  return getNewPathList(fileList.value);
});

function getNewPathList(list: OssFile[]) {
  const pathList: string[] = [];
  if (list) {
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (p && p.key)
        pathList.push(p.key);
    }
  }
  return pathList;
}

// 错误信息
const error = ref<string>("");
// 输入框ref
const inputRef = useTemplateRef("inputRef");
// 1、文件改变
async function hangdleChange(e: Event) {
  if (disable)
    return;
  const t = e.target as HTMLInputElement;
  if (!t.files?.length)
    return;

  // 如果不自动上传，只触发onChange事件
  if (!autoUpload) {
    const files = Array.from(t.files);
    emit("onChange", files);
    return;
  }

  // 单文件
  if (limit === 1) {
    if (fileList.value.length)
      fileList.value.splice(0);
    const ossFile: OssFile = shallowReactive({
      id: URL.createObjectURL(t.files[0] as Blob | MediaSource),
      key: undefined,
      status: "",
      percent: 0,
      file: t.files[0],
    });
    await onUpload(ossFile);
  }
  else {
    // 多文件
    if (t.files.length > limit || (fileList.value.length + t.files.length) > limit) {
      emit("errorMsg", `最多只能上传${limit}个文件`);
      await nextTick();
      resetInput();
      return error.value = `最多只能上传${limit}个文件`;
    }
    else {
      error.value = "";
    }
    const data = [...t.files].map((p) => {
      return shallowReactive<OssFile>({
        id: URL.createObjectURL(p as Blob | MediaSource),
        key: undefined,
        status: "",
        percent: 0,
        file: p,
      });
    });

    // 并发上传多个文件
    await Promise.allSettled(data.map(p => onUpload(p)));
  }
}

/**
 * 上传文件
 * @param ossFile 文件对象
 */
async function onUpload(ossFile: ShallowReactive<OssFile>): Promise<boolean> {
  // 文件校验
  if (fileList.value.length + 1 > limit) { // 限制上传数量
    error.value = `最多只能上传${limit}个文件`;
    emit("errorMsg", error.value);
    await nextTick();
    resetInput();
    return false;
  }
  // 保留其他错误检查
  error.value = "";
  // 非图片先校验
  if (uploadType !== OssFileType.IMAGE) {
    if (size !== undefined && ossFile?.file?.size && ossFile?.file?.size > size) {
      error.value = `文件大小不能超过${formatFileSize(size)}`;
      emit("errorMsg", error.value);
      resetInput();
      return false;
    }
    if (minSize !== undefined && ossFile?.file?.size && ossFile?.file?.size < minSize) {
      error.value = `文件大小不能小于${formatFileSize(minSize)}`;
      emit("errorMsg", error.value);
      resetInput();
      return false;
    }
    else {
      error.value = "";
    }
  }

  // 1）获取凭证
  const upToken = await getResToken(uploadType, user.getToken);
  if (upToken.code !== StatusCode.SUCCESS) {
    error.value = upToken.message;
    ossFile.status = "warning";
    return false;
  } // 保存上传凭证
  ossFile.key = upToken.data.key;

  // 计算图片质量：如果uploadQuality为undefined则自动计算，否则使用指定值
  const calculatedQuality = uploadQuality !== undefined
    ? uploadQuality
    : calculateAutoQuality(ossFile.file?.size || 0, size);

  const options = {
    quality: calculatedQuality,
    noCompressIfLarger: true,
  };
  if (!ossFile?.file)
    return false;

  // ------------添加到队列-----------
  // 上传中 只能压缩图片
  if (uploadType === OssFileType.IMAGE && acceptDesc.includes(ossFile.file.type)) {
    // 获取图片尺寸
    await new Promise((resolve) => {
      const url = window.URL || window.webkitURL;
      const img = new Image();
      img.src = url.createObjectURL(ossFile.file!);
      img.onload = () => {
        ossFile.width = img.width;
        ossFile.height = img.height;
        resolve(true);
      };
    });

    // 判断是否为 GIF
    if (ossFile.file.type === "image/gif") {
    // GIF 不压缩，直接上传
      fileList.value.push(ossFile);
      return await qiniuUploadPromise(ossFile.file, ossFile?.key || "", upToken.data.uploadToken, ossFile);
    }

    try {
      const res = await qiniu.compressImage(ossFile?.file, options);
      // 压缩后检查文件大小
      const compressedFile = res.dist as File;

      if (size !== undefined && compressedFile.size > size) {
        error.value = `文件大小不能超过${formatFileSize(size)}`;
        emit("errorMsg", error.value);
        resetInput();
        return false;
      }
      if (minSize !== undefined && compressedFile.size < minSize) {
        error.value = `文件大小不能小于${formatFileSize(minSize)}`;
        emit("errorMsg", error.value);
        resetInput();
        return false;
      }

      // 如果通过大小检查，继续上传
      fileList.value.push(ossFile);
      return await qiniuUploadPromise(compressedFile, ossFile?.key || "", upToken.data.uploadToken, ossFile);
    }
    catch (e) {
      console.warn(e);
      ossFile.status = "warning";
      error.value = "图片压缩失败，请稍后再试！";
      emit("errorMsg", error.value);
      throw e;
    }
  }
  else if (uploadType === OssFileType.VIDEO && ossFile?.file) { // 视频先获取一帧，作为封面
    try {
      // 2. 获取封面
      const {
        blob,
        width,
        height,
        duration,
        size,
      }: VideoFileInfo = await generateVideoThumbnail(ossFile.file, { quality: 0.15, mimeType: "image/png" });

      const coverUrl = URL.createObjectURL(blob);
      const coverFileRaw = new File([blob], "cover.png", { type: blob.type }) as File;
      const coverFile = ref<OssFile>({
        id: coverUrl,
        key: undefined,
        status: "",
        percent: 0,
        file: coverFileRaw,
        duration,
        thumbWidth: width,
        thumbHeight: height,
        thumbSize: size,
      });
      ossFile.children = [ // 封面复制
        coverFile.value,
      ];

      // 1. 先上传封面图片
      const coverRes = await getResToken(OssFileType.IMAGE, user.getToken);
      fileList.value.push(ossFile);
      if (coverRes.code !== StatusCode.SUCCESS || !ossFile.file) {
        error.value = coverRes.message;
        ossFile.status = "warning";
        return false;
      }
      coverFile.value.key = coverRes.data.key;

      // 图片文件上传 压缩
      console.log(formatFileSize(blob.size));

      // 等待封面上传完成
      await qiniuUploadPromise(coverFileRaw as File, coverFile.value.key as string, coverRes.data.uploadToken, coverFile.value, false, (theCover) => {
        if (ossFile.status === "success") {
          ossFile.status = theCover.status;
        }
      });

      // 2. 上传视频
      return await qiniuUploadPromise(ossFile.file, ossFile?.key || "", upToken.data.uploadToken, ossFile);
    }
    catch (e) {
      console.warn(e);
      ossFile.status = "warning";
      error.value = "视频封面获取失败，请稍后再试！";
      emit("errorMsg", error.value);
      throw e;
    }
  }
  else {
    fileList.value.push(ossFile);
    return await qiniuUploadPromise(ossFile.file, ossFile?.key || "", upToken.data.uploadToken, ossFile);
  }
}
// Promise 包装的上传函数
function qiniuUploadPromise(dist: File, key: string, token: string, file: OssFile, isPush = true, done?: (theFile: OssFile) => void): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const observable = uploadOssFileSe(dist, key, token);
    const subscribe = observable.subscribe({
      next(res) {
        const current = fileList.value.find(p => p.key === key) || file;
        current.percent = +(res.total.percent?.toFixed?.(2) || 0);
      },
      error(e) {
        const theFile = fileList.value.find(p => p.key === key) || file;
        theFile.status = "warning";
        const err = e as any;
        if (err?.code) {
          error.value = getOssErrorCode(e) || "上传失败，请稍后再试！";
          emit("errorMsg", error.value);
        }
        else {
          theFile.status = "exception";
          ElMessage.error("上传失败，稍后再试！");
        }
        reject(e);
      },
      complete() {
        const current = fileList.value.find(p => p.key === key) || file;
        current.status = "success";
        current.percent = 100;
        done && done(current);
        resetRawInp();
        isPush && emit("update:modelValue", fileList.value);
        isPush && emit("submit", current.key!, pathList.value, fileList.value);
        resolve(true);
      },
    });
    file.subscribe = subscribe;
  });
}

// 封装上传处理
function qiniuUpload(dist: File, key: string, token: string, file: OssFile, isPush = true, done?: (theFile: OssFile) => void) {
  const observable = uploadOssFileSe(dist, key, token);
  const subscribe = observable.subscribe({
    next(res) {
      const current = fileList.value.find(p => p.key === key) || file;
      current.percent = +(res.total.percent?.toFixed?.(2) || 0);
    },
    error(e) {
      const theFile = fileList.value.find(p => p.key === key) || file;
      theFile.status = "warning";
      const err = e as any;
      if (err?.code) {
        error.value = getOssErrorCode(e) || "上传失败，请稍后再试！";
        emit("errorMsg", error.value);
      }
      else {
        theFile.status = "exception";
        ElMessage.error("上传失败，稍后再试！");
      }
    },
    complete() {
      const current = fileList.value.find(p => p.key === key) || file;
      current.status = "success";
      current.percent = 100;
      done && done(current);
      resetRawInp();
      isPush && emit("update:modelValue", fileList.value);
      isPush && emit("submit", current.key!, pathList.value, fileList.value);
    },
  });
  file.subscribe = subscribe;
}

function resetRawInp() {
  if (inputRef?.value?.value) {
    inputRef.value.value = "";
    error.value = "";
  }
}

function resetInput() {
  if (inputRef?.value?.value) {
    inputRef.value.value = "";
    fileList.value = [];
    error.value = "";
  }
}
// 删除文件
async function removeItem(t: OssFile) {
  if (!t.key)
    return;
  let flag = false;
  if (t.key) {
    // 上传中
    const file = fileList.value.find(item => item.key === t.key);
    if (file && file.status !== "success") {
      file.status = "warning";
      file.subscribe?.unsubscribe(); // 取消上传
    }
    const files = [t, ...(t.children || [])];
    files.forEach(async (item) => {
      if (!item.key) {
        return;
      }
      const res = await deleteOssFile(item.key, user.getToken);
      if (res.code === StatusCode.SUCCESS) {
        fileList.value.splice(
          fileList.value.findIndex(item => item.key === t.key),
          1,
        );
        flag = true;
      }
      else if (res.code === StatusCode.DELETE_NOEXIST_ERR) {
        // ElMessage.closeAll("error");
        fileList.value.splice(
          fileList.value.findIndex(item => item.key === t.key),
          1,
        );
      }
    });
  }
  else {
    fileList.value.splice(
      fileList.value.findIndex(item => item.id === t.id),
      1,
    );
  }
  resetInput();
  emit("update:modelValue", fileList.value);
  emit("submit", "", pathList.value, fileList.value);
  return flag;
}

/**
 * 计算预览列表样式class
 */
const preImageClass = computed(() => {
  const arr: string[] = [];
  if (limit === 1)
    arr.push("absolute top-0 z-1");
  if (inputClass)
    arr.push(inputClass);
  if (preClass)
    arr.push(preClass);
  return arr;
});

// 初始化文件列表
watch(() => modelValue, (val) => {
  if (val)
    fileList.value = val;
}, { immediate: true });

const getPreImage = computed(() => {
  if (preview)
    return pathList.value.map(p => BaseUrlImg + p);
  else
    return [];
});

const [autoAnimateRef, enable] = useAutoAnimate({
});

const tempInputProps = ref({});

onMounted(() => {
  const setting = useSettingStore();
  enable(isAnimate && !setting.settingPage.isCloseAllTransition);
});
onBeforeUnmount(() => {
  tempInputProps.value = {};
});

defineExpose({
  inputRef,
  fileList,
  pathList,
  onUpload,
  removeItem,
  resetInput,

  // 打开选择器
  openSelector: (props?: Partial<InputHTMLAttributes>) => {
    tempInputProps.value = props || {};
    nextTick(() => {
      inputRef.value?.click?.();
      setTimeout(() => {
        tempInputProps.value = {};
      }, 100);
    });
  },
});
</script>

<template>
  <div ref="autoAnimateRef" class="input-list relative flex cursor-pointer select-none">
    <div
      key="inputs"
      flex-row-c-c
      transition-300 hover:border="[var(--el-color-primary)]"
      class="relative z-1 border-default-dashed backdrop-blur-12px hover:text-theme-primary"
      :class="inputClass"
    >
      <input
        ref="inputRef"
        class="absolute-center z-10 block h-full w-full cursor-pointer opacity-0"
        type="file"
        :multiple="multiple"
        :accept="accept"
        :required="required"
        :disabled="disable"
        :draggable="draggable"
        v-bind="{
          ...inputProps,
          ...tempInputProps,
        }"
        @change="hangdleChange"
      >
      <ElIconPlus class="absolute-center h-1/3 w-1/3" />
    </div>
    <!-- 图片预览 -->
    <template v-if="uploadType === OssFileType.IMAGE && preview">
      <div
        v-for="(p, index) in fileList"
        :key="p.id"
        class="pre-group flex flex-shrink-0 overflow-hidden backdrop-blur-12px"
        :class="preImageClass"
      >
        <CommonElImage
          loading="lazy"
          :alt="p.id"
          fit="cover"
          :src="p.id"
          load-class="none"
          :preview-src-list="preview ? getPreImage : []"
          preview-teleported
          :initial-index="index"
          class="relative h-full w-full select-none object-cover"
        />
        <div class="absolute left-0 top-0 h-full w-full flex-row-c-c">
          <!-- 加载中 -->
          <el-progress
            v-if="p.status !== 'success'"
            style="aspect-ratio: 1/1; height: 100%; padding: 16%"
            color="var(--el-color-primary)"
            class="backdrop-blur-12px"
            striped
            striped-flow
            type="circle"
            :percentage="p?.percent"
            :status="p.status || ''"
          />
          <!-- 编辑 -->
          <div
            v-else-if="showEdit"
            class="pre-group-hover absolute left-0 top-0 h-full w-full flex-row-c-c gap-1 card-default opacity-0 backdrop-blur-20px transition-300"
          >
            <slot name="pre-btns">
              <div
                v-if="showDelete"
                class="h-full max-h-2rem max-w-2rem w-1/5 cursor-pointer hover:bg-theme-danger"
                i-solar:trash-bin-trash-bold-duotone
                @click="removeItem(p)"
              />
              <!-- 取消上传 -->
              <div
                v-if="p?.percent && p?.percent < 100"
                class="h-1/5 max-h-2rem max-w-2rem w-1/5 cursor-pointer hover:bg-theme-danger"
                i-solar:close-circle-bold-duotone
                @click.stop="p?.subscribe?.unsubscribe()"
              />
            </slot>
          </div>
        </div>
      </div>
    </template>
    <!-- 视频 -->
    <template v-if="uploadType === OssFileType.VIDEO && preview">
      <div
        v-for="p in modelValue"
        :key="p.id"
        class="pre-group relative flex-shrink-0 overflow-hidden backdrop-blur-12px"
        :class="preImageClass"
      >
        <video
          :src="p.id"
          controls z-0 h-full w-full select-none object-cover
        />
        <div class="absolute left-0 top-0 z-1 h-1/4 w-full flex-row-c-c">
          <!-- 加载中 -->
          <el-progress
            v-if="p.percent < 100"
            style="width: 100%; height: 100%; padding: 16%"
            color="var(--el-color-primary)"
            class="backdrop-blur-12px"
            striped
            striped-flow
            type="circle"
            :percentage="p.percent"
            :status="p.status"
          />
          <div
            v-if="!p?.percent && p?.percent < 100"
            class="z-2 h-1/5 max-h-2rem max-w-2rem w-1/5 cursor-pointer hover:bg-theme-danger"
            i-solar:close-circle-bold
            @click="p?.subscribe?.unsubscribe()"
          />
          <!-- 编辑 -->
          <div
            v-else-if="showEdit"
            class="pre-group-hover absolute left-0 top-0 h-full w-full flex-row-c-c gap-1 card-default opacity-0 backdrop-blur-20px transition-300"
          >
            <slot name="pre-btns">
              <div
                v-if="showDelete"
                class="h-full max-h-2rem max-w-2rem w-1/5 cursor-pointer hover:bg-theme-danger"
                i-solar:trash-bin-trash-bold-duotone
                @click="removeItem(p)"
              />
            </slot>
          </div>
        </div>
      </div>
    </template>
    <div key="slot">
      <slot />
    </div>
    <div
      v-show="error"
      key="error"
      :class="errorClass "
      class="m-1 block w-full overflow-hidden truncate text-theme-danger leading-1em opacity-80"
    >
      {{ error }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.input-list {
  :deep(.el-progress) {
    width: 100%;
    height: 100%;
    padding: 16%;
    align-items: center;
    display: flex;
    justify-content: center;
    .el-progress-circle {
      width: 60% !important;
      height: auto !important;
    }
    .el-progress__text {
      color: #fff;
    }
  }
}
.pre-group:hover {
  .pre-group-hover {
    opacity: 100;
  }
}
.pre-btn {
  --at-aplay: "h-1/5 max-h-1.4rem max-w-1.4rem  min-h-0.8rem min-w-0.8rem w-1/5 cursor-pointer";
}
</style>
