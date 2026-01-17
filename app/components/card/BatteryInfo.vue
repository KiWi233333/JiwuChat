<script lang="ts" setup>
import { useBattery } from "@vueuse/core";

const battery = useBattery();

const batteryLevel = computed(() => (battery.level.value * 100).toFixed(0));

const batteryStatus = computed(() => {
  const level = battery.level.value * 100;
  const isCharging = battery.charging.value;

  if (isCharging) {
    return {
      type: "charging",
      label: "正在充电",
      color: "var(--el-color-success)",
      icon: "i-carbon:battery-charging",
      class: "is-charging",
    };
  }

  if (level <= 20) {
    return {
      type: "low",
      label: "电量不足",
      color: "var(--el-color-danger)",
      icon: "i-carbon:battery-low",
      class: "is-low",
    };
  }

  // 根据电量选择图标
  let icon = "i-carbon:battery-full";
  if (level < 30)
    icon = "i-carbon:battery-quarter";
  else if (level < 60)
    icon = "i-carbon:battery-half";
  else if (level < 90)
    icon = "i-carbon:battery-three-quarters";

  return {
    type: "normal",
    label: "正在放电",
    color: "var(--el-color-warning)",
    icon,
    class: "",
  };
});
</script>

<template>
  <!-- 电池信息卡片 -->
  <div
    v-if="battery.isSupported.value"
    key="battery"
    v-bind="$attrs"
    class="device-card battery-card"
    :class="batteryStatus.class"
    :style="{ '--battery-color': batteryStatus.color }"
  >
    <!-- 左侧图标 -->
    <div class="icon-wrapper">
      <i :class="batteryStatus.icon" class="text-1.5rem transition-all duration-300" />
    </div>

    <!-- 右侧信息 -->
    <div class="min-w-0 flex flex-1 flex-col gap-2">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium opacity-90">{{ batteryStatus.label }}</span>
        <span class="text-xs font-bold font-mono" :style="{ color: batteryStatus.color }">
          {{ batteryLevel }}%
        </span>
      </div>

      <el-progress
        :percentage="+batteryLevel"
        :color="batteryStatus.color"
        :stroke-width="6"
        :show-text="false"
        :striped="battery.charging.value"
        :striped-flow="battery.charging.value"
        :duration="10"
      />
    </div>
  </div>

  <!-- 不支持提示 -->
  <div v-else v-bind="$attrs" class="device-card bg-gray-100 opacity-60 dark:bg-gray-800">
    <small class="text-xs">Battery API not supported</small>
  </div>
</template>

<style scoped lang="scss">
.device-card {
  --at-apply: "flex items-center gap-3 card-default border-default-2-hover p-3 transition-all duration-300";
}

/* 电池卡片基础样式 */
.battery-card {
  position: relative;
  overflow: hidden;

  /* 图标容器 */
  .icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 50%;
    background-color: color-mix(in srgb, var(--battery-color), transparent 90%);
    color: var(--battery-color);
    transition: all 0.3s ease;
  }
}

/* 充电状态特效 */
.is-charging {
  border-color: color-mix(in srgb, var(--el-color-success), transparent 70%);
  box-shadow: 0 0 15px color-mix(in srgb, var(--el-color-success), transparent 90%);

  .icon-wrapper {
    animation: pulse-glow 2s infinite;
  }
}

/* 低电量特效 */
.is-low {
  border-color: color-mix(in srgb, var(--el-color-danger), transparent 70%);

  .icon-wrapper {
    animation: shake-blink 3s infinite;
  }
}

/* 动画定义 */
@keyframes pulse-glow {
  0% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--el-color-success), transparent 60%);
  }
  70% {
    box-shadow: 0 0 0 10px transparent;
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}

@keyframes shake-blink {
  0%,
  100% {
    transform: translateX(0);
    opacity: 1;
  }
  10%,
  30%,
  50%,
  70%,
  90% {
    transform: translateX(-2px);
  }
  20%,
  40%,
  60%,
  80% {
    transform: translateX(2px);
  }
  50% {
    opacity: 0.6;
  }
}
</style>
