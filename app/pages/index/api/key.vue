<script setup lang="ts">
const setting = useSettingStore();
const desktopRef = ref();
const mobileRef = ref();

// 初始化
onMounted(() => {
  desktopRef.value?.loadData();
  mobileRef.value?.loadData();
});
onActivated(() => {
  desktopRef.value?.loadData();
  mobileRef.value?.loadData();
});
</script>

<template>
  <div class="min-w-0 w-full flex flex-1 flex-col">
    <ApiKeyDesktop v-if="!setting.isMobileSize" ref="desktopRef" />
    <ApiKeyMobile v-else ref="mobileRef" />
  </div>
</template>
