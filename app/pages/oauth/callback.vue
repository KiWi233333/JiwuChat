<script lang="ts" setup>
import type { OAuthCallbackVO } from "~/composables/api/user/oauth";
import type { OAuthCallbackPayload } from "~/composables/hooks/oauth/useDeepLink";
import AlreadyBound from "~/components/oauth/AlreadyBound.vue";
import BindOption from "~/components/oauth/BindOption.vue";
import Error from "~/components/oauth/Error.vue";
import Loading from "~/components/oauth/Loading.vue";
import Success from "~/components/oauth/Success.vue";
import { bindOAuth, getAuthorizeUrl, oauthCallback, OAuthPlatformCode } from "~/composables/api/user/oauth";
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

// 处理 OAuth 回调
async function handleCallback() {
  const code = route.query.code as string;
  const state = route.query.state as string;
  const action = route.query.action as string;

  if (!platform.value || !code || !state) {
    status.value = "error";
    message.value = "参数错误";
    subMessage.value = "缺少必要参数，无法继续处理";
    return;
  }

  try {
    if (action === "bind") {
      // 绑定流程（用户已登录，在设置页发起的绑定）
      if (!userStore.isLogin) {
        status.value = "error";
        message.value = "未登录";
        subMessage.value = "请先登录后再进行绑定操作";
        startCountdown(2, goToLogin);
        return;
      }

      // 使用 URL 对象构建 redirectUri
      const redirectUrl = new URL("/oauth/callback", window.location.origin);
      redirectUrl.searchParams.set("platform", platform.value);
      redirectUrl.searchParams.set("action", "bind");
      const redirectUri = redirectUrl.toString();

      const res = await bindOAuth(platform.value, code, redirectUri);
      if (isUnmounted)
        return;

      if (res.code === StatusCode.SUCCESS) {
        status.value = "success";
        message.value = "绑定成功";
        subMessage.value = `${platformName.value} 账号已成功绑定`;
        startCountdown(2, goToSettings);
      }
      else if (res.code === StatusCode.OAUTH_ACCOUNT_ALREADY_BOUND) {
        status.value = "already-bound";
        message.value = "账号已被绑定";
        subMessage.value = `该 ${platformName.value} 账号已被其他用户绑定，请更换账号或联系客服`;
      }
      else if (res.code === StatusCode.OAUTH_PLATFORM_ALREADY_BOUND) {
        status.value = "already-bound";
        message.value = "平台已绑定";
        subMessage.value = `您已绑定过 ${platformName.value}，如需更换请先解绑`;
        startCountdown(3, goToSettings);
      }
      else if (res.code === StatusCode.OAUTH_CREDENTIAL_EXPIRED) {
        status.value = "expired";
        message.value = "授权已过期";
        subMessage.value = "OAuth 凭证已过期，请重新授权";
      }
      else {
        status.value = "error";
        message.value = "绑定失败";
        subMessage.value = res.message || "未知错误，请重试";
        startCountdown(3, goToSettings);
      }
    }
    else {
      // 登录流程
      // 使用 URL 对象构建 redirectUri
      const redirectUrl = new URL("/oauth/callback", window.location.origin);
      redirectUrl.searchParams.set("platform", platform.value);
      redirectUrl.searchParams.set("action", "login");
      const redirectUri = redirectUrl.toString();

      const res = await oauthCallback(platform.value, code, state, redirectUri);
      if (isUnmounted)
        return;

      if (res.code === StatusCode.SUCCESS && res.data) {
        // 判断是否需要绑定
        if (!res.data.needBind && res.data.token) {
          // 无需绑定，直接登录
          status.value = "success";
          message.value = "登录成功";
          subMessage.value = "欢迎回来，正在准备您的对话列表...";

          startCountdown(2, async () => {
            await userStore.onUserLogin(res.data.token!, true, () => {
              navigateTo({
                path: "/",
                replace: true,
              });
            });
          });
        }
        else if (res.data.needBind && res.data.oauthKey) {
          // 需要绑定，保存 oauthInfo 并显示选择界面
          oauthInfo.value = res.data;
          status.value = "need-bindoption";
          message.value = "选择操作";
          subMessage.value = `该 ${platformName.value} 账号尚未绑定`;
        }
        else {
          status.value = "error";
          message.value = "登录失败";
          subMessage.value = "返回数据异常，请重试";
          startCountdown(3, goToLogin);
        }
      }
      else if (res.code === StatusCode.OAUTH_CREDENTIAL_EXPIRED) {
        status.value = "expired";
        message.value = "授权已过期";
        subMessage.value = "OAuth 凭证已过期，请重新授权";
      }
      else {
        status.value = "error";
        message.value = "登录失败";
        subMessage.value = res.message || "授权验证失败，请重试";
        startCountdown(3, goToLogin);
      }
    }
  }
  catch (error: any) {
    console.error("OAuth 回调处理失败:", error);
    if (isUnmounted)
      return;

    status.value = "error";
    message.value = "处理异常";
    subMessage.value = error?.message || "网络请求失败，请检查网络";

    startCountdown(3, () => {
      if (action === "bind") {
        goToSettings();
      }
      else {
        goToLogin();
      }
    });
  }
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

// 页面加载时处理回调
onMounted(() => {
  const code = route.query.code as string;
  const state = route.query.state as string;
  const fromDesktop = route.query.from === "desktop";

  // 如果有授权码
  if (code && state) {
    // 检查是否来自桌面端，需要跳转到深度链接
    if (fromDesktop) {
      redirectToDeepLink(code, state);
      return;
    }
    // Web 端正常处理
    handleCallback();
    return;
  }

  // 桌面端：检查是否有 sessionStorage 中的 OAuth 数据（来自 LoginForm 的深链接回调）
  if (route.query.needBind === "true" && setting.isDesktop) {
    handleSessionStorageCallback();
  }
});

// 跳转到深度链接（桌面端中间页）
function redirectToDeepLink(code: string, state: string) {
  const platformValue = route.query.platform as string;
  const action = route.query.action as string || "login";

  // 构建深度链接
  const deepLink = `jiwuchat://oauth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}&platform=${platformValue}&action=${action}`;

  console.log("[OAuth Callback] 桌面端跳转深度链接:", deepLink);

  // 更新页面状态
  status.value = "loading";
  message.value = "正在返回应用...";
  subMessage.value = "如果没有自动跳转，请手动返回 JiwuChat 应用";

  // 跳转到深度链接
  window.location.href = deepLink;

  // 3秒后如果还在页面，显示手动提示
  setTimeout(() => {
    if (!isUnmounted) {
      message.value = "请手动返回应用";
      subMessage.value = "点击下方按钮或手动打开 JiwuChat 应用完成登录";
    }
  }, 3000);
}

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

// 处理深度链接回调（桌面端专用）
async function handleDeepLinkCallback(payload: OAuthCallbackPayload) {
  console.log("[OAuth Callback] 收到深度链接回调:", payload);

  // 检查错误
  if (payload.error) {
    status.value = "error";
    message.value = "授权失败";
    subMessage.value = payload.error;
    startCountdown(3, goToLogin);
    return;
  }

  // 检查必要参数
  if (!payload.code || !payload.state || !payload.platform) {
    status.value = "error";
    message.value = "参数错误";
    subMessage.value = "回调参数不完整，无法继续处理";
    startCountdown(3, goToLogin);
    return;
  }

  // State 验证由后端完成，根据 action 处理
  const action = payload.action || "login";

  if (action === "bind") {
    await handleBindCallback(payload.platform, payload.code, payload.state);
  }
  else {
    await handleLoginCallback(payload.platform, payload.code, payload.state);
  }
}

// 处理绑定回调（桌面端深度链接）
async function handleBindCallback(platform: OAuthPlatformCode, code: string, state: string) {
  if (!userStore.isLogin) {
    status.value = "error";
    message.value = "未登录";
    subMessage.value = "请先登录后再进行绑定操作";
    startCountdown(2, goToLogin);
    return;
  }

  // 构建回调 URI（与发起授权时一致，使用 Web 地址）
  const redirectUrl = new URL(`${window.location.origin}/oauth/callback`);
  redirectUrl.searchParams.set("platform", platform);
  redirectUrl.searchParams.set("action", "bind");
  redirectUrl.searchParams.set("from", "desktop");
  const redirectUri = redirectUrl.toString();

  try {
    const res = await bindOAuth(platform, code, redirectUri);

    if (res.code === StatusCode.SUCCESS) {
      status.value = "success";
      message.value = "绑定成功";
      subMessage.value = `${getPlatformName(platform)} 账号已成功绑定`;
      startCountdown(2, goToSettings);
    }
    else if (res.code === StatusCode.OAUTH_ACCOUNT_ALREADY_BOUND) {
      status.value = "already-bound";
      message.value = "账号已被绑定";
      subMessage.value = `该 ${getPlatformName(platform)} 账号已被其他用户绑定`;
    }
    else if (res.code === StatusCode.OAUTH_PLATFORM_ALREADY_BOUND) {
      status.value = "already-bound";
      message.value = "平台已绑定";
      subMessage.value = `您已绑定过 ${getPlatformName(platform)}，如需更换请先解绑`;
      startCountdown(3, goToSettings);
    }
    else {
      status.value = "error";
      message.value = "绑定失败";
      subMessage.value = res.message || "未知错误，请重试";
      startCountdown(3, goToSettings);
    }
  }
  catch (error: any) {
    console.error("[OAuth Callback] 绑定失败:", error);
    status.value = "error";
    message.value = "处理异常";
    subMessage.value = error?.message || "网络请求失败";
    startCountdown(3, goToSettings);
  }
}

// 处理登录回调（桌面端深度链接）
async function handleLoginCallback(platform: OAuthPlatformCode, code: string, state: string) {
  // 构建回调 URI（与发起授权时一致，使用 Web 地址）
  const redirectUrl = new URL(`${window.location.origin}/oauth/callback`);
  redirectUrl.searchParams.set("platform", platform);
  redirectUrl.searchParams.set("action", "login");
  redirectUrl.searchParams.set("from", "desktop");
  const redirectUri = redirectUrl.toString();

  try {
    const res = await oauthCallback(platform, code, state, redirectUri);

    if (res.code === StatusCode.SUCCESS && res.data) {
      if (!res.data.needBind && res.data.token) {
        // 无需绑定，直接登录
        status.value = "success";
        message.value = "登录成功";
        subMessage.value = "欢迎回来，正在准备您的对话列表...";

        startCountdown(2, async () => {
          await userStore.onUserLogin(res.data.token!, true, () => {
            navigateTo({ path: "/", replace: true });
          });
        });
      }
      else if (res.data.needBind && res.data.oauthKey) {
        // 需要绑定，显示选择界面
        oauthInfo.value = res.data;
        status.value = "need-bindoption";
        message.value = "选择操作";
        subMessage.value = `该 ${getPlatformName(platform)} 账号尚未绑定`;
      }
      else {
        status.value = "error";
        message.value = "登录失败";
        subMessage.value = "返回数据异常，请重试";
        startCountdown(3, goToLogin);
      }
    }
    else if (res.code === StatusCode.OAUTH_CREDENTIAL_EXPIRED) {
      status.value = "expired";
      message.value = "授权已过期";
      subMessage.value = "OAuth 凭证已过期，请重新授权";
    }
    else {
      status.value = "error";
      message.value = "登录失败";
      subMessage.value = res.message || "授权验证失败，请重试";
      startCountdown(3, goToLogin);
    }
  }
  catch (error: any) {
    console.error("[OAuth Callback] 登录失败:", error);
    status.value = "error";
    message.value = "处理异常";
    subMessage.value = error?.message || "网络请求失败";
    startCountdown(3, goToLogin);
  }
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
