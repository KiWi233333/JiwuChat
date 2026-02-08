<script lang="ts" setup>
import { LogicalSize } from "@tauri-apps/api/dpi";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import {
  EXTEND_PAGE_CONFIG,
  isExtendPageType,
} from "~/constants/extend";

const props = defineProps<{ type?: string }>();
const route = useRoute();
const user = useUserStore();
const setting = useSettingStore();

/** 来自路由 /extend/[type] 或来自 Internal 的 prop */
const type = (props.type ?? route.params.type) as string;
if (!type || !isExtendPageType(type)) {
  throw createError({ statusCode: 404, statusMessage: "Not found" });
}
const config = EXTEND_PAGE_CONFIG[type];

useSeoMeta({
  title: config.title,
  description: config.description ?? "",
});

const isLoading = ref(true);
const isLoadError = ref(false);
const iframeKey = ref(0);
const url = computed(() => {
  if (config.getUrl)
    return config.getUrl(user);
  return config.url ?? "";
});

/** 无地址（如商城需登录）、加载失败等错误态文案 */
const emptyMessage = computed(() => {
  if (config.getUrl && !url.value)
    return "请先登录后访问";
  return "暂无内容";
});

function onIframeError() {
  isLoading.value = false;
  isLoadError.value = true;
}

function retryLoad() {
  isLoadError.value = false;
  isLoading.value = true;
  iframeKey.value += 1;
}

/** 监听路由变化，更新 窗口信息 */
watch(() => route.query, () => {
  if (setting.isDesktop && config.windowSize) {
    nextTick(async () => {
      // 保存最小尺寸
      const { minWidth, minHeight, width, height } = config.windowSize;
      const wind = WebviewWindow.getCurrent();
      // 当前窗口标签是否为扩展窗口
      if (wind.label === EXTEND_WINDOW_LABEL) {
        await wind.setMinSize(new LogicalSize(minWidth, minHeight));
        await wind.setSize(new LogicalSize(width, height));
        await wind.show();
      }
    });
  }
}, { immediate: true });
</script>

<template>
  <!-- 无地址（如需登录） -->
  <div
    v-if="!url"
    class="h-full min-h-20rem flex flex-col items-center justify-center gap-3 text-small-color"
  >
    <i class="i-ri:links-line h-12 w-12 op-50" />
    <span>{{ emptyMessage }}</span>
    <NuxtLink
      v-if="config.getUrl && !user.isLogin"
      to="/login"
      class="text-primary hover:underline"
    >
      去登录
    </NuxtLink>
  </div>
  <!-- 加载失败 -->
  <div
    v-else-if="isLoadError"
    class="h-full min-h-20rem flex flex-col items-center justify-center gap-3 text-small-color"
  >
    <i class="i-ri:error-warning-line h-12 w-12 op-50" />
    <span>加载失败，请检查网络或稍后重试</span>
    <el-button size="small" @click="retryLoad">
      重新加载
    </el-button>
  </div>
  <!-- 正常 iframe -->
  <iframe
    v-else
    :key="iframeKey"
    v-loading="isLoading"
    :element-loading-spinner="defaultLoadingIcon"
    element-loading-background="transparent"
    class="w-full flex flex-col select-none"
    :src="url"
    frameborder="0"
    width="100%"
    height="100%"
    @load="isLoading = false"
    @error="onIframeError"
  />
</template>
