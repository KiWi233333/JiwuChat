<script lang="ts" setup>
/**
 * 添加好友弹窗
 */
const props = defineProps<{
  show: boolean | undefined | null
  userId?: string
}>();
const emit = defineEmits<{
  (e: "update:show", value: boolean | undefined | null): void
  (e: "submit", userId: string): void
}>();
const isShowApply = computed({
  get: () => props.show !== undefined && props.show === true,
  set: value => emit("update:show", value),
});


const user = useUserStore();
// 添加好友
const applyFormRef = useTemplateRef("applyFormRef");
const applyForm = ref<ChatUserFriendApplyDTO>({
  msg: `我是 ${user?.userInfo?.nickname}`,
  targetUid: "",
});
// 好友申请
async function addFrendApplyById() {
  applyFormRef?.value?.validate(async (valid: boolean) => {
    if (!valid)
      return;
    if (!props.userId) {
      ElMessage.warning("请先选择好友！");
      return;
    }
    // 请求
    const res = await addFriendApply({
      ...applyForm.value,
      targetUid: props.userId,
    }, user.getToken);
    isShowApply.value = false;
    if (res.code !== StatusCode.SUCCESS)
      return;
    applyForm.value = {
      msg: `我是 ${user?.userInfo?.nickname}`,
      targetUid: "",
    };
    emit("submit", props.userId);
    ElMessage.success("好友申请已发送！");
  });
}
</script>

<template>
  <CommonPopup
    v-model="isShowApply"
    title="好友申请"
    center
    :duration="360"
  >
    <el-form ref="applyFormRef" :model="applyForm">
      <el-form-item
        label=""
        prop="msg"
        :rules="[{
                   min: 1,
                   max: 50,
                   trigger: ['blur', 'change'],
                   message: '申请理由1-50字符！',
                 },
                 {
                   required: true,
                   trigger: ['blur'],
                   message: '申请理由不能为空！',
                 }]"
        class="w-20rem"
        style="margin: 1em 0 1.5em 0;"
      >
        <el-input
          v-model="applyForm.msg"
          class="text-input"
          type="textarea"
          :rows="4"
          placeholder="发送一条有趣的问候语吧~"
          @keyup.enter="addFrendApplyById"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="-footer">
        <CommonElButton
          style="transition: .2s; width: 7em;letter-spacing: 1px;"
          @click="isShowApply = false"
        >
          取消
        </CommonElButton>
        <CommonElButton
          type="primary"
          style="transition: .2s; width: 7em;letter-spacing: 1px;"
          @click="addFrendApplyById"
        >
          发起申请
        </CommonElButton>
      </span>
    </template>
  </CommonPopup>
</template>

<style lang="scss" scoped>
.text-input {
  :deep(.el-textarea__inner) {
    resize: none;
    box-shadow: none !important;
    background-color: transparent;
    caret-color: var(--el-color-primary);
    --at-apply: "!shadow-none !outline-none bg-light-500 dark:bg-dark-7";
  }
}
</style>


