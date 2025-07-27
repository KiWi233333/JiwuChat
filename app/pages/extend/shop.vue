<script lang="ts" setup>
import { LogicalSize } from "@tauri-apps/api/dpi";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

useSeoMeta({
  title: `极物圈商城`,
});


const user = useUserStore();
const setting = useSettingStore();
const isLoading = ref(true);
const shopUrl = computed(() => user.getToken ? `https://jiwu.kiwi2333.top/?token=${user.getToken}` : "");


onMounted(async () => {
  if (setting.isDesktop) {
    const wind = WebviewWindow.getCurrent();
    await wind.setMinSize(new LogicalSize(1500, 960));
    await wind.setSize(new LogicalSize(1500, 960));
    await wind.show();
  }
});
</script>

<template>
  <iframe
    v-if="shopUrl"
    v-loading="isLoading"
    :element-loading-spinner="defaultLoadingIcon"
    element-loading-background="transparent"
    class="w-full flex flex-col select-none"
    :src="shopUrl"
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
