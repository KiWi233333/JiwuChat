<script lang="ts" setup>
import type { OAuthCallbackVO } from "~/composables/api/user/oauth";
import AlreadyBound from "~/components/oauth/AlreadyBound.vue";
import BindOption from "~/components/oauth/BindOption.vue";
import Error from "~/components/oauth/Error.vue";
import Loading from "~/components/oauth/Loading.vue";
import Success from "~/components/oauth/Success.vue";
import { bindOAuth, getAuthorizeUrl, oauthCallback, OAuthPlatformCode } from "~/composables/api/user/oauth";

const route = useRoute();
const userStore = useUserStore();

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
  handleCallback();
});

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
