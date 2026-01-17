<script lang="ts" setup>
import { useBattery } from "@vueuse/core";

const batteryInfo = useBattery(window);
</script>

<template>
  <!-- 电池 -->
  <div
    v-if="batteryInfo.isSupported.value"
    key="battery"
    v-bind="$attrs"
    class="device-card"
  >
    <i
      :class="
        batteryInfo.charging.value
          ? 'bg-theme-info i-carbon:battery-charging'
          : 'opacity-80 i-carbon:battery-full'
      "
      mr-2 p-4
    />
    <div class="flex-1">
      <small> {{ batteryInfo.charging.value ? "Charging" : "Discharging" }}</small>
      <el-progress
        striped
        :duration="10"
        :striped-flow="batteryInfo.charging.value"
        :color="batteryInfo.charging.value ? 'var(--el-color-info)' : 'var(--el-color-warning)'"
        :percentage="+(batteryInfo.level.value * 100).toFixed(2)"
      />
    </div>
  </div>
  <div
    v-else
    v-bind="$attrs"
    class="bg-color-2 p-2"
  >
    <small text-color> Battery monitor not supported</small>
  </div>
</template>

<style scoped lang="scss">
.device-card {
  --at-apply: " flex items-center card-default border-default-2-hover p-2 px-4";
}
</style>
