<script lang="ts" setup>
import type { FormInstance } from "element-plus";
import { getUpdateNewCode } from "~/composables/api/user/info";

const emits = defineEmits(["close"]);
const user = useUserStore();
const isLoading = ref<boolean>(false);
const phoneCodeStorage = ref<number>(0);
const formRef = ref();
// 表单
const form = reactive({
  newPhone: user.userInfo.phone || "",
  code: "",
});
const rules = reactive({
  newPhone: [
    { required: true, message: "手机号不能为空！", trigger: "blur" },
    {
      pattern: /^1(3\d|4[57]|5[0-35-9]|6[56]|7[013678]|8\d|9[89])\d{8}$/g,
      message: "手机号格式不正确！",
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
 * 修改手机号
 */
async function onUpdatePhone(formEl: FormInstance | undefined) {
  if (!formEl || isLoading.value)
    return;
  await formEl.validate((valid) => {
    if (valid) {
      isLoading.value = true;
      ElMessageBox.confirm("是否确认修改?", "修改手机号", {
        confirmButtonText: "确认修改",
        lockScroll: false,
        cancelButtonText: "取消",
      }).then((action: string) => {
        if (action === "confirm")
          toUpdate();
      });
    }
  });
}
async function toUpdate() {
  const res = await updatePhone({ newPhone: form.newPhone, code: form.code }, user.getToken);
  if (res.code === StatusCode.SUCCESS) {
    // 修改成功
    ElMessage.success({
      message: "修改手机号成功！",
      duration: 2000,
    });
    user.userInfo.phone = form.newPhone;
    emits("close");
    setTimeout(() => {
      isLoading.value = false;
    }, 300);
  }
}
// 获取验证码
let timer: NodeJS.Timeout | string | number | undefined;
async function getPhoneCode() {
  if (phoneCodeStorage.value > 0)
    return;
  if (!form.newPhone)
    return ElMessage.warning("新手机号不能为空");
  if (!checkPhone(form.newPhone))
    return ElMessage.error("新手机号格式不正确!");

  if (user.userInfo.phone === form.newPhone.trim())
    return ElMessage.error("新旧手机号不能一致!");

  // 1、请求
  const { code } = await getUpdateNewCode(form.newPhone, DeviceType.PHONE, user.getToken);
  if (code === StatusCode.SUCCESS) {
    phoneCodeStorage.value = 60;
    ElMessage.success("发送成功，请查看手机短信！");
    timer = setTimeout(() => {
      phoneCodeStorage.value--;
      clearInterval(timer);
      timer = undefined;
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
    class="block w-95vw overflow-hidden border-default-2 card-default rounded-2 p-1.2em backdrop-blur-5px sm:w-360px"
    @submit.prevent="() => {}"
  >
    <div mb-4 mt-2 text-center text-lg font-bold tracking-0.2em>
      {{ user.userInfo.isPhoneVerified ? "更换" : "绑定" }}手机号
    </div>
    <el-form-item label="" prop="newPhone" class="animated">
      <el-input
        v-model.trim="form.newPhone"
        :prefix-icon="ElIconIphone"
        size="default"
        clearable
        type="tel"
        placeholder="请输入新手机号"
        @keyup.enter="getPhoneCode"
      >
        <template #append>
          <el-button
            type="primary"
            :disabled="phoneCodeStorage > 0"
            @click="getPhoneCode"
          >
            {{ phoneCodeStorage > 0 ? `${phoneCodeStorage}s后重新发送` : "获取验证码" }}
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
      style="padding: 1.2em 0;"
      class="submit w-full"
      @keyup.enter="onUpdatePhone(formRef)"
      @click="onUpdatePhone(formRef)"
    >
      立即{{ user.userInfo.isPhoneVerified ? "更换" : "绑定" }}
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
  padding: 0 1em;
}
</style>

<style scoped lang="scss">
.dark :deep(.el-form) {
  background-color: #161616d8;
}
</style>
