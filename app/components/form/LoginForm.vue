<script lang="ts" setup>
import type { OAuthCallbackVO, OAuthPlatformVO } from "~/composables/api/user/oauth";
import type { OAuthCallbackPayload } from "~/composables/hooks/oauth/useDeepLink";
import { CardLoading } from "#components";
import {
  DeviceType,
  getLoginCodeByType,
  toLoginByEmail,
  toLoginByPhone,
  toLoginByPwd,
} from "~/composables/api/user";
import { getOAuthPlatforms, OAuthPlatformCode } from "~/composables/api/user/oauth";
import { useOAuthDeepLink } from "~/composables/hooks/oauth/useDeepLink";
import { useOAuthFlow } from "~/composables/hooks/oauth/useOAuthFlow";
import { appName } from "~/constants";
import { LoginType } from "~/types/user/index.js";

const userStore = useUserStore();
const loginType = useLocalStorage<LoginType>("loginType", LoginType.EMAIL);

const {
  historyAccounts,
  addHistoryAccount,
  removeHistoryAccount,
} = useHistoryAccount();

const isLoading = ref(false);
const autoLogin = ref(true);
const formRef = ref();

// 表单数据
const userForm = ref({
  username: "",
  password: "",
  code: "",
  email: "",
  phone: "",
});

// 验证规则
const rules = reactive({
  username: [
    { required: true, message: "用户名不能为空！", trigger: "change" },
    { min: 6, max: 30, message: "长度在6-30个字符！", trigger: "blur" },
  ],
  password: [
    { required: true, message: "密码不能为空！", trigger: "change" },
    { min: 6, max: 20, message: "密码长度6-20位！", trigger: "blur" },
  ],
  code: [
    { required: true, message: "验证码6位组成！", trigger: "change" },
  ],
  email: [
    { required: true, message: "邮箱不能为空！", trigger: "blur" },
    {
      pattern: /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\])|(([a-z\-0-9]+\.)+[a-z]{2,}))$/i,
      message: "邮箱格式不正确！",
      trigger: "blur",
    },
  ],
  phone: [
    { required: true, message: "手机号不能为空！", trigger: "blur" },
    {
      pattern: /^(?:(?:\+|00)86)?1[3-9]\d{9}$/,
      message: "手机号格式不正确！",
      trigger: "change",
    },
  ],
});


// 验证码配置类型
interface CodeConfigItem {
  timer: Ref<number>
  storage: Ref<number>
  getValue: () => string
  validate: (value: string) => boolean
  deviceType: DeviceType
  successMsg: string
  errorMsg: string
  duration: number
}

// 验证码配置（统一管理邮箱和手机验证码）
const codeConfig: Record<LoginType, CodeConfigItem> = {
  [LoginType.EMAIL]: {
    timer: ref(-1),
    storage: ref(0),
    getValue: () => userForm.value.email,
    validate: checkEmail,
    deviceType: DeviceType.EMAIL,
    successMsg: "验证码已发送至您的邮箱，5分钟有效！",
    errorMsg: "邮箱格式不正确！",
    duration: 3000,
  },
  [LoginType.PHONE]: {
    timer: ref(-1),
    storage: ref(0),
    getValue: () => userForm.value.phone,
    validate: checkPhone,
    deviceType: DeviceType.PHONE,
    successMsg: "验证码已发送",
    errorMsg: "手机号格式不正确！",
    duration: 5000,
  },
  [LoginType.PWD]: {
    timer: ref(-1),
    storage: ref(0),
    getValue: () => "",
    validate: () => false,
    deviceType: DeviceType.EMAIL,
    successMsg: "",
    errorMsg: "",
    duration: 0,
  },
};

// 获取验证码（简化后的统一逻辑）
async function getLoginCode(type: LoginType) {
  const config = codeConfig[type];
  if (!config || type === LoginType.PWD)
    return;

  const value = config.getValue().trim();
  if (!value || config.storage.value > 0)
    return;

  if (!config.validate(value)) {
    ElMessage.error(config.errorMsg);
    return;
  }

  try {
    isLoading.value = true;
    const data = await getLoginCodeByType(value, config.deviceType);

    if (data.code === StatusCode.SUCCESS) {
      startTimer(config.timer, config.storage, 60);
      ElMessage.success({
        message: data.message || config.successMsg,
        duration: config.duration,
      });
    }
    else {
      ElMessage.closeAll("error");
      ElMessage.error(data.message || "发送验证码失败，请稍后重试！");
    }
  }
  catch (error: any) {
    console.error("获取验证码失败:", error);
    ElMessage.closeAll("error");
    ElMessage.error(error?.message || error?.data?.message || "网络异常，请检查网络连接后重试！");
  }
  finally {
    isLoading.value = false;
  }
}

// 启动倒计时（简化定时器逻辑）
function startTimer(timer: Ref<number | NodeJS.Timeout>, storage: Ref<number>, seconds: number) {
  storage.value = seconds;
  timer.value = setInterval(() => {
    storage.value--;
    if (storage.value <= 0) {
      clearInterval(timer.value);
      timer.value = -1;
      storage.value = 0;
    }
  }, 1000);
}

// 清理所有定时器
function clearAllTimers() {
  Object.values(codeConfig).forEach(({ timer }) => {
    if (timer.value !== -1) {
      clearInterval(timer.value);
      timer.value = -1;
    }
  });
}

onUnmounted(clearAllTimers);
onDeactivated(clearAllTimers);

// 登录方法映射（替代 switch-case）
const loginMethods = {
  [LoginType.PWD]: () => toLoginByPwd(userForm.value.username, userForm.value.password),
  [LoginType.PHONE]: () => toLoginByPhone(userForm.value.phone, userForm.value.code),
  [LoginType.EMAIL]: () => toLoginByEmail(userForm.value.email, userForm.value.code),
};

// 登录（简化逻辑）
async function onLogin(formEl: any | undefined) {
  if (!formEl || isLoading.value)
    return;

  formEl.validate(async (valid: boolean) => {
    if (!valid)
      return;

    isLoading.value = true;
    userStore.isOnLogining = true;

    try {
      const loginMethod = loginMethods[loginType.value];
      const res = await loginMethod();

      if (res.code === StatusCode.SUCCESS && res.data) {
        await handleLoginSuccess(res.data);
      }
      else {
        userStore.$patch({ token: "", isLogin: false });
      }
    }
    catch (error) {
    }
    finally {
      isLoading.value = false;
      userStore.isOnLogining = false;
    }
  });
}

// 处理登录成功（提取复用逻辑）
async function handleLoginSuccess(data: string) {
  await userStore.onUserLogin(data, autoLogin.value, (info) => {
    useWsStore().reload();

    if (autoLogin.value) {
      addHistoryAccount({
        type: loginType.value,
        account: userForm.value.username,
        password: userForm.value.password,
        userInfo: {
          id: info.id,
          avatar: info.avatar,
          nickname: info.nickname,
        },
      });
    }

    navigateTo("/");
  });
}

// 登录选项
const options = [
  { label: "邮箱登录", value: LoginType.EMAIL },
  { label: "手机登录", value: LoginType.PHONE },
  { label: "密码登录", value: LoginType.PWD },
];

// 历史账号相关
const theHistoryAccount = ref({
  type: LoginType.EMAIL,
  account: "",
  password: "",
  userInfo: {
    avatar: "",
    nickname: "",
  },
});

const findAccountAvatar = computed(() =>
  historyAccounts.value.find(item => item.account === userForm.value.username),
);

// 头像展示URL
const getShowAvatarUrl = computed(() => findAccountAvatar.value?.userInfo?.avatar ? BaseUrlImg + findAccountAvatar.value?.userInfo?.avatar : "/logo.png");
async function handleSelectAccount(item: Record<string, any>) {
  if (!item?.account)
    return;

  const pwd = await decrypt(JSON.parse(item.password), item.account);
  userForm.value.username = item.account;
  userForm.value.password = pwd || "";
  loginType.value = item.type;
  theHistoryAccount.value = {
    type: item.type,
    account: item.account,
    password: item.password || "",
    userInfo: item.userInfo,
  };
}

function handleClearAccount() {
  userForm.value.username = "";
  // userForm.value.password = "";
}

function querySearchAccount(queryString: string, cb: (data: any[]) => void) {
  const results = historyAccounts.value.sort((a, b) => {
    if (!queryString)
      return 0;
    const aIndex = a.account.toLowerCase().indexOf(queryString.toLowerCase());
    const bIndex = b.account.toLowerCase().indexOf(queryString.toLowerCase());
    if (aIndex === -1 && bIndex === -1)
      return 0;
    if (aIndex === -1)
      return 1;
    if (bIndex === -1)
      return -1;
    return aIndex - bIndex;
  });
  cb(results);
}

function toRegister() {
  userStore.showLoginPageType = "register";
}

function forgetPassword() {
  ElMessage.warning("请手机或者邮箱验证登录后，找回密码！");
}

// OAuth 第三方登录
const oauthPlatforms = useLocalStorage<OAuthPlatformVO[]>("oauth-platforms", []);
const isLoadingOAuth = ref(false);
const authorizeUrlLoadings = ref<Record<string, boolean>>({});
// @unocss-include
const oauthPlatformsClass = computed<Partial<Record<OAuthPlatformCode, string>>>(() => ({
  [OAuthPlatformCode.GITHUB]: "dark:invert",
}));

// 加载 OAuth 平台列表
async function loadOAuthPlatforms() {
  try {
    isLoadingOAuth.value = true;
    const res = await getOAuthPlatforms();
    if (res.code === StatusCode.SUCCESS) {
      oauthPlatforms.value = res.data.filter(p => p.enabled);
    }
  }
  catch (error) {
    console.error("加载 OAuth 平台失败:", error);
  }
  finally {
    isLoadingOAuth.value = false;
  }
}

// ==================== 桌面端 OAuth 深链接支持 ====================
const setting = useSettingStore();

// 创建各平台的 OAuth flow 实例
const oauthFlows = new Map<OAuthPlatformCode, ReturnType<typeof useOAuthFlow>>();

function getOAuthFlow(platform: OAuthPlatformCode) {
  if (!oauthFlows.has(platform)) {
    const flow = useOAuthFlow({
      platform,
      action: "login",
      onSuccess: async (data: OAuthCallbackVO) => {
        await processOAuthLoginResult(platform, data);
      },
      onError: (error: Error) => {
        ElMessage.error(error.message || "OAuth 登录失败");
        authorizeUrlLoadings.value[platform] = false;
      },
    });
    oauthFlows.set(platform, flow);
  }
  return oauthFlows.get(platform)!;
}

// 桌面端深链接回调监听
useOAuthDeepLink({
  autoListen: setting.isDesktop || setting.isMobile,
  onCallback: async (payload: OAuthCallbackPayload) => {
    // 只处理登录动作
    if (payload.action !== "login")
      return;

    const platform = payload.platform as OAuthPlatformCode;

    // 处理错误
    if (payload.error) {
      ElMessage.error(payload.message ? decodeURIComponent(payload.message) : "OAuth 登录失败");
      authorizeUrlLoadings.value[platform] = false;
      return;
    }

    // 直接处理登录结果（不依赖 oauthFlows Map）
    if (payload.needBind === false && payload.token) {
      // 无需绑定，直接登录
      ElMessage.success("登录成功");
      authorizeUrlLoadings.value[platform] = false;
      await userStore.onUserLogin(payload.token, true, () => {
        navigateTo({ path: "/", replace: true });
      });
    }
    else if (payload.needBind === true && payload.oauthKey) {
      // 需要绑定，跳转到回调页面处理
      authorizeUrlLoadings.value[platform] = false;
      navigateTo({
        path: "/oauth/callback",
        query: {
          platform,
          action: "login",
          needBind: "true",
          oauthKey: payload.oauthKey,
          nickname: payload.nickname || "",
          avatar: payload.avatar || "",
          email: payload.email || "",
        },
      });
    }
    else {
      ElMessage.error("登录失败：返回数据异常");
      authorizeUrlLoadings.value[platform] = false;
    }
  },
});

// 处理 OAuth 登录结果（来自 useOAuthFlow 的 onSuccess 回调）
async function processOAuthLoginResult(platform: OAuthPlatformCode, data: OAuthCallbackVO) {
  try {
    if (!data.needBind && data.token) {
      // 无需绑定，直接登录
      ElMessage.success("登录成功");
      await userStore.onUserLogin(data.token, true, () => {
        navigateTo({
          path: "/",
          replace: true,
        });
      });
    }
    else if (data.needBind && data.oauthKey) {
      // 需要绑定，跳转到回调页面处理（通过 URL 参数传递数据）
      navigateTo({
        path: "/oauth/callback",
        query: {
          platform,
          action: "login",
          needBind: "true",
          oauthKey: data.oauthKey,
          nickname: data.nickname || "",
          avatar: data.avatar || "",
          email: data.email || "",
        },
      });
    }
    else {
      ElMessage.error("登录失败：返回数据异常");
    }
  }
  catch (error: any) {
    ElMessage.error(error.message || "OAuth 登录失败");
  }
  finally {
    setTimeout(() => {
      authorizeUrlLoadings.value[platform] = false;
    }, 500);
  }
}

// 第三方登录
async function handleOAuthLogin(platform: OAuthPlatformCode) {
  if (authorizeUrlLoadings.value[platform])
    return;

  authorizeUrlLoadings.value[platform] = true;

  try {
    const flow = getOAuthFlow(platform);
    await flow.startOAuth();
  }
  catch (error: any) {
  }
  finally {
    setTimeout(() => {
      authorizeUrlLoadings.value[platform] = false;
    }, 400);
  }
}

// 初始化加载 OAuth 平台
onMounted(() => {
  loadOAuthPlatforms();
});

defineExpose({
  historyAccounts,
  theAccount: theHistoryAccount,
});
</script>

<template>
  <!-- 登录 -->
  <el-form
    ref="formRef"
    :disabled="isLoading"
    label-position="top"
    hide-required-asterisk
    :rules="rules"
    :model="userForm"
    style="border: none;"
    class="form"
    :class="{
      'has-account': findAccountAvatar,
    }"
    autocomplete="off"
  >
    <template v-if="!userStore.isLogin">
      <div class="h-24 flex-row-c-c">
        <transition name="pop-list" mode="out-in">
          <div :key="getShowAvatarUrl" class="header flex-row-c-c">
            <CardAvatar
              style="--anima: blur-in;"
              :src="getShowAvatarUrl"
              :class="{
                'has-account': findAccountAvatar?.userInfo?.avatar,
              }"
              class="avatar"
            />
            <div v-show="!findAccountAvatar" class="title">
              {{ appName }}
            </div>
          </div>
        </transition>
      </div>
      <!-- 切换登录 -->
      <el-segmented
        v-model="loginType"
        class="toggle-login grid grid-cols-3 mb-4 w-full gap-2 card-bg-color-2"
        :options="options"
      />
      <!-- 邮箱登录 -->
      <el-form-item
        v-if="loginType === LoginType.EMAIL"
        prop="email"
        class="animated"
      >
        <el-input
          v-model.trim="userForm.email"
          type="email"
          autocomplete="off"
          :prefix-icon="ElIconMessage"
          size="large"
          placeholder="请输入邮箱"
          @keyup.enter="getLoginCode(loginType)"
        >
          <template #append>
            <span class="code-btn" @click="getLoginCode(loginType)">
              {{ codeConfig[LoginType.EMAIL].storage.value > 0 ? `${codeConfig[LoginType.EMAIL].storage.value}s后重新发送` : "获取验证码" }}
            </span>
          </template>
        </el-input>
      </el-form-item>
      <!-- 手机号登录 -->
      <el-form-item
        v-if="loginType === LoginType.PHONE"
        type="tel"
        prop="phone"
        class="animated"
      >
        <el-input
          v-model.trim="userForm.phone"
          :prefix-icon="ElIconIphone"
          size="large"
          type="tel"
          autocomplete="off"
          placeholder="请输入手机号"
          @keyup.enter="getLoginCode(loginType)"
        >
          <template #append>
            <span class="code-btn" @click="getLoginCode(loginType)">
              {{ codeConfig[LoginType.PHONE].storage.value > 0 ? `${codeConfig[LoginType.PHONE].storage.value}s后重新发送` : "获取验证码" }}
            </span>
          </template>
        </el-input>
      </el-form-item>
      <el-form-item
        v-if="loginType === LoginType.EMAIL || loginType === LoginType.PHONE"
        prop="code"
        class="animated"
      >
        <el-input
          v-model.trim="userForm.code"
          :prefix-icon="ElIconChatDotSquare"
          autocomplete="off"
          size="large"
          placeholder="请输入验证码"
          @keyup.enter="onLogin(formRef)"
        />
      </el-form-item>
      <!-- 密码登录 -->
      <el-form-item
        v-if="loginType === LoginType.PWD"
        label=""
        prop="username"
        class="animated"
      >
        <el-autocomplete
          v-model.trim="userForm.username"
          autocomplete="off"
          class="login-account"
          :prefix-icon="ElIconUser"
          size="large"
          :fetch-suggestions="querySearchAccount"
          :trigger-on-focus="true"
          placement="bottom"
          clearable
          teleported
          fit-input-width
          select-when-unmatched
          hide-loading
          value-key="account"
          placeholder="请输入用户名、手机号或邮箱"
          @clear="handleClearAccount"
          @select="handleSelectAccount"
        >
          <template #default="{ item }">
            <div :title="item.account" class="group w-full flex items-center px-2">
              <el-avatar :size="30" class="mr-2 flex-shrink-0" :src="BaseUrlImg + item.userInfo.avatar" />
              <span class="block max-w-14em truncate">{{ item.account }}</span>
              <i
                title="删除"
                class="i-carbon:close ml-a h-1.5em w-1.5em flex-shrink-0 scale-0 btn-danger overflow-hidden transition-all group-hover:(scale-100)"
                @click.stop.capture="removeHistoryAccount(item.account)"
              />
              <span v-if="item.userInfo && item.userInfo.isAdmin" class="ml-2 flex-shrink-0 rounded-4px bg-theme-primary px-1 py-1px text-xs text-white">管理员</span>
            </div>
          </template>
        </el-autocomplete>
      </el-form-item>
      <el-form-item
        v-if="loginType === LoginType.PWD"
        type="password"
        show-password
        label=""
        prop="password"
        class="animated"
      >
        <el-input
          v-model.trim="userForm.password"
          :prefix-icon="ElIconLock"
          autocomplete="off"
          size="large"
          placeholder="请输入密码"
          show-password
          type="password"
          @keyup.enter="onLogin(formRef)"
        />
      </el-form-item>
      <el-form-item style="margin: 0;">
        <el-button
          type="primary"
          class="submit w-full tracking-0.2em shadow"
          style="padding: 20px"
          :loading="isLoading || userStore.isOnLogining"
          :loading-icon="CardLoading"
          @keyup.enter="onLogin(formRef)"
          @click="onLogin(formRef)"
        >
          登录
        </el-button>
      </el-form-item>
      <!-- 底部 -->
      <div
        class="mt-3 text-right text-0.8em sm:text-mini"
      >
        <el-checkbox v-model="autoLogin" class="mt-1" style="padding: 0;font-size: inherit;float: left; height: fit-content;">
          记住我
        </el-checkbox>
        <span
          class="mr-2 cursor-pointer border-r-(1px [var(--el-border-color-base)] solid) pr-2 transition-300"
          @click="forgetPassword"
        >
          忘记密码？
        </span>
        <span
          cursor-pointer class="text-color-primary" transition-300
          @click="toRegister"
        >
          注册账号
        </span>
      </div>
      <!-- 第三方登录 -->
      <div
        v-if="oauthPlatforms.length > 0"
      >
        <div class="mt-4 flex items-center justify-between">
          <div class="h-1px flex-1 border-default-b" />
          <span class="px-3 text-mini">第三方登录/注册</span>
          <div class="h-1px flex-1 border-default-b" />
        </div>
        <div
          class="mt-2 flex items-center justify-center gap-3"
        >
          <div
            v-for="platform in oauthPlatforms"
            :key="platform.code"
            class="relative flex cursor-pointer items-center justify-center overflow-hidden rounded-1/2 transition-200 hover:(op-80 filter-brightness-125)"
            :title="`使用 ${platform.name} 登录`"
            @click="handleOAuthLogin(platform.code)"
          >
            <CardElImage
              :src="getOAuthPlatformIcon(platform.code)"
              error-root-class="hidden"
              :alt="platform.name"
              :class="[oauthPlatformsClass[platform.code], {
                'filter-blur-2px': authorizeUrlLoadings[platform.code],
              }]"
              class="h-5 w-5"
            />
            <!-- loading icon -->
            <CardLoading
              v-if="authorizeUrlLoadings[platform.code]"
              size="1.2em"
              class="absolute z-1 animate-spin op-50"
            />
          </div>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="mt-16 flex-row-c-c flex-col gap-8">
        <CardAvatar :src="BaseUrlImg + userStore.userInfo.avatar" class="h-6rem w-6rem border-default rounded-full bg-color-2 sm:(h-8rem w-8rem)" />
        <div text-center>
          <span>
            {{ userStore.userInfo.username || "未登录" }}
          </span>
          <br>
          <small op-80 el-color-info>（{{ userStore.userInfo.username ? "已登录" : "请登录" }}）</small>
        </div>
        <div>
          <BtnElButton
            style="width: 8em;"
            type="primary"
            transition-icon
            :loading="userStore.isOnLogining"
            :loading-icon="CardLoading"
            icon-class="i-solar-alt-arrow-left-bold"
            mr-2 sm:mr-4
            @click="navigateTo('/')"
          >
            {{ userStore.isOnLogining ? "登录中..." : "前往聊天" }}
          </BtnElButton>
          <BtnElButton
            style="width: 8em;"
            type="danger"
            transition-icon plain
            icon-class="i-solar:logout-3-broken"
            @click="userStore.exitLogin"
          >
            退出登录
          </BtnElButton>
        </div>
      </div>
    </template>
  </el-form>
</template>

<style scoped lang="scss">
.form {
  display: block;
  overflow: hidden;
  animation-delay: 0.1s;

  :deep(.el-input__wrapper) {
    padding: 0.3em 1em;
  }

  :deep(.el-form-item) {
    padding: 0;

    .el-input__wrapper {
      border-color: transparent !important;
      box-shadow: none !important;
    }

    .el-input-group__append {
      --at-apply: "w-8rem min-w-fit text-theme-primary card-rounded-df op-80 transition-200 cursor-pointer overflow-hidden bg-color p-0 m-0 tracking-0.1em rounded-l-0 hover:(!text-theme-primary op-100)";
    }
    .code-btn {
      --at-apply: " h-full flex-row-c-c px-4 transition-200 ";
    }

    .el-form-item__error {
      margin-top: 0.2rem;
    }
  }
}

:deep(.el-button) {
  padding: 0.3em 1em;
}

.animate__animated {
  animation-duration: 0.5s;
}

// label总体
:deep(.el-form-item) {
  margin-bottom: 1.25rem;
}

// 切换登录
:deep(.toggle-login.el-segmented) {
  --el-segmented-item-selected-bg-color: var(--el-color-primary);
  --el-border-radius-base: 6px;
  height: 2.6rem;
  padding: 0.4rem;
  .el-segmented__item:hover:not(.is-selected) {
    background: transparent;
  }
  .el-segmented__item.is-selected {
    color: #fff;
  }
}

.dark .active {
  background-color: var(--el-color-primary);
}

.submit {
  --at-apply: "h-2.6rem transition-200 w-full tracking-0.2em text-4 shadow";
  :deep(.el-icon) {
    --at-apply: "text-5";
  }
}

.header {
  .avatar {
    --at-apply: "mx-0 h-8 w-8";

    &.has-account {
      --at-apply: "mx-a h-18 w-18 border-2px border-default !border-color-light rounded-full shadow-lg hover:(shadow-xl scale-105) transition-200 block";
    }
  }
  .title {
    --at-apply: "ml-3 pr-2 text-lg font-500 tracking-0.2em text-5.2";
  }
}
:deep(.el-divider.login-type) {
  .el-divider__text {
    --at-apply: "bg-transparent";
  }
}
</style>

<style lang="scss">
.el-autocomplete-suggestion {
  .el-scrollbar {
    --at-apply: "!max-h-12em";
  }
}
</style>
