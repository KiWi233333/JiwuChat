<script setup lang="ts">
import type { AudioLevelData } from "~/composables/hooks/useMicrophoneTest";

interface Props {
  /** 音频数据 */
  audioData: AudioLevelData;
  /** 波形宽度 */
  width?: number;
  /** 波形高度 */
  height?: number;
  /** 波形条数 */
  bars?: number;
  /** 波形颜色 */
  color?: string;
  /** 是否显示活跃状态 */
  isActive?: boolean;
  /** 波形类型 */
  type?: "bars" | "wave" | "simple";
  /** 是否自动缩放 */
  autoScale?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  width: 120,
  height: 24,
  bars: 20,
  color: "currentColor",
  isActive: false,
  type: "bars",
  autoScale: true,
});

// 计算波形数据
const waveformData = computed(() => {
  if (!props.audioData.frequencyData.length && !props.audioData.timeData.length) {
    // 没有数据时返回静默状态
    return Array.from({ length: props.bars }, () => 0);
  }

  const data = props.type === "wave"
    ? props.audioData.timeData
    : props.audioData.frequencyData;

  const result: number[] = [];
  const step = Math.floor(data.length / props.bars);

  for (let i = 0; i < props.bars; i++) {
    const start = i * step;
    const end = Math.min(start + step, data.length);

    // 计算区间平均值
    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += data[j] || 0;
    }

    let value = sum / (end - start);

    // 标准化到0-1范围
    if (props.type === "wave") {
      // 时域数据处理（居中于128）
      value = Math.abs(value - 128) / 127;
    }
    else {
      // 频域数据处理
      value = value / 255;
    }

    // 自动缩放增强可视性
    if (props.autoScale && value > 0) {
      value = value ** 0.7; // 使用幂函数增强小信号
    }

    result.push(Math.min(value, 1));
  }

  return result;
});

// 生成SVG路径
const svgContent = computed(() => {
  const { width, height, type } = props;
  const data = waveformData.value;

  if (type === "simple") {
    // 简单模式：只显示音量级别
    const level = props.audioData.level / 100;
    const barHeight = level * height * 0.8;

    return `
      <rect
        x="2"
        y="${(height - barHeight) / 2}"
        width="${width - 4}"
        height="${barHeight}"
        rx="2"
        fill="${props.color}"
        opacity="${props.isActive ? "0.8" : "0.4"}"
      />
    `;
  }

  if (type === "wave") {
    // 波形模式：连续曲线
    const centerY = height / 2;
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * (width - 4) + 2;
      const y = centerY + (value - 0.5) * height * 0.7;
      return `${x},${y}`;
    }).join(" ");

    return `
      <polyline
        points="${points}"
        fill="none"
        stroke="${props.color}"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        opacity="${props.isActive ? "0.8" : "0.4"}"
      />
    `;
  }

  // 条形模式：垂直条
  const barWidth = (width - (data.length + 1) * 2) / data.length;

  return data.map((value, index) => {
    const barHeight = Math.max(value * height * 0.8, 1);
    const x = index * (barWidth + 2) + 2;
    const y = (height - barHeight) / 2;

    return `
      <rect
        x="${x}"
        y="${y}"
        width="${barWidth}"
        height="${barHeight}"
        rx="1"
        fill="${props.color}"
        opacity="${props.isActive ? "0.8" : "0.4"}"
      />
    `;
  }).join("");
});

// 响应式样式
const waveformStyle = computed(() => ({
  width: `${props.width}px`,
  height: `${props.height}px`,
  filter: props.isActive ? `drop-shadow(0 0 2px ${props.color})` : "none",
  transition: "all 0.2s ease",
}));
</script>

<template>
  <div class="audio-waveform" :style="waveformStyle">
    <svg
      :width="width"
      :height="height"
      :viewBox="`0 0 ${width} ${height}`"
      class="waveform-svg"
    >
      <g v-html="svgContent" />
    </svg>
  </div>
</template>

<style scoped>
.audio-waveform {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.waveform-svg {
  width: 100%;
  height: 100%;
}

.waveform-svg g rect,
.waveform-svg g polyline {
  transition: opacity 0.1s ease;
}

/* 静默状态动画 */
.audio-waveform:not([data-active="true"]) .waveform-svg g rect {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.2;
  }
  50% {
    opacity: 0.4;
  }
}

/* 活跃状态动画 */
.audio-waveform[data-active="true"] .waveform-svg g rect {
  animation: waveActive 0.3s ease-in-out infinite alternate;
}

@keyframes waveActive {
  0% {
    transform: scaleY(0.8);
  }
  100% {
    transform: scaleY(1.2);
  }
}
</style>
