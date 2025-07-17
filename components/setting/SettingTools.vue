<script setup lang="ts">
interface Props {
  size?: "small" | "default" | "large"
}

defineProps<Props>();
</script>

<template>
  <div class="setting-group">
    <label class="title">翻译工具</label>
    <div id="tools" class="box">
      <SettingTranslation class="select" :size="size" />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "./setting.g.scss";
</style>
