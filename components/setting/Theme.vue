<script lang="ts" setup>
const {
  inputProps,
} = defineProps<{
  inputProps: Record<string, any>;
}>();

// 主题
const {
  theme,
  themeConfigList,
  thePostion,
} = useSettingTheme();
</script>

<template>
  <div v-bind="$attrs" class="group h-8 flex-row-bt-c">
    主题切换
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
</template>

<style scoped lang="scss">
:deep(.el-segmented) {
  .el-segmented__item-label {
    font-size: 0.9rem;
  }
}
</style>
