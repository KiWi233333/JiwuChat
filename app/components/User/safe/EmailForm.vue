<script lang="ts" setup>
import type { FormInstance } from "element-plus";
import { getUpdateNewCode } from "~/composables/api/user/info";

const emits = defineEmits(["close"]);
const user = useUserStore();
const isLoading = ref<boolean>(false);
const emailCodeStorage = ref<number>(0);
const formRef = ref();
// 表单
const form = reactive({
  newEmail: user.userInfo.email || "",
  code: "",
});
const rules = reactive({
  newEmail: [
    { required: true, message: "邮箱不能为空！", trigger: "blur" },
    {
      pattern: /^[\w.%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/gi,
      message: "邮箱格式不正确！",
      trigger: "change",
    },
  ],
  code: [
    {
      required: true,
      message: "验证码6位组成！",
      trigger: "change",
    },
  ],
});

/**
 * 修改邮箱
 */
async function onUpdatePhone(formEl: FormInstance | undefined) {
  if (!formEl || isLoading.value)
    return;
  await formEl.validate((valid) => {
    if (valid) {
      isLoading.value = true;
      ElMessageBox.confirm("是否确认修改?", "修改邮箱", {
        confirmButtonText: "确认修改",
        cancelButtonText: "取消",
        lockScroll: false,
      }).then((action: string) => {
        if (action === "confirm")
          toUpdate();
      });
    }
  });
}
async function toUpdate() {
  const res = await updateEmail({ newEmail: form.newEmail, code: form.code }, user.getToken);
  if (res.code === StatusCode.SUCCESS) {
    // 修改成功
    ElMessage.success({
      message: "修改邮箱成功！",
      duration: 2000,
    });
    user.userInfo.email = form.newEmail;
    emits("close");
    setTimeout(() => {
      isLoading.value = false;
    }, 300);
  }
}
// 获取验证码
let timer: NodeJS.Timeout | string | number | undefined;
async function getEmailCode() {
  if (emailCodeStorage.value > 0)
    return;
  if (!form.newEmail)
    return ElMessage.warning("新邮箱不能为空");
  if (!checkEmail(form.newEmail))
    return ElMessage.error("新邮箱格式不正确!");

  if (user.userInfo.email === form.newEmail.trim())
    return ElMessage.error("新旧邮箱不能一致!");

  // 1、请求
  const { code } = await getUpdateNewCode(form.newEmail, DeviceType.EMAIL, user.getToken);
  if (code === StatusCode.SUCCESS) {
    emailCodeStorage.value = 60;
    ElMessage.success("发送验证码成功！");
    timer = setInterval(() => {
      emailCodeStorage.value--;
      if (timer)
        clearInterval(timer);
    }, 1000);
  }
}
</script>

<template>
  <el-form
    ref="formRef"
    v-loading="isLoading"
    label-position="top"
    hide-required-asterisk
    :rules="rules"
    :model="form"
    class="block h-fit w-95vw overflow-hidden border-default-2 card-default rounded-2 p-6 backdrop-blur-5px sm:w-360px"
  >
    <div mb-4 mt-2 text-center text-lg font-bold tracking-0.2em>
      {{ user.userInfo.isEmailVerified ? "更换" : "绑定" }}邮箱
    </div>
    <el-form-item type="newEmail" label="" prop="newEmail" class="animated">
      <el-input
        v-model.trim="form.newEmail"
        :prefix-icon="ElIconIphone"
        size="default"
        clearable
        type="email"
        placeholder="请输入新邮箱"
        @keyup.enter="getEmailCode"
      >
        <template #append>
          <el-button
            type="primary"
            :disabled="emailCodeStorage > 0"
            @click="getEmailCode"
          >
            {{ emailCodeStorage > 0 ? `${emailCodeStorage}s后重新发送` : "获取验证码" }}
          </el-button>
        </template>
      </el-input>
    </el-form-item>

    <el-form-item type="number" label="" prop="code" class="animated">
      <el-input
        v-model.trim="form.code"
        :prefix-icon="ElIconMessage"
        size="default"
        type="number"
        placeholder="请输入验证码"
        @keyup.enter="onUpdatePhone(formRef)"
      />
    </el-form-item>

    <el-button
      type="primary"
      class="submit w-full"
      style="padding: 1.2em 0;"
      @keyup.enter="onUpdatePhone(formRef)"
      @click="onUpdatePhone(formRef)"
    >
      立即{{ user.userInfo.isEmailVerified ? "更换" : "绑定" }}
    </el-button>
  </el-form>
</template>

<style scoped lang="scss">
:deep(.el-input__wrapper) {
  padding: 0.3em 1em;
}

:deep(.el-form-item) {
  --at-apply: "mb-5";

  .el-form-item__error {
    padding-top: 0;
  }
}

:deep(.el-button) {
  padding: 0.3em 1em;
}
</style>

<style scoped lang="scss">
.dark :deep(.el-form) {
  background-color: #161616d8;
}
</style>
