<script lang="ts" setup>
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
      downloadUrl.value = "https://kiwi233.top/%E9%A1%B9%E7%9B%AE/%E6%9E%81%E7%89%A9%E8%81%8A%E5%A4%A9.html#%F0%9F%92%BB-%E4%B8%8B%E8%BD%BD";
  }
}, { immediate: true });

function handleRepo(type: "github" | "gitee", isStar: boolean = true) {
  window.open(type === "github" ? `${githubReportUrl}` : `${giteeReportUrl}`, "_blank");
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
      @confirm="handleRepo('github')"
    >
      <template #reference>
        <div
          title="Github开源仓库 - JiwuChat"
          class="h-2rem w-2rem flex-row-c-c cursor-pointer border-default card-default rounded-full shadow-sm sm:(h-1.8rem w-1.8rem)"
          v-bind="$attrs"
          @click="handleRepo('github', false)"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" version="1.1" data-view-component="true" class="fill-dark dark:fill-light">
            <path d="M12.5.75C6.146.75 1 5.896 1 12.25c0 5.089 3.292 9.387 7.863 10.91.575.101.79-.244.79-.546 0-.273-.014-1.178-.014-2.142-2.889.532-3.636-.704-3.866-1.35-.13-.331-.69-1.352-1.18-1.625-.402-.216-.977-.748-.014-.762.906-.014 1.553.834 1.769 1.179 1.035 1.74 2.688 1.25 3.349.948.1-.747.402-1.25.733-1.538-2.559-.287-5.232-1.279-5.232-5.678 0-1.25.445-2.285 1.178-3.09-.115-.288-.517-1.467.115-3.048 0 0 .963-.302 3.163 1.179.92-.259 1.897-.388 2.875-.388.977 0 1.955.13 2.875.388 2.2-1.495 3.162-1.179 3.162-1.179.633 1.581.23 2.76.115 3.048.733.805 1.179 1.825 1.179 3.09 0 4.413-2.688 5.39-5.247 5.678.417.36.776 1.05.776 2.128 0 1.538-.014 2.774-.014 3.162 0 .302.216.662.79.547C20.709 21.637 24 17.324 24 12.25 24 5.896 18.854.75 12.5.75Z" />
          </svg>
        </div>
      </template>
    </el-popconfirm>
    <el-popconfirm
      title="如果你觉得这个项目不错，并且您愿意的话，欢迎给项目点个Star！"
      confirm-button-text="前往"
      :icon="ElIconStar"
      cancel-button-text="下次一定"
      :width="300"
      @confirm="handleRepo('gitee')"
    >
      <template #reference>
        <div
          href="https://gitee.com/KiWi233333/JiwuChat"
          target="_blank"
          title="Gitee开源仓库 - JiwuChat"
          class="h-2rem w-2rem flex-row-c-c cursor-pointer border-default card-default rounded-full shadow-sm sm:(h-1.8rem w-1.8rem)"
          v-bind="$attrs"
          @click="handleRepo('gitee', false)"
        >
          <svg t="1738348712309" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="4168"><path d="M512 512m-494.933333 0a494.933333 494.933333 0 1 0 989.866666 0 494.933333 494.933333 0 1 0-989.866666 0Z" fill="#C71D23" p-id="4169" /><path d="M762.538667 457.045333h-281.088a24.4736 24.4736 0 0 0-24.439467 24.405334v61.098666c-0.034133 13.5168 10.922667 24.439467 24.405333 24.439467h171.1104c13.5168 0 24.439467 10.922667 24.439467 24.439467v12.219733a73.3184 73.3184 0 0 1-73.3184 73.3184h-232.209067a24.439467 24.439467 0 0 1-24.439466-24.439467v-232.174933a73.3184 73.3184 0 0 1 73.3184-73.3184h342.152533c13.482667 0 24.405333-10.922667 24.439467-24.439467l0.034133-61.098666a24.405333 24.405333 0 0 0-24.405333-24.439467H420.352a183.296 183.296 0 0 0-183.296 183.296V762.538667c0 13.482667 10.922667 24.439467 24.405333 24.439466h360.516267a164.9664 164.9664 0 0 0 165.000533-165.000533v-140.526933a24.439467 24.439467 0 0 0-24.439466-24.439467z" fill="#FFFFFF" p-id="4170" /></svg>
        </div>
      </template>
    </el-popconfirm>
    <el-tooltip :content="`v ${latestVersion?.version}`" placement="bottom">
      <a
        :href="downloadUrl"
        target="_blank"
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
