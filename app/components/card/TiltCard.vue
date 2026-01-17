<script lang="ts" setup>
import type { TiltOptions } from "@/directives/tilt";

const props = withDefaults(defineProps<{
  options?: TiltOptions
  width?: string
  height?: string
}>(), {
  options: () => ({}),
  width: "auto",
  height: "auto",
});
</script>

<template>
  <div
    v-tilt="props.options"
    class="tilt-card"
    :style="{ width: props.width, height: props.height }"
  >
    <slot />
  </div>
</template>

<style scoped lang="scss">
.tilt-card {
  border-radius: 12px;
  background: var(--el-bg-color);
  box-shadow: var(--el-box-shadow-light);
  /* Ensure 3D context is preserved if needed, though directive handles it on the element */
}
</style>
