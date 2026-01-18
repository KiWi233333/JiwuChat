<script lang="ts" setup>
import { appKeywords, appName } from "~/constants";

const setting = useSettingStore();
// 桌面端设置 head 信息
useHead({
  title: `设置 - ${appName}`,
  meta: [
    { name: "description", content: `配置 ${appName} 的环境变量和其他设置` },
    { name: "keywords", content: appKeywords },
  ],
});
</script>

<template>
  <PageSettingTemplate :menu-bar="!setting.isMobileSize" class="w-full flex-1" />
</template>

<style scoped lang="scss">
</style>
