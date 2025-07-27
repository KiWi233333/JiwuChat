<script lang="ts" setup>
import type { FileBodyMsgVO } from "~/composables/api/chat/message";
import { DownFileStatusIconMap, downloadFile, FILE_TYPE_ICON_DEFAULT, FILE_TYPE_ICON_MAP, formatFileSize } from "~/composables/api/res/file";

/**
 * 文件消息
 */
const props = defineProps<{
  data: ChatMessageVO<FileBodyMsgVO>
  prevMsg: Partial<ChatMessageVO<TextBodyMsgVO>>
  index: number
}>();
const { data } = toRefs(props);
// 具体
const body: Partial<FileBodyMsgVO> = props.data.message?.body || {};
const fileName = body?.fileName || `${body?.url?.split("/").pop() || "未知文件"}`;
const setting = useSettingStore();
function onDownloadFile(url: string, fileName: string) {
  const item = setting.fileDownloadMap?.[url];
  if (item && item.status === FileStatus.DOWNLOADING) {
    setting.showDownloadPanel = true;
    return;
  }
  if (item) { // 存在文件则打开
    setting.openFileByDefaultApp(item);
    return;
  }
  // 下载文件
  downloadFile(url, fileName, {
    mimeType: body?.mimeType,
  }, (val) => {
  });
  if (setting.isDesktop) {
    nextTick(() => {
      setting.showDownloadPanel = true;
    });
  }
}

// 导出
defineExpose({
  onDownloadFileAndOpen: () => onDownloadFile(BaseUrlFile + body.url, fileName),
});

const fileItem = computed(() => setting.fileDownloadMap[BaseUrlFile + body.url]);
// ctx-name="file"
const iconSrc = body.mimeType ? (FILE_TYPE_ICON_MAP[body.mimeType] || FILE_TYPE_ICON_DEFAULT) : FILE_TYPE_ICON_DEFAULT;
const ossFile = (data as any)._ossFile;
</script>

<template>
  <ChatMsgTemplate
    :prev-msg="prevMsg"
    :index="index"
    :data="data"
    v-bind="$attrs"
  >
    <template #body-pre>
      <!-- 文件 -->
      <div
        ctx-name="file"
        :title="fileName"
        class="file max-w-15rem min-w-12em w-fit flex cursor-pointer gap-2 border-default-hover card-default bg-color p-2 px-2.5 shadow-sm transition-all sm:max-w-16em !items-center hover:shadow-lg"
        @click="onDownloadFile(BaseUrlFile + body.url, fileName)"
      >
        <img ctx-name="file" :src="iconSrc" class="file-icon h-9 w-9 object-contain">
        <div ctx-name="file" class="flex-1">
          <p ctx-name="file" class="text-overflow-2 min-h-1.5em min-w-full text-sm leading-5">
            {{ fileName }}
          </p>
          <small v-if="body?.url && setting.fileDownloadMap[BaseUrlFile + body.url]?.status !== undefined" ctx-name="file" class="float-left mr-2 mt-2 text-xs op-60">
            <i :class="fileItem?.status !== undefined ? DownFileStatusIconMap[fileItem?.status] : ''" p-2 />&nbsp;{{ fileItem ? DownFileTextMap[fileItem?.status] : "" }}
          </small>
          <small ctx-name="file" class="float-right mt-2 text-xs op-60">
            {{ formatFileSize(body.size || 0) }}
          </small>
          <el-progress
            v-if="ossFile"
            striped
            :striped-flow="ossFile.status !== 'success'"
            :duration="10"
            class="mt-2 w-8em"
            :percentage="ossFile.percent" :stroke-width="4" :status="ossFile?.status as any || ''"
          />
        </div>
      </div>
    </template>
  </ChatMsgTemplate>
</template>

<style lang="scss" scoped>
@use './msg.scss';
</style>
