<script lang="ts" setup>
import { CardLoading } from "#components";

const {
  status,
  ossFile,
} = defineProps<{
  status: MessageSendStatus
  msgId: any
  ossFile?: OssFile
}>();
const chat = useChatStore();
const titleMap: Record<MessageSendStatus, { title: string, className?: string, closeName?: string, iconComponent?: string }> = {
  [MessageSendStatus.ERROR]: {
    title: "发送失败，点击重试",
    className: "i-solar:refresh-linear  bg-theme-danger hover:rotate-180 btn-danger",
    closeName: "i-solar:trash-bin-minimalistic-2-line-duotone  btn-danger cursor-pointer",
  },
  [MessageSendStatus.PENDING]: {
    title: "待发送",
    className: "i-solar:clock-circle-line-duotone op-60",
  },
  [MessageSendStatus.SENDING]: {
    title: "发送中...",
    className: "animate-spin op-40",
    iconComponent: CardLoading,
  },
  [MessageSendStatus.SUCCESS]: {
    title: "",
  },
};
const types = computed(() => titleMap[status as MessageSendStatus]);
function confirmDeleteMessage(event: MouseEvent, msgId: any) {
  ElMessageBox.confirm(
    "确定删除此消息吗？",
    "删除消息",
    {
      confirmButtonText: "删除",
      cancelButtonText: "取消",
      type: "warning",
      center: true,
    },
  ).then(() => {
    // 停止上传
    ossFile?.subscribe?.unsubscribe?.();
    // 确认删除消息
    chat.deleteUnSendMessage(msgId);
  }).catch(() => {
    // 用户取消操作
  });
}
const OssStatusMap: Record<string, string> = {
  "": "上传中...",
  "warning": "上传错误！",
  "exception": "上传失败，请重试！",
};
</script>

<template>
  <!-- 上传状态 -->
  <el-progress
    v-if="ossFile && !ossFile?.status"
    type="circle"
    :percentage="ossFile?.percent || 0"
    :show-text="false"
    :title="OssStatusMap[ossFile.status || '']"
    class="upload-icon !flex-row-c-c"
    :stroke-width="3"
    :status="ossFile?.status || ''"
    :width="16"
  />
  <!-- 发送状态 -->
  <component
    :is="types?.iconComponent || 'i'"
    v-else-if="status"
    :title="types?.title"
    class="my-a inline-block h-4.5 w-4.5"
    :class="types?.className"
    @click="chat.retryMessage(msgId)"
  />
  <i
    v-if="status && types?.closeName"
    :title="types?.closeName"
    class="my-a inline-block h-4.5 w-4.5"
    :class="types?.closeName"
    @click="confirmDeleteMessage($event, msgId)"
  />
</template>

<style lang="scss" scoped>
.upload-icon {
  :deep(.el-progress-circle__track) {
    stroke: rgba(128, 128, 128, 0.178);
  }
}
</style>
