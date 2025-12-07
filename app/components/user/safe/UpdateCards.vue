<script lang="ts" setup>
import type { OAuthPlatformCode, OAuthPlatformVO, UserOAuthVO } from "~/composables/api/user/oauth";
import {
  getAuthorizeUrl,
  getBindList,
  getOAuthPlatforms,
  unbindOAuth,
} from "~/composables/api/user/oauth";

const user = useUserStore();
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

// 绑定第三方账号
async function handleBind(platform: OAuthPlatformCode) {
  try {
    const redirectUri = `${window.location.origin}/oauth/callback?platform=${platform}&action=bind`;
    const res = await getAuthorizeUrl(platform, redirectUri);

    if (res.code === StatusCode.SUCCESS && res.data) {
      // 跳转到授权页面
      window.location.href = res.data;
    }
    else {
      ElMessage.error(res.message || "获取授权链接失败");
    }
  }
  catch (error: any) {
    console.error("绑定失败:", error);
    ElMessage.error(error?.message || "绑定失败，请稍后重试");
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

// 初始化加载
onMounted(() => {
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
      v-loading="isLoading"
      class="group flex flex-col card-default"
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
        ml-1 mt-6
      >
        <div mb-2 flex-row-bt-c>
          <small>第三方账号：</small>
        </div>
        <div
          v-loading="isLoadingOAuth"
          class="mt-4 flex flex-col gap-4"
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
