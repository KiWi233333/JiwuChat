<script lang="ts" setup>
const setting = useSettingStore();
// 切换动画
const mode = useColorMode();
function toggleFn(e: MouseEvent) {
  const modes = mode.value === "dark" ? "light" : "dark";
  useModeToggle(modes, e);
  setting.settingPage.modeToggle.value = modes;
}
</script>

<template>
  <ElButton
    class="btn card-default"
    round
    @click="toggleFn"
  >
    <span
      hidden overflow-hidden truncate md:inline
    >
      {{ setting.settingPage.modeToggle.value === 'dark' ? "切换日间" : "切换夜间" }}
    </span>
    <img
      v-if="setting.settingPage.modeToggle.value === 'light'"
      class="h-1.3em w-1.3em"
      sizes="md:20px"
      densities="x1 x2"
      src="/images/icon/sun.svg"
      quality="50"
      alt="sun 日间模式"
    >
    <img
      v-else
      src="/images/icon/moon.svg"
      sizes="md:20px"
      quality="50"
      densities="x1 x2"
      class="h-1.3em w-1.3em fill-light-5"
      alt="sun 日间模式"
    >
  </ElButton>
</template>

<style lang="scss" scoped>
.btn {
  padding: 0em 0.4em;
  transition: $transition-delay;

  span {
    width: 0;
    overflow: hidden;
    transition: $transition-delay;
    letter-spacing: 0.1em;
  }

  &:hover span,
  &:focus span {
    width: 4.6em;
    margin: 0 0.4em;
  }
}
</style>
