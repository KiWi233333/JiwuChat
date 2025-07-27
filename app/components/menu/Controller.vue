<script setup lang="ts">
import type { Window } from "@tauri-apps/api/window";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { platform } from "@tauri-apps/plugin-os";
import { closeWindowHandler } from "~/composables/tauri/window";


const {
  size = "default",
  showMin = true,
  showMax = true,
  showClose = true,
  destroyOnClose = false,
} = defineProps<{
  showMin?: boolean
  showMax?: boolean
  showClose?: boolean
  size?: "small" | "default" | "" | undefined
  // 关闭是否销毁
  destroyOnClose?: boolean
}>();
const isSmallSize = computed(() => size === "default" || size === "" || size === undefined);
const btnStyle = computed(() => ({
  fontSize: isSmallSize.value ? "1.2em" : "1.2em",
  width: isSmallSize.value ? "2.4em" : "1.8em",
  height: isSmallSize.value ? "1.6em" : "1.5em",
  // font-size: 1.2rem;padding: 0;width: 2.6rem;height: 1.8rem;;
  padding: 0,
  margin: 0,
}));
const appWindow = shallowRef<Window>();
const isMaximized = ref(false);
const isAlwaysOnTopVal = ref(false);

/**
 * 处理窗口事件
 * @param type 事件类型
 */
async function handleWindow(type: "min" | "max" | "close" | "alwaysOnTop") {
  if (!appWindow?.value) {
    return;
  }
  if (type === "min") {
    await appWindow.value?.minimize();
  }
  if (type === "max") {
    await appWindow.value?.toggleMaximize();
    const isMax = await appWindow.value?.isMaximized();
    isMaximized.value = !!isMax;
  };
  if (type === "close") {
    await closeWindowHandler(destroyOnClose);
  }
  if (type === "alwaysOnTop") {
    isAlwaysOnTopVal.value = !isAlwaysOnTopVal.value;
    appWindow.value?.setAlwaysOnTop(isAlwaysOnTopVal.value);
  }
  return {
    isMaximized: isMaximized.value,
    isAlwaysOnTopVal: isAlwaysOnTopVal.value,
  };
}
const data = ref({
  handleWindow,
  size,
  btnStyle,
  isAlwaysOnTopVal,
});
const setting = useSettingStore();


onMounted(async () => {
  if (setting.isWeb)
    return;
  appWindow.value = getCurrentWindow();
  try {
    const info = platform();
    if (["windows", "macos", "linux"].includes(info)) {
      const appWindow = getCurrentWindow();
      appWindow.setAlwaysOnBottom(isAlwaysOnTopVal.value);
      isMaximized.value = await appWindow.isMaximized();
    }
  }
  catch (error) {
    console.log(error);
  }
});
</script>

<template>
  <slot name="start" :data="data" />
  <ElButton
    v-if="showMin"
    text size="small" :style="btnStyle" @click="handleWindow('min')"
  >
    <i class="i-carbon:subtract btn-primary" title="最小化" />
  </ElButton>
  <ElButton
    v-if="showMax"
    text
    size="small" :style="btnStyle" @click="handleWindow('max')"
  >
    <i
      class="text-0.8em"
      :class="isMaximized ? 'i-tabler:minimize' : 'i-tabler:maximize'"
      :title="isMaximized ? '还原' : '最大化'"
      btn-primary
    />
  </ElButton>
  <ElButton v-if="showClose" text size="small" :style="btnStyle" @click="handleWindow('close')">
    <i i-carbon:close btn-danger title="关闭" />
  </ElButton>
  <slot name="end" />
</template>

<style lang="">

</style>
