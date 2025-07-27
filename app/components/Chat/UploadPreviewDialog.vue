<script lang="ts" setup>
import ContextMenuGlobal from "@imengyu/vue3-context-menu";
import { getImgSize } from "./Msg";

interface Props {
  show: boolean
  targetContact: Partial<ChatContactExtra>
  imgList?: OssFile[]
  fileList?: OssFile[]
  videoList?: OssFile[]
  contextMenuTheme?: string
  inputProps?: Record<string, any>
}

interface Emits {
  (e: "update:show", value: boolean): void

  (e: "removeFile", type: OssFileType, key: string, index: number): void;
  (e: "showVideo", event: MouseEvent, video: OssFile): void;
  (e: "clearReply"): void;
  (e: "scrollBottom"): void;

  (e: "submit", content?: string): void
}


const {
  show,
  imgList = [],
  fileList = [],
  videoList = [],
} = defineProps<Props>();

const emit = defineEmits<Emits>();
const setting = useSettingStore();

const replyContentRef = useTemplateRef("replyContentRef");
const replyContent = ref("");
const isLoading = computed(() => {
  return imgList.some(img => img.status !== "success")
    || fileList.some(file => file.status !== "success")
    || videoList.some(video => video.status !== "success");
});
// 控制弹窗显示
const dialogVisible = computed({
  get: () => {
    if (show) {
      replyContentRef.value?.focus(); // 聚焦输入框
    }
    return show;
  },
  set: (value: boolean) => {
    emit("update:show", value);
  },
});


/**
 * 右键菜单
 * @param e 事件对象
 * @param key key
 * @param index 索引
 */
function onContextFileMenu(e: MouseEvent, key?: string, index: number = 0, type: OssFileType = OssFileType.IMAGE) {
  e.preventDefault();
  const textMap = {
    [OssFileType.IMAGE]: "图片",
    [OssFileType.FILE]: "文件",
    [OssFileType.VIDEO]: "视频",
    [OssFileType.SOUND]: "语音",
  } as Record<OssFileType, string>;
  const opt = {
    x: e.x,
    y: e.y,
    theme: setting.contextMenuTheme,
    items: [
      {
        customClass: "group",
        icon: "i-solar:trash-bin-minimalistic-outline group-btn-danger",
        label: `撤销${textMap[type]}`,
        onClick: async () => {
          if (!key)
            return;
          emit("removeFile", type, key, index);
        },
      },
    ],
  };
  ContextMenuGlobal.showContextMenu(opt);
}

/**
 * 发送消息
 */
async function onSend() {
  emit("submit", replyContent.value);
  replyContent.value = "";
}
</script>

<template>
  <DialogPopup
    v-model="dialogVisible"
    :min-scale="0.98"
    :duration="20"
    :z-index="999"
    destroy-on-close
    :show-close="false"
    content-class="w-86vw sm:(w-fit max-w-24rem) shadow-lg border-default-2  rounded-2 dialog-bg-color"
  >
    <div class="p-4">
      <p text-sm>
        发送给：
      </p>
      <div class="flex items-center border-default-2-b py-4">
        <CardElImage
          :error-class="contactTypeIconClassMap[(targetContact as ChatContactVO).type]"
          :default-src="targetContact.avatar"
          fit="cover"
          class="h-7 w-7 card-rounded-df card-bg-color-2 object-cover"
        />
        <p class="max-w-14em truncate px-4 text-sm">
          {{ targetContact.name }}
        </p>
      </div>
      <el-scrollbar wrap-class="py-6 px-2" max-height="40vh" max-width="100%">
        <!-- 图片 -->
        <div
          v-if="imgList.length > 0"
          class="w-full flex cursor-pointer justify-center gap-2"
          style="margin:0;margin-bottom:0.4rem;"
        >
          <div
            v-for="(img, i) in imgList" :key="i" v-loading="img.status !== 'success'"
            class="group relative flex-row-c-c border-default-2 card-default shadow-sm transition-shadow hover:shadow"
            :element-loading-spinner="defaultLoadingIcon"
            element-loading-background="transparent"
            @contextmenu="onContextFileMenu($event, img.key, i, OssFileType.IMAGE)"
          >
            <div title="撤销图片" class="absolute z-5 h-6 w-6 card-default transition-opacity -right-2 -top-2 !rounded-full group-hover-op-80 hover-op-100 sm:op-0" @click.stop="emit('removeFile', OssFileType.IMAGE, img.key!, i)">
              <i i-carbon:close block h-full w-full />
            </div>
            <CardElImage
              preview-teleported
              loading="lazy"
              :preview-src-list="[img.id || BaseUrlImg + img.key]"
              :src="img.id || BaseUrlImg + img.key"
              ctx-name="img"
              load-class="sky-loading block absolute top-0"
              class="border-default-2 card-default transition-shadow !h-6rem !w-6rem hover:shadow !sm:h-8rem !sm:w-8rem"
              :style="getImgSize(img.width, img.height)"
              title="左键放大 | 右键删除"
            />
          </div>
        </div>
        <!-- 视频 -->
        <div
          v-if="videoList.length > 0"
          class="w-full flex flex-row cursor-pointer gap-2"
        >
          <div
            v-for="(video, i) in videoList"
            :key="i"
            title="点击播放[视频]"
            class="relative shrink-0"
            @click="emit('showVideo', $event, video)"
            @contextmenu="onContextFileMenu($event, video.key, i, OssFileType.VIDEO)"
          >
            <div
              v-if="video?.children?.[0]?.id"
              v-loading="video.status !== 'success'"
              :element-loading-spinner="defaultLoadingIcon"
              element-loading-background="transparent"
              class="relative flex-row-c-c cursor-pointer"
            >
              <div title="撤销视频" class="absolute z-5 h-6 w-6 border-default-2 card-default transition-opacity -right-2 -top-2 !rounded-full group-hover-op-80 hover-op-100 sm:op-0" @click.stop="emit('removeFile', OssFileType.VIDEO, video.key!, i)">
                <i i-carbon:close block h-full w-full />
              </div>
              <CardElImage
                error-class="i-solar:file-smile-line-duotone p-2.8"
                :src="video?.children?.[0]?.id"
                class="h-full max-h-16rem max-w-16rem min-h-8rem min-w-8rem w-full flex-row-c-c card-default shadow"
              />
              <div class="play-btn absolute-center-center h-12 w-12 flex-row-c-c rounded-full" style="border-width: 2px;">
                <i i-solar:alt-arrow-right-bold ml-1 p-4 />
              </div>
            </div>
            <div class="mt-1 w-full truncate card-rounded-df bg-color-br pb-2 pl-3 pr-2 backdrop-blur transition-all" :class="video.status !== 'success' ? 'h-8' : 'h-0 !p-0 '">
              <el-progress
                striped
                :striped-flow="video.status !== 'success'"
                :duration="10"
                class="absolute mt-2 min-w-8em w-full"
                :percentage="video.percent" :stroke-width="4" :status="video?.status as any || ''"
              >
                {{ formatFileSize(video?.file?.size || 0) }}
              </el-progress>
            </div>
          </div>
        </div>
        <!-- 文件 -->
        <div
          v-if="fileList.length > 0"
          class="w-full flex flex-col cursor-pointer gap-2"
        >
          <div
            v-for="(file, i) in fileList"
            :key="i" class="w-full flex items-center border-default-hover card-rounded-df bg-color p-3 transition-all sm:p-2.8"
            @contextmenu="onContextFileMenu($event, file.key, i, OssFileType.FILE)"
          >
            <img :src="file?.file?.type ? (FILE_TYPE_ICON_MAP[file?.file?.type] || FILE_TYPE_ICON_DEFAULT) : FILE_TYPE_ICON_DEFAULT" class="mr-2 h-8 w-8">
            <div class="min-w-8rem flex-1 truncate">
              <div class="truncate text-sm">
                {{ (file?.file?.name || file.key)?.replace(/(.{8}).*(\..+)/, '$1****$2') }}
                <i class="transition-op i-solar:trash-bin-trash-broken float-right shrink-0 p-2 op-100 group-hover:op-100 sm:op-0" @click.stop="emit('removeFile', OssFileType.FILE, file.key!, i)" />
              </div>
              <el-progress
                striped
                :striped-flow="file.status !== 'success'"
                :duration="10"
                class="mt-2"
                :percentage="file.percent" :stroke-width="4" :status="file?.status as any || ''"
              >
                {{ formatFileSize(file?.file?.size || 0) }}
              </el-progress>
            </div>
          </div>
        </div>
      </el-scrollbar>
      <ElInput
        ref="replyContentRef"
        v-model="replyContent"
        class="input"
        type="textarea"
        :rows="1"
        :autosize="{ minRows: 1, maxRows: 4 }"
        placeholder="发消息"
        v-bind="inputProps"
        @keyup.enter.stop.prevent="emit('submit', replyContent.trim())"
      />
      <div class="btn-group mt-4 flex-row-bt-c">
        <BtnElButton
          class="w-full"
          bg
          text
          @click="dialogVisible = false"
        >
          取消
        </BtnElButton>
        <BtnElButton
          class="w-full"
          type="primary"
          bg
          :disabled="isLoading"
          @click="onSend"
        >
          发送
        </BtnElButton>
      </div>
    </div>
  </DialogPopup>
</template>

<style scoped lang="scss">
  :deep(.el-textarea.input) {
    .el-textarea__inner {
      --at-apply: "!shadow-none !outline-none !input-bg-color";
      resize: none;
    }
  }
  .icon {
    --at-apply: "h-2rem px-2 w-2rem  !btn-primary-bg flex-row-c-c input-bg-color";
  }
</style>
