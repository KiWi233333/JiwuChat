<script lang="ts" setup>
const setting = useSettingStore();
</script>

<template>
  <SettingTemplate :menu-bar="!setting.isMobileSize" class="w-full flex-1" />
</template>
