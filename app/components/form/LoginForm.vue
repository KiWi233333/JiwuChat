<script lang="ts" setup>
import { CardLoading } from "#components";
import {
  DeviceType,
  getLoginCodeByType,
  toLoginByEmail,
  toLoginByPhone,
  toLoginByPwd,
} from "~/composables/api/user";
import { appName } from "~/constants";
import { LoginType } from "~/types/user/index.js";

const user = useUserStore();
const loginType = useLocalStorage<LoginType>("loginType", LoginType.EMAIL);

const {
  historyAccounts,
  addHistoryAccount,
  removeHistoryAccount,
} = useHistoryAccount();
const isLoading = ref<boolean>(false);
const autoLogin = ref<boolean>(true);
// 表单
const userForm = ref({
  username: "",
  password: "",
  code: "", // 验证码
  email: "", // 邮箱登录
  phone: "", // 手机登录
});

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
    {
      required: true,
      message: "验证码6位组成！",
      trigger: "change",
    },
  ],
  email: [
    { required: true, message: "邮箱不能为空！", trigger: "blur" },
    {
      pattern:
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\])|(([a-z\-0-9]+\.)+[a-z]{2,}))$/i,
      message: "邮箱格式不正确！",
      trigger: "blur",
    },
  ],
  phone: [
    { required: true, message: "手机号不能为空！", trigger: "blur" },
    {
      pattern:
        /^(?:(?:\+|00)86)?1[3-9]\d{9}$/,
      message: "手机号格式不正确！",
      trigger: "change",
    },
  ],
});
// 验证码有效期
const phoneTimer = ref(-1);
const emailTimer = ref(-1);
const emailCodeStorage = ref<number>(0);
const phoneCodeStorage = ref<number>(0);
/**
 * 获取验证码
 * @param type
 */
async function getLoginCode(type: LoginType) {
  let data;
  try {
    // 获取邮箱验证码
    if (type === LoginType.EMAIL) {
    // 简单校验
      if (!userForm.value.email.trim() || emailCodeStorage.value > 0)
        return;
      if (!checkEmail(userForm.value.email)) {
        isLoading.value = false;
        return ElMessage.error("邮箱格式不正确！");
      }
      // 开启
      isLoading.value = true;
      // 请求验证码
      data = await getLoginCodeByType(userForm.value.email, DeviceType.EMAIL);
      // 成功
      if (data.code === StatusCode.SUCCESS) {
        ElMessage.success({
          message: "验证码已发送至您的邮箱，5分钟有效！",
          duration: 3000,
        });
        useInterval(emailTimer, emailCodeStorage, 60, -1);
      }
    }
    // 获取手机号验证码
    else if (type === LoginType.PHONE) {
      if (!userForm.value.phone.trim() || phoneCodeStorage.value > 0)
        return;
      if (!checkPhone(userForm.value.phone)) {
        isLoading.value = false;
        ElMessage.closeAll("error");
        return ElMessage.error("手机号格式不正确！");
      }
      isLoading.value = true;
      data = await getLoginCodeByType(userForm.value.phone, DeviceType.PHONE);
      if (data.code === StatusCode.SUCCESS) {
      // 开启定时器
        useInterval(phoneTimer, phoneCodeStorage, 60, -1);
        ElMessage.success({
          message: data.message,
          duration: 5000,
        });
      // userForm.value.code = data.data;
      }
      else {
        ElMessage.closeAll("error");
        ElMessage.error(data.message);
      }
    }
  }
  catch (error) {
    isLoading.value = false;
  }
  // 关闭加载
  isLoading.value = false;
}
/**
 * 定时器
 * @param timer 本地定时器
 * @param num 计数对象
 * @param target 开始秒数
 * @param step 自增自减
 * @param fn 回调
 */
function useInterval(timer: any, num: Ref<number>, target?: number, step = -1, fn?: () => void) {
  num.value = target || timer.value;
  timer.value = setInterval(() => {
    num.value += step;
    // 清除定时器
    if (num.value <= 0) {
      num.value = -1;
      clearInterval(timer.value);
      timer.value = -1;
    }
    fn && fn();
  }, 1000);
}

// 关闭定时器
onUnmounted(() => {
  onCloseTimer();
});
onDeactivated(() => {
  onCloseTimer();
});
// 关闭定时器
function onCloseTimer() {
  if (emailTimer.value !== -1) {
    clearInterval(emailTimer.value);
    emailTimer.value = -1;
  }
  if (phoneTimer.value !== -1) {
    clearInterval(phoneTimer.value);
    phoneTimer.value = -1;
  }
}


const store = useUserStore();
function toRegister() {
  store.showLoginPageType = "register";
}

const formRef = ref();
function done() {
  isLoading.value = false;
  user.isOnLogining = false;
}
/**
 * 登录
 * @param formEl 表单示例
 */
async function onLogin(formEl: any | undefined) {
  if (!formEl || isLoading.value)
    return;
  formEl.validate(async (valid: boolean) => {
    if (!valid)
      return;
    isLoading.value = true;
    user.isOnLogining = true;
    let res = { code: StatusCode.DEFAULT_ERR, data: "", message: "登录失败！" };
    try {
      switch (loginType.value) {
        case LoginType.PWD:
          res = await toLoginByPwd(userForm.value.username, userForm.value.password);
          break;
        case LoginType.PHONE:
          res = await toLoginByPhone(userForm.value.phone, userForm.value.code);
          break;
        case LoginType.EMAIL:
          res = await toLoginByEmail(userForm.value.email, userForm.value.code);
          break;
      }
    }
    catch (error) {
      res = { code: StatusCode.DEFAULT_ERR, data: "", message: "连接失败，请稍后重试！" };
      done();
    }
    if (res.code === StatusCode.SUCCESS) {
      // 登录成功
      if (res.data) {
        await store.onUserLogin(res.data, autoLogin.value, (info) => {
          // 初始化
          useWsStore().reload();
          // 保存账号
          if (!autoLogin.value) {
            return;
          }
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
          // 转发
          navigateTo("/");
        });
        done();
      }
      // 登录失败
      else {
        // store
        store.$patch({
          token: "",
          isLogin: false,
        });
        done();
      }
    }
    else {
      done();
    }
  });
}

const options = [
  { label: "邮箱登录", value: LoginType.EMAIL },
  { label: "手机登录", value: LoginType.PHONE },
  { label: "密码登录", value: LoginType.PWD },
];

const theHistoryAccount = ref({
  type: LoginType.EMAIL,
  account: "",
  password: "",
  userInfo: {
    avatar: "",
    nickname: "",
  },
});

const findAccountAvatar = computed(() => historyAccounts.value.find(item => item.account === userForm.value.username));
async function handleSelectAccount(item: Record<string, any>) {
  if (!item || !item.account)
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

function forgetPassword() {
  ElMessage.warning("请手机或者邮箱验证登录后，找回密码！");
}

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
    <template v-if="!user.isLogin">
      <div class="header flex-row-c-c">
        <CardAvatar
          style="--anima: blur-in;"
          :src="findAccountAvatar?.userInfo?.avatar ? BaseUrlImg + findAccountAvatar?.userInfo?.avatar : '/logo.png'"
          class="avatar"
        />
        <div v-show="!findAccountAvatar" class="title">
          {{ appName }}
        </div>
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
            <span class="code-btn" @click="getLoginCode(loginType)"> {{ emailCodeStorage > 0 ? `${emailCodeStorage}s后重新发送` : "获取验证码" }}
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
              {{ phoneCodeStorage > 0 ? `${phoneCodeStorage}s后重新发送` : "获取验证码" }}
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
          :loading="isLoading || user.isOnLogining"
          :loading-icon="CardLoading"
          @keyup.enter="onLogin(formRef)"
          @click="onLogin(formRef)"
        >
          登录
        </el-button>
      </el-form-item>
      <!-- 底部 -->
      <div
        class="mt-3 text-right text-0.8em sm:text-sm"
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
    </template>
    <template v-else>
      <div class="mt-16 flex-row-c-c flex-col gap-8">
        <CardAvatar :src="BaseUrlImg + user.userInfo.avatar" class="h-6rem w-6rem border-default rounded-full bg-color-2 sm:(h-8rem w-8rem)" />
        <div text-center>
          <span>
            {{ user.userInfo.username || "未登录" }}
          </span>
          <br>
          <small op-80 el-color-info>（{{ user.userInfo.username ? "已登录" : "请登录" }}）</small>
        </div>
        <div>
          <BtnElButton
            style="width: 8em;"
            type="primary"
            transition-icon
            :loading="user.isOnLogining"
            :loading-icon="CardLoading"
            icon-class="i-solar-alt-arrow-left-bold"
            mr-2 sm:mr-4
            @click="navigateTo('/')"
          >
            {{ user.isOnLogining ? "登录中..." : "前往聊天" }}
          </BtnElButton>
          <BtnElButton
            style="width: 8em;"
            type="danger"
            transition-icon plain
            icon-class="i-solar:logout-3-broken"
            @click="user.exitLogin"
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

    .el-input-group__append {
      --at-apply: "w-8rem min-w-fit text-theme-primary card-rounded-df op-80 transition-200 cursor-pointer overflow-hidden bg-color p-0 m-0 tracking-0.1em hover:(!text-theme-primary op-100)";
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
  --at-apply: "h-24 transition-height flex-row-c-c";

  .avatar {
    --at-apply: "mx-0 h-8 w-8";
  }
  .title {
    --at-apply: "ml-3 pr-2 text-lg font-500 tracking-0.2em text-5.2";
  }
}
.has-account {
  .header {
    --at-apply: "h-30 flex-row-c-c";
  }
  .avatar {
    --at-apply: "mx-a h-20 w-20 border-2px border-default rounded-full shadow-lg block";
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
