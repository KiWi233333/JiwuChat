<script setup lang="ts">
interface Props {
  size?: "small" | "default" | "large"
}

defineProps<Props>();

const setting = useSettingStore();
</script>

<template>
  <div class="setting-group">
    <label class="title">自启与更新</label>
    <div id="system" class="box">
      <!-- 自启动 -->
      <SettingAutoStart v-if="setting.isDesktop" :size="size" />
      <!-- 版本更新 -->
      <SettingVersionDialog />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "./setting.g.scss";
</style>
