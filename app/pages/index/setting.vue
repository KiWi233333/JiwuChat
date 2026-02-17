<script lang="ts" setup>
const setting = useSettingStore();
</script>

<template>
  <div class="w-100vw overflow-x-hidden">
    <SettingTemplate :menu-bar="!setting.isMobileSize" class="w-full flex-1" />
  </div>
</template>
