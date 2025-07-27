<script lang="ts" setup>
interface Props {
  size?: "small" | "default" | "large" | ""
  buttonClass?: string
}

const { size = "" } = defineProps<Props>();

const isSmallSize = computed(() => size === "default" || size === "" || size === undefined);
const btnStyle = computed(() => ({
  fontSize: isSmallSize.value ? "1.2em" : "1.2em",
  width: isSmallSize.value ? "2.4em" : "1.8em",
  height: isSmallSize.value ? "1.6em" : "1.5em",
  padding: 0,
  margin: 0,
}));
</script>

<template>
  <BtnElButton
    :class="buttonClass"
    :size="size"
    :style="btnStyle"
    text
    v-bind="$attrs"
  />
</template>

<style lang="scss" scoped>
</style>
