<script lang="ts" setup>
import { LogicalSize } from "@tauri-apps/api/dpi";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";


useSeoMeta({
  title: `悦读时光`,
  description: `悦读时光，专注于分享生活点滴，记录美好生活！`,
});

const setting = useSettingStore();
const isLoading = ref(true);
const url = computed(() => "https://readjoy.kiwi233.top/");

onMounted(async () => {
  if (setting.isDesktop) {
    const wind = WebviewWindow.getCurrent();
    await wind.setMinSize(new LogicalSize(375, 780));
    await wind.setSize(new LogicalSize(1080, 780));
    await wind.show();
  }
});
</script>

<template>
  <iframe
    v-if="url"
    v-loading="isLoading"
    :element-loading-spinner="defaultLoadingIcon"
    class="w-full flex flex-col select-none"
    :src="url"
    frameborder="0"
    width="100%"
    height="100%"
    @load="isLoading = false"
    @error="isLoading = false"
  />
</template>

<style scoped lang="scss">
.mains {
  --at-apply: 'grid grid-cols-1 pl-2rem pr-4rem sm:(grid-cols-[2fr_1fr] px-4rem)';
}
</style>
