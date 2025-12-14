<script lang="ts" setup>
import type { OAuthPlatformCode, OAuthPlatformVO, UserOAuthVO } from "~/composables/api/user/oauth";
import type { OAuthCallbackPayload } from "~/composables/hooks/oauth/useDeepLink";
import {
  getAuthorizeUrl,
  getBindList,
  getOAuthPlatforms,
  unbindOAuth,
} from "~/composables/api/user/oauth";
import { useOAuthDeepLink } from "~/composables/hooks/oauth/useDeepLink";

const user = useUserStore();
const setting = useSettingStore();
const showMarkPhone = ref(true);

/**
 * 重新加载用户信息
 */
const isLoading = ref<boolean>(false);
async function reloadUserInfo() {
  isLoading.value = true;
  user.loadUserInfo(user.token).finally(() => isLoading.value = false);
}
// 展示表单
const form = ref({
  showUpdatePwd: false,
  showUpdatePhone: false,
  showUpdateEmail: false,
});

watch(
  form,
  ({ showUpdatePwd, showUpdatePhone, showUpdateEmail }) => {
    if (showUpdatePwd || showUpdatePhone || showUpdateEmail) {
      reloadUserInfo();
    }
  },
  { immediate: true, deep: true },
);

// OAuth 相关状态
const oauthPlatforms = ref<OAuthPlatformVO[]>([]);
const bindRecords = ref<UserOAuthVO[]>([]);
const isLoadingOAuth = ref(false);
const bindingPlatform = ref<OAuthPlatformCode | null>(null);

// 获取平台绑定状态
function getBindStatus(platform: OAuthPlatformCode): UserOAuthVO | null {
  return bindRecords.value.find(item => item.platform === platform) || null;
}

// 加载 OAuth 数据
async function loadOAuthData() {
  if (!user.isLogin)
    return;

  try {
    isLoadingOAuth.value = true;
    const [platformsRes, bindListRes] = await Promise.all([
      getOAuthPlatforms(),
      getBindList(),
    ]);

    if (platformsRes.code === StatusCode.SUCCESS) {
      oauthPlatforms.value = platformsRes.data.filter(p => p.enabled);
    }

    if (bindListRes.code === StatusCode.SUCCESS) {
      bindRecords.value = bindListRes.data;
    }
  }
  catch (error) {
    console.error("加载 OAuth 数据失败:", error);
  }
  finally {
    isLoadingOAuth.value = false;
  }
}

// 处理绑定回调结果（方案 B：后端直接完成绑定）
async function handleBindCallback(data: {
  platform?: string;
  action?: string;
  error?: string;
  errorCode?: string;
  message?: string;
  bindSuccess?: boolean | string;
}) {
  const platform = data.platform as OAuthPlatformCode;

  // 错误码映射
  const errorMessages: Record<string, string> = {
    OAUTH_ACCOUNT_ALREADY_BOUND: `该 ${platform} 账号已被其他用户绑定`,
    OAUTH_PLATFORM_ALREADY_BOUND: `您已绑定过 ${platform}，如需更换请先解绑`,
    TOKEN_EXPIRED: "登录已过期，请重新登录后再绑定",
    TOKEN_INVALID: "登录状态无效，请重新登录",
    USER_NOT_FOUND: "用户不存在",
  };

  // 处理错误
  if (data.error || data.errorCode) {
    const msg = errorMessages[data.errorCode || ""]
      || (data.message ? decodeURIComponent(data.message) : "绑定失败");
    ElMessage.error(msg);
    bindingPlatform.value = null;
    return;
  }

  // 绑定成功（bindSuccess 为 true 或 "true"）
  if (data.bindSuccess === true || data.bindSuccess === "true") {
    ElMessage.success("绑定成功");
    bindingPlatform.value = null;
    await loadOAuthData();
    await reloadUserInfo();
    return;
  }

  // 兼容处理：后端可能没有显式返回 bindSuccess，尝试刷新绑定列表判断
  if (platform && !data.error && !data.errorCode) {
    const oldBindCount = bindRecords.value.length;
    await loadOAuthData();
    const newBindCount = bindRecords.value.length;

    // 如果绑定记录增加了，说明绑定成功
    if (newBindCount > oldBindCount || getBindStatus(platform)) {
      ElMessage.success("绑定成功");
      bindingPlatform.value = null;
      await reloadUserInfo();
      return;
    }
  }

  // 未知情况
  ElMessage.error("绑定失败，请稍后重试");
  bindingPlatform.value = null;
}

// 构建绑定回调 URI
function buildBindRedirectUri(platform: OAuthPlatformCode): string {
  const baseUrl = window.location.origin;
  const isDesktop = setting.isDesktop;

  if (isDesktop) {
    // 桌面端使用深度链接
    return `jiwuchat://oauth/callback?platform=${platform}&action=bind`;
  }
  // Web 端回调到当前页面
  return `${baseUrl}/user/safe?platform=${platform}&action=bind`;
}

// 桌面端深度链接监听
useOAuthDeepLink({
  autoListen: setting.isDesktop,
  onCallback: async (payload: OAuthCallbackPayload) => {
    // 只处理绑定动作
    if (payload.action !== "bind")
      return;

    await handleBindCallback({
      platform: payload.platform || undefined,
      action: payload.action,
      error: payload.error,
      errorCode: payload.errorCode,
      message: payload.message,
      bindSuccess: payload.bindSuccess,
    });
  },
});

// 绑定第三方账号
async function handleBind(platform: OAuthPlatformCode) {
  bindingPlatform.value = platform;

  try {
    // 构建回调 URI
    const redirectUri = buildBindRedirectUri(platform);

    // 获取授权 URL（传递 action=bind，后端会从 Token 获取 userId）
    const res = await getAuthorizeUrl(platform, redirectUri, "bind");
    if (res.code !== StatusCode.SUCCESS || !res.data) {
      ElMessage.error(res.message || "获取授权地址失败");
      bindingPlatform.value = null;
      return;
    }

    // 跳转到授权页面
    if (setting.isDesktop) {
      // 桌面端打开外部浏览器
      const { open } = await import("@tauri-apps/plugin-shell");
      await open(res.data);
    }
    else {
      // Web 端直接跳转
      window.location.href = res.data;
    }
  }
  catch (error: any) {
    console.error("绑定失败:", error);
    ElMessage.error(error?.message || "绑定失败，请稍后重试");
    bindingPlatform.value = null;
  }
}

// 解绑第三方账号
async function handleUnbind(platform: OAuthPlatformCode) {
  try {
    ElMessageBox.confirm(
      `确定要解绑 ${platform} 账号吗？`,
      "确认解绑",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      },
    ).then(async () => {
      const res = await unbindOAuth(platform);
      if (res.code === StatusCode.SUCCESS) {
        ElMessage.success("解绑成功");
        await loadOAuthData();
        await reloadUserInfo();
      }
    }).catch(() => {});
  }
  catch (error: any) {
    console.error("解绑失败:", error);
    ElMessage.error(error?.message || "解绑失败，请稍后重试");
  }
}

// Web 端：处理 URL 参数回调
const route = useRoute();
onMounted(() => {
  // 检查是否有绑定回调参数
  const query = route.query;
  if (query.action === "bind" && query.platform) {
    // 清除 URL 参数（避免刷新时重复处理）
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, "", cleanUrl);

    // 处理绑定回调
    handleBindCallback({
      platform: query.platform as string,
      action: query.action as string,
      error: query.error as string,
      errorCode: query.errorCode as string,
      message: query.message as string,
      bindSuccess: query.bindSuccess as string,
    });
  }

  // 加载 OAuth 数据
  if (user.isLogin) {
    loadOAuthData();
  }
});
</script>

<template>
  <div class="flex flex-col">
    <div my-4 block text-sm>
      <i i-solar:shield-check-broken mr-2 p-2.5 />
      修改信息
    </div>
    <!-- 用户信息 -->
    <div
      class="group flex flex-col card-default p-4 sm:(bg-transparent p-0)"
      flex flex-1 flex-col
    >
      <div class="flex items-center">
        <CardAvatar class="h-12 w-12 border-default-2 card-default rounded-1/2" :src="BaseUrlImg + user.userInfo.avatar" />
        <p class="ml-3 block font-500">
          {{ user.userInfo.username }}
        </p>
        <i
          opacity-0
          transition-300
          group-hover:opacity-100
          class="i-solar:refresh-outline ml-a cursor-pointer bg-theme-info px-3 transition-300 hover:rotate-180"
          @click="reloadUserInfo"
        />
      </div>
      <!-- 密码 -->
      <div ml-1 mt-6 flex-row-bt-c>
        <small>
          密&emsp;码：
          <small opacity-80>************</small>
        </small>
        <small
          class="cursor-pointer transition-300 hover:text-theme-primary"
          @click="form.showUpdatePwd = true"
        >
          修改密码
        </small>
      </div>
      <!-- 手机号 -->
      <div ml-1 mt-6 flex-row-bt-c>
        <small>
          手机号：
          <small
            opacity-80
            :class="{ 'text-red-5': !user.userInfo.phone }"
          >
            {{ (showMarkPhone ? user.markPhone : user.userInfo.phone) || "还未绑定" }}
          </small>
        </small>
        <small
          class="cursor-pointer transition-300 hover:text-theme-primary"
          @click="form.showUpdatePhone = true"
        >
          {{ user.userInfo.phone ? "修改手机号" : "绑定" }}
        </small>
      </div>
      <!-- 邮箱 -->
      <div
        ml-1 mt-6 flex-row-bt-c
      >
        <small>
          邮&emsp;箱：
          <small
            opacity-80
            :class="{ 'text-red-5': !user.userInfo.email }"
          >
            {{ user.userInfo.email || "还未绑定" }}
          </small>
        </small>
        <small
          class="cursor-pointer transition-300 hover:text-theme-primary"
          @click="form.showUpdateEmail = true"
        >
          {{ user.userInfo.email ? "修改邮箱" : "绑定" }}
        </small>
      </div>
      <!-- 第三方账号 -->
      <div
        v-if="oauthPlatforms.length > 0"
        class="ml-1 mt-6 flex flex-col gap-6"
      >
        <div flex-row-bt-c>
          <small>第三方账号：</small>
        </div>
        <div
          v-loading="isLoadingOAuth"
          class="flex flex-col gap-6"
        >
          <div
            v-for="platform in oauthPlatforms"
            :key="platform.code"
            class="flex-row-bt-c"
          >
            <div class="flex items-center gap-2">
              <img
                :src="getOAuthPlatformIcon(platform.code)"
                :alt="platform.name"
                class="h-5 w-5"
              >
              <small>{{ platform.name }}</small>
              <small
                v-if="getBindStatus(platform.code)"
                opacity-60
                class="ml-2"
              >
                {{ getBindStatus(platform.code)?.nickname || "已绑定" }}
              </small>
            </div>
            <small
              v-if="getBindStatus(platform.code)"
              class="cursor-pointer text-red-5 transition-300 hover:text-red-6"
              @click="handleUnbind(platform.code)"
            >
              解绑
            </small>
            <small
              v-else
              class="cursor-pointer transition-300 hover:text-theme-primary"
              @click="handleBind(platform.code)"
            >
              绑定
            </small>
          </div>
        </div>
      </div>
      <div
        mt-a
        w-full
      >
        <!-- 退出 -->
        <ElDivider class="dark:opacity-20" />
        <div
          mb-1 flex-row-bt-c justify-end
        >
          <el-text
            style="margin-left: 1rem"
            class="cursor-pointer transition-300 hover:text-[var(--el-color-primar)y]"
            @click.stop="navigateTo('/user')"
          >
            编辑资料
          </el-text>
          <el-text
            style="margin-left: 1rem"
            class="cursor-pointer transition-300 hover:text-[var(--el-color-primar)y]"
            type="danger"
            @click="user.exitLogin"
          >
            退出登录
          </el-text>
        </div>
      </div>
    </div>
    <Teleport to="body">
      <UserSafeDialog v-model="form" />
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
</style>
