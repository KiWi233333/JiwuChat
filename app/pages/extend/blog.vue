<script lang="ts" setup>
import { LogicalSize } from "@tauri-apps/api/dpi";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { appName } from "@/constants";


useSeoMeta({
  title: `博客`,
  description: `分享${appName}的心得与经验`,
});

const setting = useSettingStore();
const isLoading = ref(true);
const shopUrl = computed(() => "https://kiwi233.top/");

onMounted(async () => {
  if (setting.isDesktop) {
    const wind = WebviewWindow.getCurrent();
    await wind.setMinSize(new LogicalSize(375, 780));
    await wind.setSize(new LogicalSize(1200, 800));
    await wind.show();
  }
});
</script>

<template>
  <iframe
    v-if="shopUrl"
    v-loading="isLoading"
    :src="shopUrl"
    frameborder="0"
    width="100%"
    height="100%"
    :element-loading-spinner="defaultLoadingIcon"
    element-loading-background="transparent"
    class="w-full flex flex-col select-none"
    @load="isLoading = false"
    @error="isLoading = false"
  />
</template>

<style scoped lang="scss">
.mains {
  --at-apply: 'grid grid-cols-1 pl-2rem pr-4rem sm:(grid-cols-[2fr_1fr] px-4rem)';
}
</style>
