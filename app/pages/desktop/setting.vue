<script lang="ts" setup>
import { appKeywords, appName } from "~/constants";

useHead({
  title: `设置 - ${appName}`,
  meta: [
    { name: "description", content: `配置 ${appName} 的环境变量和其他设置` },
    { name: "keywords", content: appKeywords },
  ],
});
definePageMeta({
  key: route => route.path,
});
</script>

<template>
  <LazyPageSettingTemplate />
</template>

<style scoped lang="scss">
</style>
