<script lang="ts">
</script>

<script setup lang="ts">
import { useEventListener, useResizeObserver } from "@vueuse/core";
import { useSwipe } from "@/composables/hooks/useSwipe";

export interface SwipeActionButton {
  text?: string;
  icon?: string;
  type?: "primary" | "success" | "warning" | "danger" | "info" | "default";
  color?: string;
  class?: string;
  style?: any;
  onClick?: (e: MouseEvent) => void;
}

const props = withDefaults(defineProps<{
  leftButtons?: SwipeActionButton[];
  rightButtons?: SwipeActionButton[];
  disabled?: boolean;
  autoClose?: boolean;
  threshold?: number; // 触发阈值比例
}>(), {
  leftButtons: () => [],
  rightButtons: () => [],
  disabled: false,
  autoClose: true,
  threshold: 0.3,
});

const emit = defineEmits<{
  (e: "open", side: "left" | "right"): void;
  (e: "close"): void;
  (e: "click", event: MouseEvent): void;
}>();

const containerRef = ref<HTMLElement | null>(null);
const leftRef = ref<HTMLElement | null>(null);
const rightRef = ref<HTMLElement | null>(null);

// 状态管理
const offset = ref(0);
const isDragging = ref(false);
const isOpen = ref<"left" | "right" | "none">("none");

// 宽度
const leftWidth = ref(0);
const rightWidth = ref(0);

// 计算宽度
function updateWidths() {
  leftWidth.value = leftRef.value?.offsetWidth || 0;
  rightWidth.value = rightRef.value?.offsetWidth || 0;
}

onMounted(() => {
  updateWidths();
  // 监听 resize
  useResizeObserver(containerRef, updateWidths);
});

// 手势处理
useSwipe(containerRef, {
  disabled: computed(() => props.disabled),
  onlyHorizontal: true,
  threshold: 6, // 稍微移动一点就开始响应，避免过于灵敏
  angleThreshold: 20, // 限制角度
  onSwipeStart: () => {
    isDragging.value = true;
    updateWidths(); // 确保宽度最新
  },
  onSwipeMove: (_e, state) => {
    let newOffset = state.x;

    // 如果已经是打开状态，基础偏移量不同
    if (isOpen.value === "left") {
      newOffset += leftWidth.value;
    }
    else if (isOpen.value === "right") {
      newOffset -= rightWidth.value;
    }

    // 阻尼效果
    if (newOffset > 0) {
      // 向右滑
      if (props.leftButtons.length === 0) {
        newOffset = newOffset * 0.1; // 无按钮时阻尼极大
      }
      else if (newOffset > leftWidth.value) {
        // 超出左侧按钮宽度，增加阻尼
        const over = newOffset - leftWidth.value;
        newOffset = leftWidth.value + over ** 0.85; // 非线性阻尼
      }
    }
    else if (newOffset < 0) {
      // 向左滑
      if (props.rightButtons.length === 0) {
        newOffset = newOffset * 0.1;
      }
      else if (newOffset < -rightWidth.value) {
        const over = -newOffset - rightWidth.value;
        newOffset = -rightWidth.value - over ** 0.85;
      }
    }

    offset.value = newOffset;
  },
  onSwipeEnd: (_e, state) => {
    isDragging.value = false;
    const velocity = state.vx; // 像素/毫秒
    const currentOffset = offset.value;

    let targetOffset = 0;
    let targetState: "left" | "right" | "none" = "none";

    // 惯性预测位置 (offset + velocity * constant)
    // 假设惯性滑动 200ms
    const projectedOffset = currentOffset + velocity * 200;

    // 寻找最近的锚点
    const anchors = [0];
    if (props.leftButtons.length > 0)
      anchors.push(leftWidth.value);
    if (props.rightButtons.length > 0)
      anchors.push(-rightWidth.value);

    // 简单的最近邻算法
    const closest = anchors.reduce((prev, curr) => {
      return Math.abs(curr - projectedOffset) < Math.abs(prev - projectedOffset) ? curr : prev;
    });

    targetOffset = closest;

    // 更新状态
    if (targetOffset === leftWidth.value && leftWidth.value > 0) {
      targetState = "left";
    }
    else if (targetOffset === -rightWidth.value && rightWidth.value > 0) {
      targetState = "right";
    }

    // 触发事件
    if (targetState !== isOpen.value) {
      if (targetState === "none") {
        emit("close");
      }
      else {
        emit("open", targetState);
      }
    }

    offset.value = targetOffset;
    isOpen.value = targetState;
  },
});

// 点击/触摸外部关闭
// 使用 capture 捕获模式，确保在移动端触摸其他区域时能立即响应关闭
function handleOutside(e: Event) {
  if (isOpen.value !== "none" && containerRef.value && !containerRef.value.contains(e.target as Node)) {
    close();
  }
}

useEventListener(window, "touchstart", handleOutside, { passive: true, capture: true });
useEventListener(window, "click", handleOutside, { passive: true, capture: true });

// 公开方法
function close() {
  offset.value = 0;
  isOpen.value = "none";
  emit("close");
}

function open(side: "left" | "right") {
  updateWidths();
  if (side === "left" && props.leftButtons.length) {
    offset.value = leftWidth.value;
    isOpen.value = "left";
    emit("open", "left");
  }
  else if (side === "right" && props.rightButtons.length) {
    offset.value = -rightWidth.value;
    isOpen.value = "right";
    emit("open", "right");
  }
}

function handleActionClick(btn: SwipeActionButton, e: MouseEvent) {
  e.stopPropagation();
  btn.onClick?.(e);
  if (props.autoClose) {
    close();
  }
}

// 辅助函数
function getBtnClass(btn: SwipeActionButton) {
  const classes = [btn.class || ""];
  if (btn.color) {
    return classes.join(" ");
  }
  if (btn.type && btn.type !== "default") {
    classes.push(`bg-theme-${btn.type} text-light`);
  }
  else {
    classes.push("bg-color-inverse text-light");
  }
  return classes.join(" ");
}

function getBtnStyle(btn: SwipeActionButton) {
  const style: any = { ...btn.style };
  if (btn.color) {
    style.backgroundColor = btn.color;
  }
  return style;
}

// 暴露
defineExpose({ close, open });
</script>

<template>
  <div
    ref="containerRef"
    class="swipe-action-wrap relative w-full overflow-hidden"
  >
    <!-- 左侧按钮 -->
    <div
      ref="leftRef"
      class="absolute left-0 top-0 h-full flex transform-gpu"
      :class="{ 'transition-transform duration-300 ease-[cubic-bezier(0.18,0.89,0.32,1)]': !isDragging }"
      :style="{ transform: `translateX(${Math.min(0, offset - leftWidth)}px)` }"
    >
      <div
        v-for="(btn, idx) in leftButtons"
        :key="idx"
        class="swipe-btn"
        :class="getBtnClass(btn)"
        :style="getBtnStyle(btn)"
        @click="handleActionClick(btn, $event)"
      >
        <div v-if="btn.icon" :class="btn.icon" class="mb-1 text-xl" />
        <span>{{ btn.text }}</span>
      </div>
    </div>

    <!-- 右侧按钮 -->
    <div
      ref="rightRef"
      class="absolute right-0 top-0 h-full flex transform-gpu"
      :class="{ 'transition-transform duration-300 ease-[cubic-bezier(0.18,0.89,0.32,1)]': !isDragging }"
      :style="{ transform: `translateX(${Math.max(0, offset + rightWidth)}px)` }"
    >
      <div
        v-for="(btn, idx) in rightButtons"
        :key="idx"
        class="swipe-btn"
        :class="getBtnClass(btn)"
        :style="getBtnStyle(btn)"
        @click="handleActionClick(btn, $event)"
      >
        <div v-if="btn.icon" :class="btn.icon" class="mb-1 text-xl" />
        <span>{{ btn.text }}</span>
      </div>
    </div>

    <!-- 内容 -->
    <div
      class="relative z-10 h-full w-full transform-gpu bg-[var(--el-bg-color)]"
      :class="{ 'transition-transform duration-300 ease-[cubic-bezier(0.18,0.89,0.32,1)]': !isDragging }"
      :style="{ transform: `translateX(${offset}px)` }"
      @click="isOpen !== 'none' ? close() : emit('click', $event)"
    >
      <slot />
      <!-- 遮罩层：打开时防止点击内容 -->
      <div
        v-if="isOpen !== 'none'"
        class="absolute inset-0 z-20 bg-transparent"
        @click.stop="close"
      />
    </div>
  </div>
</template>

<style scoped>
.swipe-btn {
  --at-apply: "flex flex-col items-center justify-center px-5 h-full whitespace-nowrap cursor-pointer select-none transition-opacity active:opacity-80";
}
</style>
