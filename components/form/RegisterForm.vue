<script lang="ts" setup>
import type { FormInstance, FormRules } from "element-plus";
import type { Result } from "~/types/result";
import { CardLoading } from "#components";
import { MdPreview } from "md-editor-v3";
import { DeviceType, getRegisterCode, toLoginByPwd } from "~/composables/api/user";
import { checkUsernameExists } from "~/composables/api/user/info";
import { appTerms } from "~/constants";
import { RegisterType } from "~/types/user/index.js";
import "md-editor-v3/lib/preview.css";

const {
  size = "large",
} = defineProps<{
  size?: "large" | "small" | "default"
}>();

const setting = useSettingStore();
// 注册方式
const registerType = ref<number>(RegisterType.EMAIL);
const options = [
  { label: "邮箱注册", value: RegisterType.EMAIL },
  { label: "手机号注册", value: RegisterType.PHONE },
  { label: "常规注册", value: RegisterType.PASSWORD },
];
// 请求加载
const isLoading = ref<boolean>(false);
const loadingText = ref<string>("");
const formRef = ref();
// 表单
const formUser = reactive({
  username: "", // 用户名
  phone: "", // 手机号 0
  email: "", // 邮箱 1
  code: "", // 验证码
  password: "", // 密码
  secondPassword: "", // 密码
});
const rules = reactive<FormRules>({
  username: [
    { required: true, message: "用户名不能为空！", trigger: "blur" },
    {
      pattern: /^[a-z]\w*$/i,
      message: "英文开头、字母数字下划线组成",
      trigger: "change",
    },
    { min: 6, max: 30, message: "长度在6-30个字符！", trigger: "blur" },
    {
      asyncValidator: checkUsername,
      message: "该用户名已被使用！",
      trigger: "blur",
    },
  ],
  password: [
    { required: true, message: "密码不能为空！", trigger: "blur" },
    { min: 6, max: 20, message: "密码长度为6-20字符！", trigger: "change" },
    {
      pattern: /^\w{6,20}$/,
      message: "密码字母数字下划线组成",
      trigger: "change",
    },
    {
      validator(rule: any, value: string, callback: any) {
        if (registerType.value === RegisterType.PASSWORD && value !== formUser.password?.trim())
          callback(new Error("两次密码不一致"));
        else
          callback();
      },
    },
  ],
  secondPassword: [
    { required: true, message: "密码不能为空！", trigger: "blur" },
    { min: 6, max: 20, message: "密码长度为6-20字符！", trigger: "change" },
    {
      pattern: /^\w{6,20}$/,
      message: "密码字母数字下划线组成",
      trigger: "change",
    },
    {
      validator(rule: any, value: string, callback: any) {
        if (value !== formUser.password?.trim())
          callback(new Error("两次密码不一致"));
        else
          callback();
      },
    },
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
      trigger: ["blur", "change"],
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
const agreeDetail = reactive({
  value: false,
  showDetail: false,
  detail: appTerms,
});
const isAgreeTerm = computed({
  get: () => agreeDetail.value,
  set: (val: boolean) => {
    if (val) {
      agreeDetail.showDetail = true;
    }
    else {
      agreeDetail.value = val;
    }
  },
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
async function getRegCode(type: RegisterType) {
  try {
    if (isLoading.value)
      return;
    let data;
    // 获取邮箱验证码
    if (type === RegisterType.EMAIL) {
      // 简单校验
      if (formUser.email.trim() === "")
        return ElMessage.error("邮箱不能为空！");
      if (emailCodeStorage.value > 0)
        return;
      if (!checkEmail(formUser.email))
        return ElMessage.error("邮箱格式不正确！");

      isLoading.value = true;

      // 请求验证码
      data = await getRegisterCode(formUser.email, DeviceType.EMAIL);
      // 成功
      if (data.code === StatusCode.SUCCESS) {
        ElMessage.success({
          message: "验证码已发送至您的邮箱，5分钟有效！",
          duration: 5000,
        });
        useInterval(emailTimer, emailCodeStorage, 60, -1);
      }
    }
    // 获取手机号验证码
    else if (type === RegisterType.PHONE) {
      if (formUser.phone.trim() === "")
        return ElMessage.error("手机号不能为空！");
      if (phoneCodeStorage.value > 0)
        return;
      if (!checkPhone(formUser.phone))
        return ElMessage.error("手机号格式不正确！");

      isLoading.value = true;
      data = await getRegisterCode(formUser.phone, DeviceType.PHONE);
      if (data.code === StatusCode.SUCCESS) {
        // 开启定时器
        formUser.code = data.data;
        useInterval(phoneTimer, phoneCodeStorage, 60, -1);
        ElMessage.success({
          message: data.message,
          duration: 5000,
        });
      }
    }
    else {
      ElMessage.warning("非法操作，注册类型有误！");
    }
  }
  catch (err) { }
  finally {
  // 关闭加载
    isLoading.value = false;
  }
}
/**
 *
 * @param timer 本地定时器
 * @param num 计数对象
 * @param target 开始秒数
 * @param step 自增自减
 * @param fn 回调
 */
function useInterval(timer: any, num: Ref<number>, target?: number, step: number = -1, fn?: () => void) {
  num.value = target || timer.value;
  timer.value = setInterval(() => {
    num.value += step;
    // 清除定时器
    if (num.value <= 0) {
      num.value = -1;
      timer.value = -1;
      clearInterval(timer.value);
      fn && fn();
    }
  }, 1000);
}
const store = useUserStore();
/**
 * 注册
 * @param formEl 表单实例
 */
async function onRegister(formEl: FormInstance) {
  if (!formEl)
    return;
  await formEl.validate((valid) => {
    if (!valid) {
      isLoading.value = false;
      return;
    }
    if (!agreeDetail.value) {
      ElMessage.warning("请阅读并同意用户协议！");
      agreeDetail.showDetail = true;
      return;
    }
    isLoading.value = true;
    onRegisterHandle();
  });
}
async function onRegisterHandle() {
  let res: Result<string> = { code: 20001, message: "注册失败，请稍后重试！", data: "" };
  try {
    switch (registerType.value) {
      case RegisterType.PHONE:
        res = await toRegisterV2({
          username: formUser.username,
          phone: formUser.phone,
          // password: formUser.password,
          code: formUser.code,
          type: registerType.value,
        });
        break;
      case RegisterType.EMAIL:
        res = await toRegisterV2({
          username: formUser.username,
          // password: formUser.password,
          code: formUser.code,
          email: formUser.email,
          type: registerType.value,
        });
        break;
      case RegisterType.PASSWORD:
        res = await toRegisterV2({
          username: formUser.username,
          password: formUser.password,
          secondPassword: formUser.secondPassword,
          type: RegisterType.PASSWORD,
        });
        break;
    }
  }
  catch (error) {
    isLoading.value = false;
  }

  if (res.code === StatusCode.SUCCESS) {
    // 注册成功
    if (res.data !== "") {
      const token = res.data;
      ElMessage.success({
        message: "恭喜，注册成功 🎉",
        duration: 2000,
      });
      // 先预取一下热点会话
      setMsgReadByRoomId(1, token).catch((e) => {
        console.warn("预取热点会话失败", e);
        ElMessage.closeAll("error");
      });
      // 登录
      let count = 2;
      const timers = setInterval(() => {
        isLoading.value = true;
        loadingText.value = `${count}s后自动登录...`;
        if (count <= 0) {
          toLogin(token);
          // 清除
          clearInterval(timers);
        }
        count--;
      }, 1000);
    }
  }
  else {
    ElMessage.closeAll("error");
    ElMessage.error({
      message: res.message || "抱歉，注册出了点问题！",
      duration: 4000,
    });
    isLoading.value = false;
    // store
    store.$patch({
      token: "",
      isLogin: false,
    });
  }
}

async function toLogin(token?: string) {
  if (token) {
    // 登录成功
    await store.onUserLogin(token, true);
    ElMessage.success({
      message: "登录成功！",
    });
    await navigateTo("/");
    return;
  }
  const data = await toLoginByPwd(formUser.username, formUser.password);
  // 自动登录成功
  store.$patch({
    token: data.data,
    showLoginPageType: "",
    isLogin: true,
  });
  ElMessage.success({
    message: "登录成功！",
  });
  isLoading.value = false;
}

/**
 * 验证是否存在该用户
 */
async function checkUsername() {
  if (formUser.username.trim() === "")
    return Promise.reject();
  const data = await checkUsernameExists(formUser.username);
  if (data.code === StatusCode.SUCCESS)
    return Promise.resolve();

  return Promise.reject("该用户名已被使用！");
}

function toLoginForm() {
  store.showLoginPageType = "login";
}

// onMounted(() => {
//   if (setting.isDesktop) {
//     const windows = getCurrentWebviewWindow();
//     windows.setSize(new LogicalSize(340, 460));
//   }
// });
</script>

<template>
  <!-- 注册 -->
  <el-form
    ref="formRef"
    :disabled="isLoading"
    label-position="top"
    style="border: none;"
    autocomplete="off"
    hide-required-asterisk
    :rules="rules"
    :model="formUser"
    class="form relative"
  >
    <div my-4 text-lg font-bold tracking-0.2em op-80 sm:mb-6>
      开启你的专属圈子✨
    </div>
    <!-- 切换注册 -->
    <el-segmented
      v-model="registerType"
      :size="size"
      style=""
      class="toggle-btns grid grid-cols-3 mb-4 w-full gap-2 card-bg-color-2"
      :options="options"
    />
    <!-- 验证码注册(客户端 ) -->
    <!-- 用户名 -->
    <el-form-item label="" prop="username" class="animated">
      <el-input
        v-model.lazy="formUser.username"
        :prefix-icon="ElIconUser"
        :size="size"
        autocomplete="off"
        placeholder="请输入用户名"
      />
    </el-form-item>
    <!-- 邮箱 -->
    <el-form-item
      v-if="registerType === RegisterType.EMAIL"
      prop="email"
      class="animated"
      autocomplete="off"
    >
      <el-input
        v-model.trim="formUser.email"
        type="email"
        :prefix-icon="ElIconMessage"
        :size="size"
        autocomplete="off"
        placeholder="请输入邮箱"
      >
        <template #append>
          <span class="code-btn" @click="getRegCode(registerType)">
            {{ emailCodeStorage > 0 ? `${emailCodeStorage}s后重新发送` : "获取验证码" }}
          </span>
        </template>
      </el-input>
    </el-form-item>
    <!-- 手机号 -->
    <el-form-item v-if="registerType === RegisterType.PHONE" type="tel" prop="phone" class="animated">
      <el-input v-model.trim="formUser.phone" :prefix-icon="ElIconIphone" autocomplete="off" :size="size" placeholder="请输入手机号">
        <template #append>
          <span class="code-btn" @click="getRegCode(registerType)">
            {{ phoneCodeStorage > 0 ? `${phoneCodeStorage}s后重新发送` : "获取验证码" }}
          </span>
        </template>
      </el-input>
    </el-form-item>
    <!-- 验证码 -->
    <el-form-item v-if="registerType === RegisterType.PHONE || registerType === RegisterType.EMAIL" prop="code" class="animated">
      <el-input v-model.trim="formUser.code" :prefix-icon="ElIconChatDotSquare" :size="size" autocomplete="off" placeholder="请输入验证码" />
    </el-form-item>
    <!-- 密 码 -->
    <el-form-item
      v-if="registerType === RegisterType.PASSWORD"
      type="password" show-password label="" prop="password" class="animated"
    >
      <el-input
        v-model.trim="formUser.password"
        :prefix-icon="ElIconLock"
        :size="size"
        placeholder="请输入密码（6-20位）"
        show-password
        type="password" autocomplete="off"
      />
    </el-form-item>
    <!-- 确认密码 -->
    <el-form-item
      v-if="registerType === RegisterType.PASSWORD"
      type="password" show-password label="" prop="secondPassword" class="animated"
    >
      <el-input
        v-model.trim="formUser.secondPassword"
        :prefix-icon="ElIconLock"
        :size="size"
        placeholder="再一次输入密码" show-password
        autocomplete="off"
        type="password"
      />
    </el-form-item>
    <el-form-item style="margin: 0;">
      <BtnElButton
        :loading="isLoading"
        :loading-icon="CardLoading"
        type="info"
        class="submit"
        @click="onRegister(formRef)"
      >
        立即注册
      </BtnElButton>
    </el-form-item>
    <div class="mt-3 text-right text-0.8em sm:text-sm">
      <el-checkbox v-model="isAgreeTerm" style="--el-color-primary: var(--el-color-info);padding: 0;font-size: inherit;opacity: 0.8;float: left; height: fit-content;">
        同意并遵守
        <span text-color-info>《用户协议》</span>
      </el-checkbox>
      <span ml-a btn-info cursor-pointer transition-300 @click="toLoginForm">
        返回登录
      </span>
    </div>
    <DialogPopup
      v-model="agreeDetail.showDetail"
      :duration="200"
      :min-scale="0.98"
      :show-close="false"
      destroy-on-close
      content-class="z-1200"
    >
      <div class="h-100vh w-100vw flex flex-col border-default-2 card-default bg-color p-4 sm:(h-500px w-400px border-default card-rounded-df shadow-lg)">
        <h3 :data-tauri-drag-region="setting.isDesktop" class="relative mb-4 select-none text-center text-1.2rem">
          用户协议
          <ElButton text size="small" class="absolute right-0 -top-1" style="width: 2rem;height: 1.4rem;" @click="agreeDetail.showDetail = false">
            <i i-carbon:close btn-danger p-3 title="关闭" />
          </ElButton>
        </h3>
        <el-scrollbar class="flex-1 px-2">
          <MdPreview
            language="zh-CN"
            style="font-size: 0.8rem;"
            :theme="$colorMode.value === 'dark' ? 'dark' : 'light'"
            :code-foldable="false"
            code-theme="a11y"
            class="markdown"
            :model-value="agreeDetail.detail"
          />
        </el-scrollbar>
        <div class="mt-2 mt-4 flex-row-c-c">
          <BtnElButton
            :icon="ElIconCheck"
            type="info"
            plain
            @click.stop="() => {
              agreeDetail.showDetail = false;
              agreeDetail.value = true;
            }"
          >
            我已阅读并同意
          </BtnElButton>
        </div>
      </div>
    </DialogPopup>
  </el-form>
</template>

<style scoped lang="scss">
.markdown {
  --at-apply: "!bg-transparent card-rounded-df";
  :deep(.md-editor-preview) {
    --at-apply: "text-0.76rem p-0";
  }
}
.form {
  display: block;
  overflow: hidden;
  animation-delay: 0.1s;
  :deep(.el-input__wrapper) {
    // padding: 0.3em 1em;
    --at-apply: "p-[0.5em_1em] sm:p-[0.3em_1em]";
  }

  // 报错信息
  :deep(.el-form-item) {
    padding: 0.2em 0;

    .el-input-group__append {
      --at-apply: "w-8rem min-w-fit  text-theme-info card-rounded-df op-80 transition-200 cursor-pointer overflow-hidden bg-color p-0 m-0 tracking-0.1em hover:(!text-theme-info op-100)";
    }
    .code-btn {
      --at-apply: "h-full flex-row-c-c px-4 transition-200 ";
    }

    .el-form-item__error {
      padding-top: 0;
    }
  }
}

:deep(.el-button) {
  padding: 0.5em 1em;
}

// 切换注册
:deep(.toggle-btns.el-segmented) {
  --el-segmented-item-selected-disabled-bg-color: var(--el-color-info-light-5);
  --el-segmented-item-selected-bg-color: var(--el-color-info);
  --el-border-radius-base: 6px;
  height: 2.6rem;
  padding: 0.4rem;
  font-size: small;
  .el-segmented__item:hover:not(.is-selected) {
    background: transparent;
  }

  .el-segmented__item.is-selected {
    color: #fff;
  }
}

.dark .active {
  background-color: var(--el-color-info);
}

.submit {
  --at-apply: "h-2.6rem transition-200 w-full tracking-0.2em text-4 shadow font-500";
  :deep(.el-icon) {
    --at-apply: "text-5";
  }
}
:deep(.el-input__wrapper.is-focus) {
  --el-input-focus-border-color: var(--el-color-info);
}
</style>
