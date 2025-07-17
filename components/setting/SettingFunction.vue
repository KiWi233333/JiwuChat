<script setup lang="ts">
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

interface Props {
  size?: "small" | "default" | "large"
}

defineProps<Props>();
const setting = useSettingStore();
// window 10 确认和设置阴影
const isWindow10 = ref(false);
// 定制化动画设置弹窗
const showCustomTransitionPanel = ref(false);

// 确认和设置窗口阴影
function checkWind10Shadow() {
  if (setting.isDesktop) {
    getCurrentWebviewWindow()?.setShadow(setting.settingPage.isWindow10Shadow);
  }
}

// 监听窗口版本
onMounted(async () => {
  const v = await useWindowsVersion();
  isWindow10.value = v === "Windows 10";
});
</script>

<template>
  <div class="setting-group">
    <label class="title">功能与交互</label>
    <div id="function" class="box">
      <!-- 流畅模式 -->
      <div class="setting-item">
        流畅模式
        <BtnElButton
          class="ml-a mr-2 h-5 !border-default-hover"
          icon-class="i-solar:pen-2-bold text-1em mr-1"
          title="定制化动画"
          text bg round
          size="small"
          @click="showCustomTransitionPanel = true"
        />
        <el-switch
          v-model="setting.settingPage.isCloseAllTransition"
          class="transition-opacity hover:op-80"
          :size="size"
          inline-prompt
          :title="!setting.settingPage.isCloseAllTransition ? '关闭动画' : '开启动画'"
        />
      </div>
      <!-- Window10阴影 -->
      <div v-if="setting.isDesktop && isWindow10" class="setting-item">
        窗口阴影
        <span class="tip mx-2 border-default rounded-8 px-2 py-0.2em text-mini">Window 10</span>
        <el-switch
          v-model="setting.settingPage.isWindow10Shadow"
          :title="!setting.settingPage.isWindow10Shadow ? '开启窗口阴影，Windows 10 不兼容圆角' : '关闭窗口阴影，窗口采用圆角'"
          placement="left"
          class="ml-a transition-opacity hover:op-80"
          :size="size"
          inline-prompt
          @change="checkWind10Shadow"
        />
      </div>
    </div>
    <SettingAnimationOptDialog
      v-model:show="showCustomTransitionPanel"
      :size="size"
    />
  </div>
</template>

<style scoped lang="scss">
@use "./setting.g.scss";
</style>
