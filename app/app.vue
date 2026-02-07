<script setup lang="ts">
import { appEnName, appKeywords, appName } from "@/constants/index";
import { appMounted } from "@/init/index";
import { DRAWER_BODY_LOCK_CLASS } from "./constants/ui";

// https://nuxt.com.cn/docs/guide/directory-structure/app
useHead({
  title: `${appEnName} | ${appName} 🍂`,
  meta: [
    {
      name: "description",
      content: "JiwuChat 🍂 : 轻量级跨平台IM聊天应用，集成AI机器人( DeepSeek/Gemini/Kimi... )、音视频通话及AI购物。支持多端消息同步，自定义主题，高效便捷 🍒",
    },
    {
      name: "keywords",
      content: appKeywords,
    },
  ],
  htmlAttrs: {
    lang: "zh",
  },
});


/**
 * 初始化
 */
const {
  getRootClass,
} = appMounted();
</script>

<template>
  <main :class="DRAWER_BODY_LOCK_CLASS" class="h-100dvh flex-row-c-c">
    <div
      class="h-full w-full overflow-hidden bg-color"
      :class="getRootClass"
    >
      <NuxtLayout>
        <NuxtPage
          class="h-full w-full"
        />
      </NuxtLayout>
    </div>
  </main>
</template>

<style lang="scss">
</style>
