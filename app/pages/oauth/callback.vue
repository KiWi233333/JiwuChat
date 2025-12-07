<script lang="ts" setup>
import type { OAuthCallbackVO } from "~/composables/api/user/oauth";
import type { OAuthCallbackPayload } from "~/composables/hooks/oauth/useDeepLink";
import AlreadyBound from "~/components/oauth/AlreadyBound.vue";
import BindOption from "~/components/oauth/BindOption.vue";
import Error from "~/components/oauth/Error.vue";
import Loading from "~/components/oauth/Loading.vue";
import Success from "~/components/oauth/Success.vue";
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

// OAuth 回调信息（用于绑定流程）
const oauthInfo = ref<OAuthCallbackVO | null>(null);

// 平台信息
const platform = computed(() => route.query.platform as OAuthPlatformCode);
const platformName = computed(() => {
  const names: Record<string, string> = {
    [OAuthPlatformCode.GITHUB]: "GitHub",
    [OAuthPlatformCode.GOOGLE]: "Google",
    [OAuthPlatformCode.GITEE]: "Gitee",
    [OAuthPlatformCode.WECHAT]: "微信",
  };
  return names[platform.value] || platform.value;
});

// 平台图标
const platformIcon = computed(() => {
  const icons: Record<string, string> = {
    [OAuthPlatformCode.GITHUB]: "/images/brand/github.svg",
    [OAuthPlatformCode.GOOGLE]: "/images/brand/google.svg",
    [OAuthPlatformCode.GITEE]: "/images/brand/gitee.svg",
    [OAuthPlatformCode.WECHAT]: "/images/brand/wechat.svg",
  };
  return icons[platform.value] || "i-solar:shield-check-broken";
});

// 倒计时
const countdown = ref(3);
let countdownTimer: ReturnType<typeof setInterval> | null = null;
let isUnmounted = false;

// 启动倒计时
function startCountdown(seconds: number, callback: () => void) {
  countdown.value = seconds;
  countdownTimer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      if (countdownTimer)
        clearInterval(countdownTimer);
      callback();
    }
  }, 1000);
}

// 重新授权
async function retryAuth() {
  status.value = "loading";
  message.value = "正在重新获取授权...";
  subMessage.value = "请稍候...";

  try {
    const res = await getAuthorizeUrl(platform.value);
    if (isUnmounted)
      return;

    if (res.code === StatusCode.SUCCESS && res.data) {
      window.location.href = res.data;
    }
    else {
      status.value = "error";
      message.value = "获取授权链接失败";
      subMessage.value = res.message || "请返回登录页重试";
    }
  }
  catch {
    status.value = "error";
    message.value = "网络请求失败";
    subMessage.value = "请检查网络后重试";
  }
}

// 返回登录页
function goToLogin() {
  navigateTo({
    path: "/login",
    replace: true,
  });
}

// 返回设置页
function goToSettings() {
  navigateTo({
    path: "/user/safe",
    replace: true,
  });
}

/**
 * 处理 OAuth 回调（后端中转模式）
 * 后端处理完 OAuth 后会 302 重定向到此页面，携带结果参数：
 * - 成功登录: ?needBind=false&token=xxx&platform=xxx
 * - 需要绑定: ?needBind=true&oauthKey=xxx&platform=xxx&nickname=xxx&avatar=xxx&email=xxx
 * - 绑定成功: ?bindSuccess=true&platform=xxx
 * - 错误: ?error=true&message=xxx
 */
function handleCallback() {
  const query = route.query;
  const action = query.action as string || "login";

  // 检查是否有错误
  if (query.error === "true") {
    status.value = "error";
    message.value = "授权失败";
    subMessage.value = decodeURIComponent(query.message as string || "未知错误");
    startCountdown(3, action === "bind" ? goToSettings : goToLogin);
    return;
  }

  // 处理绑定结果
  if (action === "bind") {
    handleBindResult();
    return;
  }

  // 处理登录结果
  handleLoginResult();
}

/**
 * 处理绑定结果（后端中转模式）
 */
function handleBindResult() {
  const query = route.query;

  // 绑定成功
  if (query.bindSuccess === "true") {
    status.value = "success";
    message.value = "绑定成功";
    subMessage.value = `${platformName.value} 账号已成功绑定`;
    startCountdown(2, goToSettings);
    return;
  }

  // 处理绑定错误码
  const errorCode = query.errorCode as string;
  if (errorCode === "OAUTH_ACCOUNT_ALREADY_BOUND") {
    status.value = "already-bound";
    message.value = "账号已被绑定";
    subMessage.value = `该 ${platformName.value} 账号已被其他用户绑定，请更换账号或联系客服`;
    return;
  }
  if (errorCode === "OAUTH_PLATFORM_ALREADY_BOUND") {
    status.value = "already-bound";
    message.value = "平台已绑定";
    subMessage.value = `您已绑定过 ${platformName.value}，如需更换请先解绑`;
    startCountdown(3, goToSettings);
    return;
  }
  if (errorCode === "OAUTH_CREDENTIAL_EXPIRED") {
    status.value = "expired";
    message.value = "授权已过期";
    subMessage.value = "OAuth 凭证已过期，请重新授权";
    return;
  }

  // 其他错误
  status.value = "error";
  message.value = "绑定失败";
  subMessage.value = decodeURIComponent(query.message as string || "未知错误，请重试");
  startCountdown(3, goToSettings);
}

/**
 * 处理登录结果（后端中转模式）
 */
function handleLoginResult() {
  const query = route.query;
  const needBind = query.needBind as string;

  // 无需绑定，直接登录
  if (needBind === "false" && query.token) {
    const token = query.token as string;
    status.value = "success";
    message.value = "登录成功";
    subMessage.value = "欢迎回来，正在准备您的对话列表...";

    startCountdown(2, async () => {
      await userStore.onUserLogin(token, true, () => {
        navigateTo({
          path: "/",
          replace: true,
        });
      });
    });
    return;
  }

  // 需要绑定，显示选择界面
  if (needBind === "true" && query.oauthKey) {
    oauthInfo.value = {
      needBind: true,
      token: null,
      oauthKey: query.oauthKey as string,
      platform: platform.value,
      nickname: query.nickname ? decodeURIComponent(query.nickname as string) : null,
      avatar: query.avatar ? decodeURIComponent(query.avatar as string) : null,
      email: query.email ? decodeURIComponent(query.email as string) : null,
    };
    status.value = "need-bindoption";
    message.value = "选择操作";
    subMessage.value = `该 ${platformName.value} 账号尚未绑定`;
    return;
  }

  // 处理错误码
  const errorCode = query.errorCode as string;
  if (errorCode === "OAUTH_CREDENTIAL_EXPIRED") {
    status.value = "expired";
    message.value = "授权已过期";
    subMessage.value = "OAuth 凭证已过期，请重新授权";
    return;
  }

  // 其他错误
  status.value = "error";
  message.value = "登录失败";
  subMessage.value = decodeURIComponent(query.message as string || "授权验证失败，请重试");
  startCountdown(3, goToLogin);
}

// 处理绑定/注册成功
function handleBindSuccess(data: any, type: "register" | "link") {
  status.value = "success";
  message.value = type === "register" ? "注册成功" : "绑定成功";
  subMessage.value = type === "register" ? "欢迎加入，正在准备您的对话列表..." : "欢迎回来，正在准备您的对话列表...";

  startCountdown(2, async () => {
    await userStore.onUserLogin(data, true, () => {
      navigateTo({
        path: "/",
        replace: true,
      });
    });
  });
}

function handleExpired() {
  status.value = "expired";
  message.value = "授权已过期";
  subMessage.value = "OAuth 凭证已过期，请重新授权";
}

/**
 * 页面加载时处理回调（后端中转模式）
 *
 * 后端会 302 重定向到此页面，携带结果参数：
 * - Web 端: 直接解析 URL 参数
 * - 桌面端: 后端重定向到 jiwuchat://oauth/callback，由深链接监听处理
 */
onMounted(() => {
  const query = route.query;

  // 检查是否有回调结果参数（后端中转返回的结果）
  const hasResult = query.needBind !== undefined
    || query.token !== undefined
    || query.bindSuccess !== undefined
    || query.error !== undefined
    || query.oauthKey !== undefined;

  if (hasResult) {
    // 有结果参数，处理回调
    handleCallback();
    return;
  }

  // 桌面端：检查是否有 sessionStorage 中的 OAuth 数据
  if (query.needBind === "true" && setting.isDesktop) {
    handleSessionStorageCallback();
  }
});

// 处理 sessionStorage 中的 OAuth 数据（桌面端 LoginForm 深链接回调后跳转）
function handleSessionStorageCallback() {
  const storedData = sessionStorage.getItem("oauth_callback_data");
  if (!storedData) {
    status.value = "error";
    message.value = "数据丢失";
    subMessage.value = "OAuth 回调数据不存在，请重新登录";
    startCountdown(3, goToLogin);
    return;
  }

  try {
    const data = JSON.parse(storedData);
    // 清除已使用的数据
    sessionStorage.removeItem("oauth_callback_data");

    if (data.needBind && data.oauthKey) {
      // 构造 OAuthCallbackVO 格式的数据
      oauthInfo.value = {
        needBind: true,
        token: null,
        oauthKey: data.oauthKey,
        platform: data.platform,
        nickname: data.nickname || null,
        avatar: data.avatar || null,
        email: data.email || null,
      };
      status.value = "need-bindoption";
      message.value = "选择操作";
      subMessage.value = `该 ${platformName.value} 账号尚未绑定`;
    }
    else {
      status.value = "error";
      message.value = "数据错误";
      subMessage.value = "OAuth 回调数据格式不正确";
      startCountdown(3, goToLogin);
    }
  }
  catch (error) {
    console.error("[OAuth Callback] 解析 sessionStorage 数据失败:", error);
    status.value = "error";
    message.value = "数据解析失败";
    subMessage.value = "请重新登录";
    startCountdown(3, goToLogin);
  }
}

// 桌面端：监听深度链接回调
const { isListening } = useOAuthDeepLink({
  autoListen: setting.isDesktop,
  onCallback: handleDeepLinkCallback,
});

/**
 * 处理深度链接回调（桌面端专用 - 后端中转模式）
 * 后端处理完 OAuth 后会 302 重定向到 jiwuchat://oauth/callback，携带结果参数
 */
function handleDeepLinkCallback(payload: OAuthCallbackPayload) {
  console.log("[OAuth Callback] 收到深度链接回调:", payload);

  const action = payload.action || "login";

  // 检查是否有错误
  if (payload.error === "true") {
    status.value = "error";
    message.value = "授权失败";
    subMessage.value = payload.message ? decodeURIComponent(payload.message) : "未知错误";
    startCountdown(3, action === "bind" ? goToSettings : goToLogin);
    return;
  }

  // 处理绑定结果
  if (action === "bind") {
    handleDeepLinkBindResult(payload);
    return;
  }

  // 处理登录结果
  handleDeepLinkLoginResult(payload);
}

/**
 * 处理深度链接绑定结果
 */
function handleDeepLinkBindResult(payload: OAuthCallbackPayload) {
  // 绑定成功
  if (payload.bindSuccess === true) {
    status.value = "success";
    message.value = "绑定成功";
    subMessage.value = `${platformName.value} 账号已成功绑定`;
    startCountdown(2, goToSettings);
    return;
  }

  // 处理绑定错误码
  if (payload.errorCode === "OAUTH_ACCOUNT_ALREADY_BOUND") {
    status.value = "already-bound";
    message.value = "账号已被绑定";
    subMessage.value = `该 ${platformName.value} 账号已被其他用户绑定`;
    return;
  }
  if (payload.errorCode === "OAUTH_PLATFORM_ALREADY_BOUND") {
    status.value = "already-bound";
    message.value = "平台已绑定";
    subMessage.value = `您已绑定过 ${platformName.value}，如需更换请先解绑`;
    startCountdown(3, goToSettings);
    return;
  }

  // 其他错误
  status.value = "error";
  message.value = "绑定失败";
  subMessage.value = payload.message ? decodeURIComponent(payload.message) : "未知错误，请重试";
  startCountdown(3, goToSettings);
}

/**
 * 处理深度链接登录结果
 */
function handleDeepLinkLoginResult(payload: OAuthCallbackPayload) {
  // 无需绑定，直接登录
  if (payload.needBind === false && payload.token) {
    status.value = "success";
    message.value = "登录成功";
    subMessage.value = "欢迎回来，正在准备您的对话列表...";

    startCountdown(2, async () => {
      await userStore.onUserLogin(payload.token!, true, () => {
        navigateTo({
          path: "/",
          replace: true,
        });
      });
    });
    return;
  }

  // 需要绑定，显示选择界面
  if (payload.needBind === true && payload.oauthKey) {
    oauthInfo.value = {
      needBind: true,
      token: null,
      oauthKey: payload.oauthKey,
      platform: payload.platform,
      nickname: payload.nickname ? decodeURIComponent(payload.nickname) : null,
      avatar: payload.avatar ? decodeURIComponent(payload.avatar) : null,
      email: payload.email ? decodeURIComponent(payload.email) : null,
    };
    status.value = "need-bindoption";
    message.value = "选择操作";
    subMessage.value = `该 ${platformName.value} 账号尚未绑定`;
    return;
  }

  // 处理错误码
  if (payload.errorCode === "OAUTH_CREDENTIAL_EXPIRED") {
    status.value = "expired";
    message.value = "授权已过期";
    subMessage.value = "OAuth 凭证已过期，请重新授权";
    return;
  }

  // 其他错误
  status.value = "error";
  message.value = "登录失败";
  subMessage.value = payload.message ? decodeURIComponent(payload.message) : "授权验证失败，请重试";
  startCountdown(3, goToLogin);
}

// 获取平台名称
function getPlatformName(platform: OAuthPlatformCode): string {
  const names: Record<string, string> = {
    [OAuthPlatformCode.GITHUB]: "GitHub",
    [OAuthPlatformCode.GOOGLE]: "Google",
    [OAuthPlatformCode.GITEE]: "Gitee",
    [OAuthPlatformCode.WECHAT]: "微信",
  };
  return names[platform] || platform;
}

onBeforeUnmount(() => {
  isUnmounted = true;
  if (countdownTimer)
    clearInterval(countdownTimer);
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
