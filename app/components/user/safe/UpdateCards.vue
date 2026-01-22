<script lang="ts">
import type { OAuthPlatformCode, OAuthPlatformVO, UserOAuthVO } from "~/composables/api/user/oauth";
import type { OAuthCallbackPayload } from "~/composables/hooks/oauth/useDeepLink";
</script>

<script lang="ts" setup>
import dayjs from "dayjs";
import {
  getAuthorizeUrl,
  getBindList,
  getOAuthPlatforms,
  unbindOAuth,
} from "~/composables/api/user/oauth";
import { useOAuthDeepLink } from "~/composables/hooks/oauth/useDeepLink";

export interface UserSafeUpdateCardsProps {
  isAnim?: boolean
}

const {
  isAnim = true,
} = defineProps<UserSafeUpdateCardsProps>();

const user = useUserStore();
const setting = useSettingStore();

const getCreateTime = computed(() => dayjs(user.userInfo.createTime).format("YYYY-MM-DD") || "未知");

// 表单显示状态
const form = ref({
  showUpdatePwd: false,
  showUpdatePhone: false,
  showUpdateEmail: false,
});

// 重新加载用户信息
const isLoading = ref<boolean>(false);
async function reloadUserInfo() {
  isLoading.value = true;
  user.loadUserInfo(user.token).finally(() => isLoading.value = false);
}

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

// 处理绑定回调结果
async function handleBindCallback(data: {
  platform?: string;
  action?: string;
  error?: string;
  errorCode?: string;
  message?: string;
  bindSuccess?: boolean | string;
}) {
  const platform = data.platform as OAuthPlatformCode;

  const errorMessages: Record<string, string> = {
    OAUTH_ACCOUNT_ALREADY_BOUND: `该 ${platform} 账号已被其他用户绑定`,
    OAUTH_PLATFORM_ALREADY_BOUND: `您已绑定过 ${platform}，如需更换请先解绑`,
    TOKEN_EXPIRED: "登录已过期，请重新登录后再绑定",
    TOKEN_INVALID: "登录状态无效，请重新登录",
    USER_NOT_FOUND: "用户不存在",
  };

  if (data.error || data.errorCode) {
    const msg = errorMessages[data.errorCode || ""]
      || (data.message ? decodeURIComponent(data.message) : "绑定失败");
    ElMessage.error(msg);
    bindingPlatform.value = null;
    return;
  }

  if (data.bindSuccess === true || data.bindSuccess === "true") {
    ElMessage.success("绑定成功");
    bindingPlatform.value = null;
    await loadOAuthData();
    await reloadUserInfo();
    return;
  }

  if (platform && !data.error && !data.errorCode) {
    const oldBindCount = bindRecords.value.length;
    await loadOAuthData();
    const newBindCount = bindRecords.value.length;

    if (newBindCount > oldBindCount || getBindStatus(platform)) {
      ElMessage.success("绑定成功");
      bindingPlatform.value = null;
      await reloadUserInfo();
      return;
    }
  }

  ElMessage.error("绑定失败，请稍后重试");
  bindingPlatform.value = null;
}

// 构建绑定回调 URI
function buildBindRedirectUri(platform: OAuthPlatformCode): string {
  const baseUrl = window.location.origin;
  const isDesktop = setting.isDesktop;
  const isMobile = setting.isMobile;

  if (isDesktop || isMobile) {
    return `jiwuchat://oauth/callback?platform=${platform}&action=bind`;
  }
  return `${baseUrl}/user/safe?platform=${platform}&action=bind`;
}

// 深度链接监听
useOAuthDeepLink({
  autoListen: setting.isDesktop || setting.isMobile,
  onCallback: async (payload: OAuthCallbackPayload) => {
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
    const redirectUri = buildBindRedirectUri(platform);
    const res = await getAuthorizeUrl(platform, redirectUri, "bind");
    if (res.code !== StatusCode.SUCCESS || !res.data) {
      ElMessage.error(res.message || "获取授权地址失败");
      bindingPlatform.value = null;
      return;
    }

    if (setting.isDesktop || setting.isMobile) {
      const { open } = await import("@tauri-apps/plugin-shell");
      await open(res.data);
    }
    else {
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
  const query = route.query;
  if (query.action === "bind" && query.platform) {
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, "", cleanUrl);

    handleBindCallback({
      platform: query.platform as string,
      action: query.action as string,
      error: query.error as string,
      errorCode: query.errorCode as string,
      message: query.message as string,
      bindSuccess: query.bindSuccess as string,
    });
  }

  if (user.isLogin) {
    loadOAuthData();
  }
});
</script>

<template>
  <div
    class="flex flex-col gap-3"
    style="--anima: blur-in;--anima-duration: 200ms;"
    :data-fade="isAnim"
  >
    <!-- 用户信息卡片 -->
    <div class="flex items-center gap-3 border-default-2 rounded-xl card-bg-color p-4 shadow-sm">
      <CardAvatar
        class="h-12 w-12 shrink-0 rounded-full"
        :src="BaseUrlImg + user.userInfo.avatar"
      />
      <div class="flex flex-1 flex-col gap-1">
        <div class="flex items-center gap-2">
          <span class="text-base text-color font-500">{{ user.userInfo.username }}</span>
          <i v-if="user.userInfo.isEmailVerified" i-solar:verified-check-bold text-sm text-theme-primary />
        </div>
        <span class="text-small text-xs">
          注册于 {{ getCreateTime }}
        </span>
      </div>
      <NuxtLink to="/user" prefetch :prefetch-on="{ visibility: true }">
        <el-button
          text
          size="small"
          class="shrink-0"
        >
          编辑资料
        </el-button>
      </NuxtLink>
    </div>

    <!-- 两列布局 -->
    <div class="grid grid-cols-1 gap-3">
      <!-- 左列：登录与安全 -->
      <div class="flex flex-col gap-4 border-default-2 rounded-xl card-bg-color p-4 shadow-sm">
        <div class="flex flex-col gap-1">
          <h4 class="text-sm text-color font-500">
            登录与安全
          </h4>
          <p class="text-small text-xs">
            管理您的密码和验证方式
          </p>
        </div>

        <!-- 密码 -->
        <div class="flex items-center justify-between gap-3">
          <div class="flex flex-col gap-1">
            <span class="text-xs text-color">密码</span>
            <span class="text-small text-xs">············</span>
          </div>
          <el-button
            text
            size="small"
            type="primary"
            @click="form.showUpdatePwd = true"
          >
            修改
          </el-button>
        </div>

        <!-- 手机号 -->
        <div class="flex items-center justify-between gap-3">
          <div class="flex flex-col gap-1">
            <span class="text-xs text-color">手机号</span>
            <span
              class="text-small text-xs"
              :class="{ 'text-theme-danger': !user.userInfo.phone }"
            >
              {{ user.markPhone || "还未绑定" }}
            </span>
          </div>
          <el-button
            text
            size="small"
            type="primary"
            @click="form.showUpdatePhone = true"
          >
            {{ user.userInfo.phone ? "换绑" : "绑定" }}
          </el-button>
        </div>

        <!-- 邮箱 -->
        <div class="flex items-center justify-between gap-3">
          <div class="flex flex-col gap-1">
            <span class="text-xs text-color">邮箱</span>
            <span
              class="text-small text-xs"
              :class="{ 'text-theme-danger': !user.userInfo.email }"
            >
              {{ user.userInfo.email || "还未绑定" }}
            </span>
          </div>
          <el-button
            text
            size="small"
            type="primary"
            @click="form.showUpdateEmail = true"
          >
            {{ user.userInfo.email ? "修改" : "绑定" }}
          </el-button>
        </div>
      </div>

      <!-- 右列：第三方账号 -->
      <div
        v-if="oauthPlatforms.length > 0"
        v-loading="isLoadingOAuth"
        class="flex flex-col gap-4 border-default-2 rounded-xl card-bg-color p-4 shadow-sm"
      >
        <div class="flex flex-col gap-1">
          <h4 class="text-sm text-color font-500">
            第三方账号
          </h4>
          <p class="text-small text-xs">
            绑定第三方账号以便快捷登录
          </p>
        </div>

        <!-- OAuth 平台列表 -->
        <div
          v-for="platform in oauthPlatforms"
          :key="platform.code"
          class="flex items-center justify-between gap-3"
        >
          <div class="flex items-center gap-2">
            <img
              :src="getOAuthPlatformIcon(platform.code)"
              :alt="platform.name"
              class="h-5 w-5 shrink-0"
            >
            <div class="flex flex-col gap-1">
              <span class="text-xs text-color">{{ platform.name }}</span>
              <span
                v-if="getBindStatus(platform.code)"
                class="text-small text-xs"
              >
                {{ getBindStatus(platform.code)?.nickname || "已绑定" }}
              </span>
            </div>
          </div>
          <el-button
            v-if="getBindStatus(platform.code)"
            text
            size="small"
            type="danger"
            @click="handleUnbind(platform.code)"
          >
            解绑
          </el-button>
          <el-button
            v-else
            text
            size="small"
            type="primary"
            :loading="bindingPlatform === platform.code"
            @click="handleBind(platform.code)"
          >
            绑定
          </el-button>
        </div>
      </div>
    </div>

    <!-- 退出登录 -->
    <div class="flex justify-end pt-2">
      <el-button
        type="danger"
        class="shadow"
        @click="user.exitLogin"
      >
        <i i-solar:exit-bold-duotone mr-1 text-sm />
        退出登录
      </el-button>
    </div>

    <!-- 对话框 -->
    <Teleport to="body">
      <UserSafeDialog v-model="form" />
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
</style>
