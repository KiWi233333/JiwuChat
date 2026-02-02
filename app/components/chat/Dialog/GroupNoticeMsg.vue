<script lang="ts" setup>
/**
 * 群通知弹窗
 */
const props = defineProps<{
  show: boolean | undefined | null
}>();
const emit = defineEmits<{
  (e: "update:show", value: boolean | undefined | null): void
  (e: "submit", value: ChatMessageDTO): void
}>();
const isShow = computed({
  get: () => props.show !== undefined && props.show === true,
  set: value => emit("update:show", value),
});
// 消息群通知
const chat = useChatStore();
const setting = useSettingStore();
const applyFormRef = ref();
const applyForm = ref<ChatMessageDTO>({
  roomId: chat.theRoomId!,
  msgType: MessageType.GROUP_NOTICE, // 系统消息
  content: "",
  body: {
    noticeAll: isTrue.TRUE, // 是否群发
    imgList: [], // 图片列表
    replyMsgId: undefined, // 回复消息ID
  },
});
// 群通知
async function addMsg() {
  applyFormRef?.value?.validate(async (valid: boolean) => {
    if (!valid)
      return;
    // 请求
    emit("submit", applyForm.value);
    applyForm.value.content = "";
    applyFormRef?.value?.resetFields();
    isShow.value = false;
  });
}
</script>

<template>
  <CommonPopup
    v-model="isShow"
    :duration="300"
    destroy-on-close
    content-class="rounded-2 p-4 sm:w-fit border-default-2 dialog-bg-color"
  >
    <template #title>
      <div class="flex-row-c-c">
        <i i-carbon:bullhorn p-2 />
        <span ml-2>群通知</span>
      </div>
    </template>
    <el-form ref="applyFormRef" :model="applyForm">
      <el-form-item
        label=""
        style="margin: 1rem 0 0 0;"
        prop="content"
        :rules="[{
                   min: 1,
                   max: 500,
                   message: '群通知不能超过500字！',
                 },
                 {
                   required: true,
                   message: '内容不能为空！',
                 }]"
        class="w-full sm:max-w-80vw"
      >
        <el-input
          v-model="applyForm.content"
          class="text-input"
          autofocus type="textarea" :rows="4"
          placeholder="请输入群通知内容"
        />
      </el-form-item>
      <el-form-item
        label=""
        style="margin: 0;"
        prop="body.noticeAll"
        class="h-12 flex items-center"
      >
        <!-- 是否群发 -->
        <el-checkbox
          v-model="applyForm.body.noticeAll"
          style="--el-checkbox-height: 1rem;"
          :true-value="1"
          :false-value="0"
        >
          群发
        </el-checkbox>
        <div v-if="chat.replyMsg?.fromUser" class="ml-2 flex flex-1 items-center bg-color p-1 shadow-sm card-rounded-df">
          <el-tag effect="dark" size="small" class="mr-2 shrink-0">
            回复
          </el-tag>
          <div class="max-w-8em flex-1 truncate text-small">
            {{ `${chat.replyMsg?.fromUser?.nickName}: ${chat.replyMsg ? resolveMsgReplyText(chat.replyMsg as ChatMessageVO) : '未知'}` }}
          </div>
          <div class="i-solar:close-circle-bold ml-a h-6 w-6 btn-default text-dark op-80 transition-200 transition-color sm:(h-5 w-5) dark:text-light hover:text-theme-danger" @click="chat.setReplyMsg({})" />
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="flex-row-c-c">
        <el-button
          class="mr-4 mt-2 w-1/2"
          :size="setting.isMobileSize ? 'large' : 'default'"
          @click="isShow = false"
        >
          取消
        </el-button>
        <el-button
          class="mt-2 w-1/2"
          :size="setting.isMobileSize ? 'large' : 'default'"
          type="primary" @click="addMsg"
        >
          发送
        </el-button>
      </div>
    </template>
  </CommonPopup>
</template>

<style lang="scss" scoped>
.text-input {
  :deep(.el-textarea__inner) {
    resize: none;
    caret-color: var(--el-color-primary);
    --at-apply: "!shadow-none !outline-none bg-light-500 dark:bg-dark-7";
  }
}
</style>

