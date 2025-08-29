<script setup lang="ts">
interface Props {
  size?: "small" | "default" | "large"
}

defineProps<Props>();
const setting = useSettingStore();
// window 10 确认和设置阴影
const isWindow10 = ref(false);
// 定制化动画设置弹窗
const showCustomTransitionPanel = ref(false);
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
        <el-switch
          v-model="setting.settingPage.isCloseAllTransition"
          class="transition-opacity hover:op-80"
          :size="size"
          inline-prompt
          :title="!setting.settingPage.isCloseAllTransition ? '关闭动画' : '开启动画'"
        />
      </div>
      <!-- 动画配置 -->
      <div class="setting-item">
        动画配置
        <span class="tip mx-2 border-default rounded-8 bg-color-2 px-2 py-0 text-3 text-mini">精细化页面、主题等动画</span>
        <BtnElButton
          class="ml-a h-5 !border-default-hover"
          icon-class="i-solar:pen-2-bold text-1em mr-1"
          title="定制化动画"
          round
          size="small"
          @click="showCustomTransitionPanel = true"
        />
      </div>
      <!-- Window10阴影 -->
      <div v-if="setting.isDesktop && isWindow10" class="setting-item">
        窗口阴影
        <span class="tip mx-2 border-default rounded-8 px-2 py-0 text-0.7rem text-mini">Window 10</span>
        <el-switch
          v-model="setting.settingPage.isWindow10Shadow"
          :title="!setting.settingPage.isWindow10Shadow ? '开启窗口阴影，Windows 10 不兼容圆角' : '关闭窗口阴影，窗口采用圆角'"
          placement="left"
          class="ml-a transition-opacity hover:op-80"
          :size="size"
          inline-prompt
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
