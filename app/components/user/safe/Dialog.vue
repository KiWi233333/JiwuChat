<script lang="ts" setup>
const props = defineProps<{
  modelValue: {
    showUpdatePwd: boolean
    showUpdateEmail: boolean
    showUpdatePhone: boolean
  }
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: {
    showUpdatePwd: boolean
    showUpdateEmail: boolean
    showUpdatePhone: boolean
  }): void
}>();

function closePwd() {
  emit("update:modelValue", {
    ...props.modelValue,
    showUpdatePwd: false,
  });
}

function closeEmail() {
  emit("update:modelValue", {
    ...props.modelValue,
    showUpdateEmail: false,
  });
}

function closePhone() {
  emit("update:modelValue", {
    ...props.modelValue,
    showUpdatePhone: false,
  });
}
</script>

<template>
  <!-- 密码修改弹窗 -->
  <CommonPopup
    :model-value="modelValue.showUpdatePwd"
    :show-close="true"
    :close-on-click-modal="true"
    :destroy-on-close="true"
    content-class="p-4 sm:(!p-0 !border-0 !bg-transparent !shadow-none)"
    @update:model-value="(val) => !val && closePwd()"
    @cancel="closePwd"
  >
    <UserSafePwdForm @close="closePwd" />
  </CommonPopup>

  <!-- 邮箱修改弹窗 -->
  <CommonPopup
    :model-value="modelValue.showUpdateEmail"
    :show-close="true"
    :close-on-click-modal="true"
    :destroy-on-close="true"
    content-class="p-4 sm:(!p-0 !border-0 !bg-transparent !shadow-none)"
    @update:model-value="(val) => !val && closeEmail()"
    @cancel="closeEmail"
  >
    <UserSafeEmailForm @close="closeEmail" />
  </CommonPopup>

  <!-- 手机号修改弹窗 -->
  <CommonPopup
    :model-value="modelValue.showUpdatePhone"
    :show-close="true"
    :close-on-click-modal="true"
    content-class="p-4 sm:(!p-0 !border-0 !bg-transparent !shadow-none)"
    :destroy-on-close="true"
    @update:model-value="(val) => !val && closePhone()"
    @cancel="closePhone"
  >
    <UserSafePhoneForm @close="closePhone" />
  </CommonPopup>
</template>

<style scoped lang="scss"></style>
