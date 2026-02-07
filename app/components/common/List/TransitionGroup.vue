<script lang="ts" setup>
const { immediate = false, delay = 800 } = defineProps<{
  immediate?: boolean
  delay?: number
}>();
const setting = useSettingStore();
const disableTransition = ref(!immediate);
onMounted(async () => {
  await nextTick();
  setTimeout(() => {
    disableTransition.value = false;
  }, delay);
});
</script>

<template>
  <TransitionGroup :name="!disableTransition && !setting.settingPage.isCloseAllTransition ? 'group-list' : '_'" v-bind="$attrs">
    <slot />
  </TransitionGroup>
</template>
