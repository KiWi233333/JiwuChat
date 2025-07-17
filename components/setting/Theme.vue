<script lang="ts" setup>
const {
  inputProps,
} = defineProps<{
  inputProps?: Record<string, any>;
}>();

// 主题
const {
  theme,
  themeConfigList,
  thePostion,
} = useSettingTheme();

const showThemeConfig = ref(false);
</script>

<template>
  <div v-bind="$attrs" class="group h-8 flex-row-bt-c">
    主题定制
    <BtnElButton
      class="ml-a mr-2 h-6.5 !border-default-hover"
      text
      bg
      icon-class="i-solar:pallete-2-bold-duotone text-1em mr-1"
      title="定制化主题"
      round
      plain
      @click="showThemeConfig = true"
    />
    <el-segmented
      :id="DEFAULT_THEME_TOGGLE_ID"
      v-model="theme"
      v-bind="inputProps"
      class="border-default"
      style="background-color: transparent;--el-segmented-item-selected-color: #fff;--el-border-radius-base: 2rem;"
      :options="themeConfigList"
      @click="(e: MouseEvent) => thePostion = { clientX: e.clientX, clientY: e.clientY }"
    />
  </div>
  <!-- 主题配置对话框 -->
  <SettingThemeConfigDialog
    v-model:show="showThemeConfig"
    :size="inputProps?.size || 'default'"
  />
</template>

<style scoped lang="scss">
:deep(.el-segmented) {
  .el-segmented__item-label {
    font-size: 0.9rem;
  }
}
</style>
