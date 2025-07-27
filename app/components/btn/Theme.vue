<script lang="ts" setup>
const setting = useSettingStore();
// 切换动画
const mode = useColorMode();
async function toggleFn(e: MouseEvent) {
  const modes = mode.preference === "dark" ? "light" : "dark";
  useModeToggle(modes, e);
  setting.settingPage.modeToggle.value = modes;
}
</script>

<template>
  <div
    id="toggle-theme-btn"
    class="flex-row-c-c cursor-pointer"
    @click="toggleFn"
  >
    <img
      v-if="setting.settingPage.modeToggle.value === 'light'"
      class="h-1.3em w-1.3em"
      src="/images/icon/sun.svg"
      alt="sun 日间模式"
    >
    <img
      v-else
      src="/images/icon/moon.svg"
      class="h-1.3em w-1.3em"
      alt="moon 夜间模式"
    >
    <slot />
  </div>
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
