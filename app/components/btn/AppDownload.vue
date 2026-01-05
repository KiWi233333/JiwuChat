<script lang="ts" setup>
import { OAuthPlatformCode } from "~/composables/api/user/oauth";
import { appBlogHost, giteeReportUrl, githubReportUrl } from "~/constants";

const setting = useSettingStore();
const downloadUrl = ref();
const latestVersion = ref<AppPlatformsJSON>();

watch([() => setting.isWeb, () => setting.isMobileSize, latestVersion], async ([isWeb, isMobileSize]) => {
  if (!isWeb)
    return;
  if (latestVersion.value) {
    const ua = navigator.userAgent;
    const res = latestVersion.value;
    if (isMobileSize) {
      downloadUrl.value = `${BaseUrlAppFile}/app/${res.version}/JiwuChat_${res.version}.apk`;
      return;
    }
    if (ua.toLowerCase().includes("windows"))
      downloadUrl.value = res.platforms["windows-x86_64"].url;
    else if (ua.toLowerCase().includes("macos"))
      downloadUrl.value = res.platforms["darwin-aarch64"].url;
    else if (ua.toLowerCase().includes("linux"))
      downloadUrl.value = res.platforms["linux-x86_64"].url;
    else if (ua.includes("iPhone"))
      downloadUrl.value = `${BaseUrlAppFile}/app/${res.version}/JiwuChat_${res.version}.apk`;
    else
      downloadUrl.value = appBlogHost;
  }
}, { immediate: true });

function handleRepo(type: OAuthPlatformCode.GITHUB | OAuthPlatformCode.GITEE, isStar: boolean = true) {
  window.open(type === OAuthPlatformCode.GITHUB ? `${githubReportUrl}` : `${giteeReportUrl}`, "_blank");
}
onMounted(async () => {
  const res = await getLatestVersion();
  if (res) {
    latestVersion.value = res;
  }
});
</script>

<template>
  <template v-if="setting.isWeb">
    <el-tooltip content="JiwuChat 官网" placement="bottom">
      <a
        :href="appBlogHost" target="_blank"
        title="JiwuChat 官网"
        class="h-2rem w-2rem flex-row-c-c cursor-pointer border-default card-default rounded-full shadow-sm sm:(h-1.8rem w-1.8rem)"
        v-bind="$attrs"
      >
        <i i-solar:planet-2-bold-duotone p-2.5 text-theme-primary />
      </a>
    </el-tooltip>
    <el-popconfirm
      title="如果你觉得这个项目不错，并且您愿意的话，欢迎给项目点个Star！"
      confirm-button-text="前往"
      cancel-button-text="下次一定"
      :icon="ElIconStar"
      :width="300"
      @confirm="handleRepo(OAuthPlatformCode.GITHUB)"
    >
      <template #reference>
        <div
          title="Github开源仓库 - JiwuChat"
          class="h-2rem w-2rem flex-row-c-c cursor-pointer border-default card-default rounded-full shadow-sm sm:(h-1.8rem w-1.8rem)"
          v-bind="$attrs"
          @click="handleRepo(OAuthPlatformCode.GITHUB, false)"
        >
          <CardElImage error-root-class="hidden" src="/images/brand/github.svg" alt="GitHub" class="h-5/6 w-5/6 object-contain dark:invert" />
        </div>
      </template>
    </el-popconfirm>
    <el-popconfirm
      title="如果你觉得这个项目不错，并且您愿意的话，欢迎给项目点个Star！"
      confirm-button-text="前往"
      :icon="ElIconStar"
      cancel-button-text="下次一定"
      :width="300"
      @confirm="handleRepo(OAuthPlatformCode.GITEE)"
    >
      <template #reference>
        <div
          href="https://gitee.com/KiWi233333/JiwuChat"
          target="_blank"
          title="Gitee开源仓库 - JiwuChat"
          class="h-2rem w-2rem flex-row-c-c cursor-pointer border-default card-default rounded-full shadow-sm sm:(h-1.8rem w-1.8rem)"
          v-bind="$attrs"
          @click="handleRepo(OAuthPlatformCode.GITEE, false)"
        >
          <CardElImage src="/images/brand/gitee.svg" alt="Gitee" class="h-5/6 w-5/6 object-contain" />
        </div>
      </template>
    </el-popconfirm>
    <!-- APP下载 -->
    <el-tooltip :content="latestVersion?.version ? `v ${latestVersion?.version}` : '暂未发布'" placement="bottom">
      <a
        :href="downloadUrl"
        target="_blank"
        download
        rel="noopener noreferrer"
        v-bind="$attrs"
        class="h-1.8rem flex-row-c-c btn-info-bg border-default card-default rounded-4rem pl-4 pr-6 text-xs"
      >
        <i class="i-solar-download-minimalistic-broken mr-2 p-2" />
        APP
      </a>
    </el-tooltip>
  </template>
</template>

<style scoped lang="scss"></style>
