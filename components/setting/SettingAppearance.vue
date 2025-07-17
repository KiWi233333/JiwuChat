<script setup lang="ts">
import { DEFAULT_THEME_TOGGLE_ID } from "~/composables/utils/useToggleThemeAnima";

interface Props {
  size?: "small" | "default" | "large"
}

defineProps<Props>();
</script>

<template>
  <div class="setting-group">
    <label class="title">主题</label>
    <div id="appearance" class="box">
      <!-- 主题设置 -->
      <SettingTheme
        :input-props="{
          class: '!w-10rem sm:!w-12rem',
          size,
          id: DEFAULT_THEME_TOGGLE_ID,
        }"
      />
    </div>
    <label class="title">字体设置</label>
    <div id="appearance" class="box">
      <!-- 字体设置 -->
      <SettingFontFamily class="select !w-10rem sm:!w-12rem" :size="size" />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "./setting.g.scss";
</style>
