<script lang="ts" setup>
import ContextMenu from "@imengyu/vue3-context-menu";
import { FILE_TYPE_ICON_DEFAULT, FILE_TYPE_ICON_MAP, formatFileSize } from "~/composables/api/res/file";
import { getImgSize } from "./Msg";

const {
  imgList = [] as OssFile[],
  videoList = [] as OssFile[],
  fileList = [] as OssFile[],
  replyMsg = {} as ChatMessageVO,
  theContact = {},
  defaultLoadingIcon = "",
  contextMenuTheme = "default",
} = defineProps<{
  imgList?: OssFile[]
  videoList?: OssFile[]
  fileList?: OssFile[]
  replyMsg?: Partial<ChatMessageVO>
  theContact?: Record<string, any>
  defaultLoadingIcon?: string
  contextMenuTheme?: string
}>();

const emit = defineEmits<{
  (e: "removeFile", type: OssFileType, key: string, index: number): void;
  (e: "showVideo", event: MouseEvent, video: OssFile): void;
  (e: "clearReply"): void;
  (e: "scrollBottom"): void;
}>();
const chat = useChatStore();

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
    theme: contextMenuTheme,
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
  ContextMenu.showContextMenu(opt);
}
</script>

<template>
  <div class="absolute w-full flex flex-col p-2 -transform-translate-y-full" @click.prevent>
    <!-- 滚动底部 -->
    <div
      v-show="!chat.isScrollBottom"
      data-fade
      class="mb-2 ml-a mr-2 w-fit btn-info border-default-hover rounded-full card-bg-color px-3 text-right shadow-lg"
      @click="emit('scrollBottom')"
    >
      <i class="i-solar:double-alt-arrow-down-line-duotone block h-5 w-5 transition-200" />
    </div>
    <!-- 新消息 -->
    <div
      v-show="theContact.unreadCount"
      class="mb-2 w-full flex cursor-pointer justify-right px-2"
      @click="emit('scrollBottom')"
    >
      <el-tag type="warning" effect="light" round class="ml-a">
        有 {{ theContact.unreadCount }} 条新消息
      </el-tag>
    </div>
    <!-- 图片 -->
    <div
      v-if="imgList.length > 0"
      class="w-full flex flex-wrap cursor-pointer justify-end gap-2"
      style="padding: 0 0.5rem;margin:0;margin-bottom:0.4rem;"
    >
      <div
        v-for="(img, i) in imgList" :key="i" v-loading="img.status !== 'success'"
        class="group relative flex-row-c-c border-default-2 card-default shadow-sm transition-shadow hover:shadow"
        :element-loading-spinner="defaultLoadingIcon"
        element-loading-background="transparent"
        @contextmenu="onContextFileMenu($event, img.key, i, OssFileType.IMAGE)"
      >
        <div title="撤销图片" class="absolute right-2 top-2 z-5 h-6 w-6 card-default-br transition-opacity !rounded-full group-hover-op-80 hover-op-100 sm:op-0" @click.stop="emit('removeFile', OssFileType.IMAGE, img.key!, i)">
          <i i-solar:minus-circle-linear block h-full w-full />
        </div>
        <CardElImage
          preview-teleported
          loading="lazy"
          :preview-src-list="[img.id || BaseUrlImg + img.key]"
          :src="img.id || BaseUrlImg + img.key"
          ctx-name="img"
          load-class="sky-loading block absolute top-0"
          class="card-default shadow-sm transition-shadow hover:shadow"
          :style="getImgSize(img.width, img.height)"
          :class="imgList.length > 1 ? '!w-6rem !h-6rem sm:(!w-8rem !h-8rem)' : '!max-h-80vw !max-w-50vh !sm:(max-h-18rem max-w-18rem)'"
          title="左键放大 | 右键删除"
        />
      </div>
    </div>
    <!-- 视频 -->
    <div
      v-if="videoList.length > 0"
      class="w-full cursor-pointer"
      style="padding: 0 0.5rem;margin:0;margin-bottom:0.4rem;display: flex;width:fit-content;justify-content: center;gap: 0.5rem;grid-gap:4;margin-left: auto;"
    >
      <div
        v-for="(video, i) in videoList"
        :key="i"
        title="点击播放[视频]"
        class="relative"
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
          <img
            error-class="i-solar:file-smile-line-duotone p-2.8"
            :src="video?.children?.[0]?.id"
            class="h-full max-h-16rem max-w-16rem min-h-8rem min-w-8rem w-full flex-row-c-c card-default shadow"
          >
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
      class="w-full cursor-pointer"
      style="padding: 0 0.5rem;margin:0;margin-bottom:0.4rem;display: flex;width:fit-content;justify-content: center;gap: 0.5rem;grid-gap:4;margin-left: auto;"
    >
      <div
        v-for="(file, i) in fileList"
        :key="i" class="flex-row-c-c border-default card-default bg-color p-3.2 shadow-sm transition-all sm:p-2.8 hover:shadow"
        @contextmenu="onContextFileMenu($event, file.key, i, OssFileType.FILE)"
      >
        <img :src="file?.file?.type ? (FILE_TYPE_ICON_MAP[file?.file?.type] || FILE_TYPE_ICON_DEFAULT) : FILE_TYPE_ICON_DEFAULT" class="mr-2 h-8 w-8">
        <div class="max-w-16rem min-w-10rem">
          <p class="truncate text-sm" :title="file?.file?.name">
            {{ (file?.file?.name || file.key)?.replace(/(.{10}).*(\..+)/, '$1****$2') }}
          </p>
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
    <!-- 回复 -->
    <div
      v-if="replyMsg?.fromUser"
      prop="body.replyMsgId"
      class="w-full text-sm"
    >
      <div class="w-full flex animate-[300ms_fade-in] items-center border-default-hover card-default-br p-2 shadow">
        <el-tag effect="dark" size="small" class="mr-2 shrink-0">
          回复
        </el-tag>
        <div class="max-w-4/5 truncate">
          {{ `${replyMsg?.fromUser?.nickName}: ${replyMsg ? resolveMsgReplyText(replyMsg as ChatMessageVO) : '未知'}` }}
        </div>
        <div class="i-solar:close-circle-bold ml-a h-6 w-6 btn-default text-dark op-80 transition-200 transition-color sm:(h-5 w-5) dark:text-light hover:text-[var(--el-color-danger)]" @click="emit('clearReply')" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.play-btn {
  background-color: #7e7e7e7a;
  box-shadow: rgba(0, 0, 0, 0.1) 0px 4px 12px;
  --at-apply: "text-white border-(2px solid #ffffff) bg-(gray-5 op-30) backdrop-blur-3px";
  .bg-blur {
    --at-apply: " bg-(gray-5 op-30) backdrop-blur";
  }
}
</style>
