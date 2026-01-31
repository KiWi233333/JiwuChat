<script lang="ts" setup>
import type { OAuthCallbackVO } from "~/composables/api/user/oauth";
import type { OAuthCallbackPayload } from "~/composables/hooks/oauth/useDeepLink";
import AlreadyBound from "~/components/auth/AlreadyBound.vue";
import BindOption from "~/components/auth/BindOption.vue";
import Error from "~/components/auth/Error.vue";
import Loading from "~/components/auth/Loading.vue";
import Success from "~/components/auth/Success.vue";
import { getAuthorizeUrl, OAuthPlatformCode } from "~/composables/api/user/oauth";
import { useOAuthDeepLink } from "~/composables/hooks/oauth/useDeepLink";

const route = useRoute();
const userStore = useUserStore();
const setting = useSettingStore();

// 状态定义
type Status = "loading" | "success" | "error" | "need-bindoption" | "already-bound" | "expired";
const status = ref<Status>("loading");
const message = ref("正在连接授权...");
const subMessage = ref("请稍候，正在与第三方平台验证...");

// OAuth 回调信息
const oauthInfo = ref<OAuthCallbackVO | null>(null);

// 平台信息
const platform = computed(() => route.query.platform as OAuthPlatformCode);

const PLATFORM_CONFIG: Record<string, { name: string; icon: string }> = {
  [OAuthPlatformCode.GITHUB]: { name: "GitHub", icon: "/images/brand/github.svg" },
  [OAuthPlatformCode.GOOGLE]: { name: "Google", icon: "/images/brand/google.svg" },
  [OAuthPlatformCode.GITEE]: { name: "Gitee", icon: "/images/brand/gitee.svg" },
  [OAuthPlatformCode.WECHAT]: { name: "微信", icon: "/images/brand/wechat.svg" },
};

const platformName = computed(() => PLATFORM_CONFIG[platform.value]?.name || platform.value);
const platformIcon = computed(() => PLATFORM_CONFIG[platform.value]?.icon || "i-solar:shield-check-broken");

// 倒计时
const countdown = ref(3);
let countdownTimer: ReturnType<typeof setInterval> | null = null;
let isUnmounted = false;

function startCountdown(seconds: number, callback: () => void) {
  countdown.value = seconds;
  countdownTimer = setInterval(() => {
    if (--countdown.value <= 0) {
      clearInterval(countdownTimer!);
      callback();
    }
  }, 1000);
}

function clearCountdown() {
  if (countdownTimer)
    clearInterval(countdownTimer);
}

// 导航函数
const goToLogin = () => navigateTo({ path: "/login", replace: true });
const goToSettings = () => navigateTo({ path: "/user/safe", replace: true });
const goToHome = () => navigateTo({ path: "/", replace: true });

// 设置状态的辅助函数
function setStatus(s: Status, msg: string, sub: string, countdownSec?: number, callback?: () => void) {
  status.value = s;
  message.value = msg;
  subMessage.value = sub;
  if (countdownSec && callback)
    startCountdown(countdownSec, callback);
}

// 重新授权
async function retryAuth() {
  setStatus("loading", "正在重新获取授权...", "请稍候...");
  try {
    const res = await getAuthorizeUrl(platform.value);
    if (isUnmounted)
      return;
    if (res.code === StatusCode.SUCCESS && res.data) {
      window.location.href = res.data;
    }
    else {
      setStatus("error", "获取授权链接失败", res.message || "请返回登录页重试");
    }
  }
  catch {
    setStatus("error", "网络请求失败", "请检查网络后重试");
  }
}

/** 错误码到状态的映射 */
const ERROR_CODE_HANDLERS: Record<string, () => void> = {
  OAUTH_ACCOUNT_ALREADY_BOUND: () => setStatus("already-bound", "账号已被绑定", `该 ${platformName.value} 账号已被其他用户绑定，请更换账号或联系客服`),
  OAUTH_PLATFORM_ALREADY_BOUND: () => setStatus("already-bound", "平台已绑定", `您已绑定过 ${platformName.value}，如需更换请先解绑`, 3, goToSettings),
  OAUTH_CREDENTIAL_EXPIRED: () => setStatus("expired", "授权已过期", "OAuth 凭证已过期，请重新授权"),
};

/**
 * 统一处理 OAuth 回调结果
 * 支持 URL 参数格式和深度链接 payload 格式
 */
function processCallbackResult(data: {
  action?: string;
  error?: string | boolean;
  errorCode?: string;
  message?: string;
  needBind?: boolean | string;
  token?: string;
  oauthKey?: string;
  bindSuccess?: boolean | string;
  nickname?: string;
  avatar?: string;
  email?: string;
}) {
  const action = data.action || "login";
  const isBind = action === "bind";
  const goBack = isBind ? goToSettings : goToLogin;

  // 处理错误（error 可能是 true/"true" 或具体错误码字符串）
  if (data.error) {
    const errorMsg = data.message || (typeof data.error === "string" && data.error !== "true" ? data.error : "未知错误");
    setStatus("error", "授权失败", decodeURIComponent(errorMsg), 3, goBack);
    return;
  }

  // 处理错误码
  const errorHandler = data.errorCode ? ERROR_CODE_HANDLERS[data.errorCode] : undefined;
  if (errorHandler) {
    errorHandler();
    return;
  }

  // 绑定成功
  if (data.bindSuccess === true || data.bindSuccess === "true") {
    setStatus("success", "绑定成功", `${platformName.value} 账号已成功绑定`, 2, goToSettings);
    return;
  }

  // 登录成功（无需绑定）
  const needBind = data.needBind === true || data.needBind === "true";
  if (!needBind && data.token) {
    setStatus("success", "登录成功", "欢迎回来，正在准备您的对话列表...");
    startCountdown(2, async () => {
      await userStore.onUserLogin(data.token!, true, goToHome);
    });
    return;
  }

  // 需要绑定
  if (needBind && data.oauthKey) {
    oauthInfo.value = {
      needBind: true,
      token: null,
      oauthKey: data.oauthKey,
      platform: platform.value,
      nickname: data.nickname ? decodeURIComponent(data.nickname) : null,
      avatar: data.avatar ? decodeURIComponent(data.avatar) : null,
      email: data.email ? decodeURIComponent(data.email) : null,
    };
    setStatus("need-bindoption", "选择操作", `该 ${platformName.value} 账号尚未绑定`);
    return;
  }

  // 其他错误
  setStatus("error", isBind ? "绑定失败" : "登录失败", decodeURIComponent(data.message || "授权验证失败，请重试"), 3, goBack);
}

// 处理绑定/注册成功
function handleBindSuccess(token: string, type: "register" | "link") {
  const msg = type === "register" ? "注册成功" : "绑定成功";
  const sub = type === "register" ? "欢迎加入，正在准备您的对话列表..." : "欢迎回来，正在准备您的对话列表...";
  setStatus("success", msg, sub);
  startCountdown(2, async () => {
    await userStore.onUserLogin(token, true, goToHome);
  });
}

function handleExpired() {
  setStatus("expired", "授权已过期", "OAuth 凭证已过期，请重新授权");
}

// 桌面端和移动端：监听深度链接回调
useOAuthDeepLink({
  autoListen: setting.isDesktop || setting.isMobile,
  onCallback: (payload: OAuthCallbackPayload) => {
    processCallbackResult({
      action: payload.action || undefined,
      error: payload.error || undefined,
      errorCode: payload.errorCode,
      message: payload.message || payload.error,
      needBind: payload.needBind,
      token: payload.token,
      oauthKey: payload.oauthKey,
      bindSuccess: payload.bindSuccess,
      nickname: payload.nickname,
      avatar: payload.avatar,
      email: payload.email,
    });
  },
});

// 页面加载时处理回调
onMounted(() => {
  const query = route.query;
  const hasResult = ["needBind", "token", "bindSuccess", "error", "oauthKey"].some(k => query[k] !== undefined);

  // 无回调参数时，桌面端等待深度链接，Web 端显示错误
  if (!hasResult) {
    if (!setting.isDesktop) {
      setStatus("error", "无效的回调", "缺少必要的授权参数，请重新登录", 3, goToLogin);
    }
    return;
  }

  // 处理 URL 参数
  processCallbackResult({
    action: query.action as string,
    error: query.error as string,
    errorCode: query.errorCode as string,
    message: query.message as string,
    needBind: query.needBind as string,
    token: query.token as string,
    oauthKey: query.oauthKey as string,
    bindSuccess: query.bindSuccess as string,
    nickname: query.nickname as string,
    avatar: query.avatar as string,
    email: query.email as string,
  });
});

onBeforeUnmount(() => {
  isUnmounted = true;
  clearCountdown();
});
</script>

<template>
  <div class="oauth-callback flex-row-c-c">
    <!-- 主容器 -->
    <Transition name="toggle" mode="out-in">
      <Loading
        v-if="status === 'loading'"
        key="loading"
        class="w-full"
        :message="message"
        :sub-message="subMessage"
        :icon="platformIcon"
        @cancel="goToLogin"
      />

      <Success
        v-else-if="status === 'success'"
        key="success"
        class="w-full"
        :message="message"
        :sub-message="subMessage"
        :countdown="countdown"
      />

      <Error
        v-else-if="status === 'error' || status === 'expired'"
        key="error"
        :message="message"
        class="w-full"
        :sub-message="subMessage"
        :type="status === 'expired' ? 'expired' : 'error'"
        @retry="retryAuth"
        @back="goToLogin"
      />

      <BindOption
        v-else-if="status === 'need-bindoption' && oauthInfo"
        key="need-bindoption"
        :oauth-info="oauthInfo"
        :platform-name="platformName"
        :platform-code="platform"
        class="w-full"
        :platform-icon="platformIcon"
        @success="handleBindSuccess"
        @expired="handleExpired"
        @back="goToLogin"
      />

      <AlreadyBound
        v-else-if="status === 'already-bound'"
        key="already-bound"
        class="w-full"
        :message="message"
        :sub-message="subMessage"
        @back="goToSettings"
        @login="goToLogin"
      />
    </Transition>
  </div>
</template>

<style scoped lang="scss">
// 过渡动画
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
