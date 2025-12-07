<script setup lang="ts">
import type { OAuthCallbackVO } from "~/composables/api/user/oauth";
import { DeviceType, getLoginCodeByType } from "~/composables/api/user";
import { oauthLink, oauthRegister } from "~/composables/api/user/oauth";

const props = defineProps<{
  oauthInfo: OAuthCallbackVO
  platformCode: OAuthPlatformCode
  platformName: string
  platformIcon: string
}>();

const emit = defineEmits<{
  (e: "success", data: any, type: "register" | "link"): void
  (e: "expired"): void
  (e: "back"): void
}>();

// Tab 选项
type BindTab = "register" | "link";
const activeBindTab = ref<BindTab>("register");
const tabOptions = [
  { label: "新用户注册", value: "register" },
  { label: "已有账号绑定", value: "link" },
];

// 注册表单
const registerFormRef = ref();
const registerForm = ref({
  username: "",
  nickname: props.oauthInfo.nickname || "",
});

// 验证用户名唯一性
function validateUsernameUnique(rule: any, value: any, callback: any) {
  if (!value) {
    callback();
    return;
  }

  checkUsernameExists(value)
    .then((res) => {
      if (res.code === StatusCode.SUCCESS) {
        callback();
      }
      else {
        callback(new Error("该用户名已被使用！"));
      }
    })
    .catch(() => {
      callback(new Error("验证失败"));
    });
}

const registerRules = {
  username: [
    { min: 6, max: 30, message: "用户名长度在6-30个字符", trigger: "blur" },
    // 验证用户名
    { pattern: /^\w+$/, message: "用户名只能包含字母、数字和下划线", trigger: "blur" },
    { validator: validateUsernameUnique, trigger: "blur" },
  ],
  nickname: [
    { max: 20, message: "昵称最多20个字符", trigger: "blur" },
  ],
};

// 绑定表单
type LinkMode = "code" | "password";
const linkMode = ref<LinkMode>("code"); // 默认验证码登录
const linkFormRef = ref();
const linkForm = ref({
  account: "",
  credential: "",
});

const linkRules = reactive({
  account: [
    { required: true, message: "请输入账号", trigger: "blur" },
  ],
  credential: [
    { required: true, message: "请输入验证码", trigger: "blur" },
  ],
});

// 计算账号类型图标
const getLoginCodeIcon = computed(() => {
  const account = linkForm.value.account;
  if (checkEmail(account)) {
    return ElIconPostcard;
  }
  else if (checkPhone(account)) {
    return ElIconPhone;
  }
  else {
    return ElIconUser;
  }
});

// 验证码倒计时
const codeCountdown = ref(0);
let codeTimer: ReturnType<typeof setInterval> | null = null;

// 表单提交状态
const isSubmitting = ref(false);

// 切换登录模式
function toggleLinkMode() {
  linkMode.value = linkMode.value === "code" ? "password" : "code";
  linkForm.value.credential = ""; // 清空验证码
  // 清除验证码校验状态等
  if (linkFormRef.value) {
    linkFormRef.value.clearValidate();
  }
}

// 获取验证码
async function getCode() {
  if (codeCountdown.value > 0 || !linkForm.value.account)
    return;

  const account = linkForm.value.account;
  let deviceType: DeviceType;

  if (checkEmail(account)) {
    deviceType = DeviceType.EMAIL;
  }
  else if (checkPhone(account)) {
    deviceType = DeviceType.PHONE;
  }
  else {
    ElMessage.error("请输入正确的手机号或邮箱");
    return;
  }

  try {
    const res = await getLoginCodeByType(account, deviceType);
    if (res.code === StatusCode.SUCCESS) {
      ElMessage.success("验证码已发送");
      codeCountdown.value = 60;
      codeTimer = setInterval(() => {
        codeCountdown.value--;
        if (codeCountdown.value <= 0) {
          if (codeTimer)
            clearInterval(codeTimer);
        }
      }, 1000);
    }
  }
  catch (error: any) {
    ElMessage.error(error?.message || "发送验证码失败");
  }
}

// OAuth 注册
async function handleRegister() {
  if (!props.oauthInfo?.oauthKey) {
    emit("expired");
    return;
  }

  // 触发表单验证
  if (!registerFormRef.value) {
    return;
  }

  try {
    await registerFormRef.value.validate();
  }
  catch (error) {
    // 表单验证失败，不继续提交
    return;
  }

  isSubmitting.value = true;
  try {
    const res = await oauthRegister({
      oauthKey: props.oauthInfo.oauthKey,
      username: registerForm.value.username || undefined,
      nickname: registerForm.value.nickname || undefined,
    });

    if (res.code === StatusCode.SUCCESS && res.data) {
      emit("success", res.data, "register");
    }
    else if (res.code === StatusCode.OAUTH_CREDENTIAL_EXPIRED) {
      emit("expired");
    }
    else {
      ElMessage.error(res.message || "注册失败，请重试");
    }
  }
  catch (error: any) {
    console.error("OAuth 注册失败:", error);
    ElMessage.error(error?.message || "注册失败，请重试");
  }
  finally {
    isSubmitting.value = false;
  }
}

// OAuth 绑定已有账号
async function handleLink() {
  if (!props.oauthInfo?.oauthKey) {
    emit("expired");
    return;
  }

  // 触发表单验证
  if (!linkFormRef.value) {
    return;
  }

  try {
    await linkFormRef.value.validate();
  }
  catch (error) {
    // 表单验证失败，不继续提交
    return;
  }

  // 推断登录类型
  const account = linkForm.value.account;
  let loginType: "email" | "phone" | "username";

  if (checkEmail(account)) {
    loginType = "email";
  }
  else if (checkPhone(account)) {
    loginType = "phone";
  }
  else {
    loginType = "username";
  }

  // 验证码模式下不支持用户名
  if (linkMode.value === "code" && loginType === "username") {
    ElMessage.warning("验证码登录仅支持手机号或邮箱");
    return;
  }

  isSubmitting.value = true;
  try {
    const res = await oauthLink({
      oauthKey: props.oauthInfo.oauthKey,
      loginType,
      account,
      credential: linkForm.value.credential,
    });

    if (res.code === StatusCode.SUCCESS && res.data) {
      emit("success", res.data, "link");
    }
    else if (res.code === StatusCode.OAUTH_CREDENTIAL_EXPIRED) {
      emit("expired");
    }
    else if (res.code === StatusCode.OAUTH_ACCOUNT_ALREADY_BOUND) {
      ElMessage.error(`该 ${props.platformName} 账号已被其他用户绑定`);
    }
  }
  catch (error: any) {
    console.error("OAuth 绑定失败:", error);
    ElMessage.error(error?.message || "绑定失败，请重试");
  }
  finally {
    isSubmitting.value = false;
  }
}

onBeforeUnmount(() => {
  if (codeTimer)
    clearInterval(codeTimer);
});
</script>

<template>
  <div class="bind-option-form flex flex-col px-6 py-4">
    <!-- 第三方账号信息 -->
    <div class="header flex-row-c-c flex-col pb-6">
      <div class="relative">
        <CardAvatar
          :src="(oauthInfo?.avatar as string) || ''"
          class="avatar h-16 w-16 border-default rounded-full shadow-sm"
        />
        <div class="absolute bottom-1 right-0 h-5 w-5 flex-row-c-c rounded-full bg-color shadow-sm">
          <!-- 床上 -->
          <CardElImage
            :src="getOAuthPlatformIcon(platformCode)"
            alt="icon"
            error-root-class="hidden"
          />
        </div>
      </div>
      <div class="mt-3 text-center">
        <p class="text-sm text-color font-medium">
          {{ oauthInfo?.nickname || platformName }}
        </p>
        <p class="mt-0.5 text-mini op-60">
          正在绑定{{ platformName }}账号
        </p>
      </div>
    </div>

    <!-- Tab 切换 -->
    <el-segmented
      v-model="activeBindTab"
      class="toggle-tab mb-6 w-full card-bg-color-2"
      :options="tabOptions"
      block
    />

    <!-- 注册表单 -->
    <el-form
      v-if="activeBindTab === 'register'"
      key="register"
      ref="registerFormRef"
      :model="registerForm"
      :rules="registerRules"
      hide-required-asterisk
      class="form"
      size="large"
    >
      <el-form-item prop="username">
        <el-input
          v-model.trim="registerForm.username"
          :prefix-icon="ElIconUser"
          placeholder="设置用户名（可选）"
          clearable
        />
      </el-form-item>
      <el-form-item prop="nickname" class="pb-4">
        <el-input
          v-model.trim="registerForm.nickname"
          :prefix-icon="ElIconEditPen"
          placeholder="设置昵称（可选）"
          clearable
        />
      </el-form-item>
      <el-button
        type="primary"
        class="submit mt-2 w-full"
        :loading="isSubmitting"
        @click="handleRegister"
      >
        立即注册并绑定
      </el-button>
    </el-form>

    <!-- 绑定已有账号表单 -->
    <el-form
      v-else
      key="link"
      ref="linkFormRef"
      :model="linkForm"
      :rules="linkRules"
      hide-required-asterisk
      class="form"
      size="large"
    >
      <!-- 账号输入 -->
      <el-form-item prop="account">
        <el-input
          v-model.trim="linkForm.account"
          :prefix-icon="getLoginCodeIcon"
          :placeholder="linkMode === 'code' ? '手机号 / 邮箱' : '手机号 / 邮箱 / 用户名'"
          clearable
        />
      </el-form-item>

      <!-- 密码/验证码 -->
      <el-form-item prop="credential" class="code">
        <div v-if="linkMode === 'password'" class="w-full">
          <el-input
            v-model.trim="linkForm.credential"
            :prefix-icon="ElIconLock"
            type="password"
            placeholder="请输入密码"
            show-password
            @keyup.enter="handleLink"
          />
        </div>
        <div v-else class="w-full">
          <el-input
            v-model.trim="linkForm.credential"
            :prefix-icon="ElIconChatDotSquare"
            placeholder="6位验证码"
            @keyup.enter="handleLink"
          >
            <template #append>
              <span
                class="code-btn min-w-16 cursor-pointer select-none text-center text-theme-primary transition-200 hover:op-80"
                :class="{ 'op-50 cursor-not-allowed': codeCountdown > 0 || !linkForm.account }"
                @click="getCode"
              >
                {{ codeCountdown > 0 ? `${codeCountdown}s` : '获取验证码' }}
              </span>
            </template>
          </el-input>
        </div>
      </el-form-item>

      <!-- 切换登录方式 -->
      <div class="mb-4 flex justify-end -mt-2">
        <span
          class="cursor-pointer pr-2 text-xs text-theme-primary op-80 transition-200 hover:underline hover:op-100"
          @click="toggleLinkMode"
        >
          {{ linkMode === 'code' ? '使用密码登录' : '使用验证码登录' }}
        </span>
      </div>

      <el-button
        type="primary"
        class="submit w-full"
        :loading="isSubmitting"
        @click="handleLink"
      >
        绑定并登录
      </el-button>
    </el-form>

    <!-- 底部链接 -->
    <div class="mt-4 text-center">
      <span class="cursor-pointer text-xs text-dark-50 transition-200 dark:text-light-50 hover:text-theme-primary" @click="$emit('back')">
        返回登录页
      </span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.bind-option-form {
  .form {
    :deep(.el-input__wrapper) {
      background-color: var(--el-fill-color-light);
      box-shadow: none;
      outline: none;
      border: 1px solid transparent;
      transition: all 0.3s;
      border-radius: 0.5rem;
      padding: 0.25rem 0.75rem;

      &:hover:not(.is-focus) {
        background-color: var(--el-fill-color);
      }
    }
    :deep(.el-form-item) {
      margin-bottom: 1.2rem;
    }
    .code {
      :deep(.el-input__wrapper) {
        border-radius: 0.5rem 0 0 0.5rem !important;
      }
      :deep(.el-input-group__append) {
        --at-apply: "border-default-l";
        box-shadow: none;
        border: none;
        padding: 0 0.625rem;
      }
    }
  }

  .submit {
    height: 2.5rem;
    font-size: 0.9375rem;
    letter-spacing: 0.0625rem;
  }

  // Tab 切换样式
  :deep(.toggle-tab.el-segmented) {
    padding: 0.25rem;
    font-size: 0.8rem;
    height: 2.4rem;

    .el-segmented__item {
      transition: all 0.3s;
    }
  }
}
</style>

