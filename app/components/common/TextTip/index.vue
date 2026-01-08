<script lang="ts">
</script>

<script setup lang="ts">
import type { TooltipTriggerType } from "element-plus";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

export interface TextTipProps {
  /** tooltip/文本内容 */
  content?: string;
  /** tooltip气泡显示位置 */
  placement?: string;
  /** 是否显示文本箭头 */
  showTextArrow?: boolean;
  /** 主题风格（'dark'|'light'） */
  effect?: string;
  /** 自动省略溢出文本并加... */
  autoEllipsis?: boolean;
  /** tooltip自定义popper样式类 */
  popperClass?: string | string[];
  /** tooltip自定义popper样式 */
  popperStyle?: Record<string, any>;
  /** 是否监听窗口resize自动计算溢出 */
  listenResize?: boolean;
  /** 额外传给el-tooltip的参数对象 */
  tooltipAttrs?: Record<string, any>;
  /** tooltip 触发方式: hover/click/click-outside */
  trigger?: "hover" | "click" | "click-outside";
  /** tooltip出现/消失的防抖延时(ms) */
  debounceDelay?: number;
  /** click-outside模式下消失延时(ms) */
  clickOutsideDelay?: number;
}

defineOptions({
  name: "TextTip",
});

const {
  content = "",
  placement = "top",
  showTextArrow = false,
  effect = "dark",
  autoEllipsis = true,
  popperClass = "",
  popperStyle = { maxWidth: "20em" },
  listenResize = true,
  tooltipAttrs = {},
  trigger = "hover",
  debounceDelay = 100,
  clickOutsideDelay = 300,
} = defineProps<TextTipProps>();

const emit = defineEmits<{
  (e: "click", event: MouseEvent): void;
  (e: "update:visible", visible: boolean): void;
}>();

const textElement = ref<HTMLElement | null>(null);
const showTooltip = ref(false);
const tooltipContent = ref("");
const tooltipVisible = ref(false);
const isClickOutsideMode = ref(false);

let debounceTimer: NodeJS.Timeout | null = null;
let clickOutsideTimer: NodeJS.Timeout | null = null;
let mutationObserver: MutationObserver | null = null;
let intersectionObserver: IntersectionObserver | null = null;

// 根据展开方向计算箭头图标的旋转角度
const textArrowStyle = computed(() => {
  if (!tooltipVisible.value) {
    return { transform: "" };
  }

  const rotateMap: Record<string, number> = {
    top: -90,
    bottom: 90,
    left: 180,
    right: 0,
  };

  const direction = Object.keys(rotateMap).find(key => placement.toLowerCase().startsWith(key));
  const rotate = direction ? rotateMap[direction] : 0;

  return {
    transform: `rotate(${rotate}deg)`,
  };
});

const isOutsideTrigger = computed(() => trigger === "click-outside");

const textClass = computed(() => (autoEllipsis ? "text-tip-ellipsis" : ""));

// 监听 trigger 变化
watch(() => trigger, (newVal) => {
  isClickOutsideMode.value = newVal === "click-outside";
}, { immediate: true });

// 获取文本内容
function getTextContent(el: HTMLElement) {
  return el.textContent?.trim() || content || "";
}

// 仅保留 Range 检测方法
function detectByRange(el: HTMLElement) {
  try {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rangeWidth = range.getBoundingClientRect().width;
    const containerWidth = el.getBoundingClientRect().width;
    range.detach && range.detach();
    return rangeWidth > containerWidth + 1;
  }
  catch (error) {
    console.warn("Range detection failed:", error);
    return false;
  }
}

function checkOverflow() {
  if (!autoEllipsis) {
    showTooltip.value = false;
    return;
  }

  const el = textElement.value;
  if (!el) {
    return;
  }

  const isOverflowing = detectByRange(el);

  if (isOverflowing) {
    const textContent = getTextContent(el);
    showTooltip.value = true;
    tooltipContent.value = textContent;
  }
  else {
    showTooltip.value = false;
    tooltipContent.value = "";
  }
}

// 防抖处理
function debouncedCheckOverflow() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    nextTick(checkOverflow);
  }, debounceDelay);
}

// 监听内容变化
watch(() => content, () => {
  debouncedCheckOverflow();
});

function handleSpanClick(event: MouseEvent) {
  if (isClickOutsideMode.value && showTooltip.value) {
    tooltipVisible.value = !tooltipVisible.value;
    emit("click", event);
  }
}

function handleMouseEnter() {
  if (isClickOutsideMode.value && tooltipVisible.value) {
    tooltipVisible.value = true;
    if (clickOutsideTimer) {
      clearTimeout(clickOutsideTimer);
    }
  }
}

function handleMouseLeave() {
  if (isClickOutsideMode.value && tooltipVisible.value) {
    if (clickOutsideTimer) {
      clearTimeout(clickOutsideTimer);
    }
    clickOutsideTimer = setTimeout(() => {
      tooltipVisible.value = false;
    }, clickOutsideDelay);
  }
}

function handleTooltipVisibleUpdate(visible: boolean) {
  if (!isClickOutsideMode.value) {
    tooltipVisible.value = visible;
  }
  emit("update:visible", visible);
}

function initObservers() {
  // 监听窗口大小变化
  if (listenResize) {
    window.addEventListener("resize", debouncedCheckOverflow);
  }

  // 监听内容变化
  mutationObserver = new MutationObserver(debouncedCheckOverflow);
  if (textElement.value) {
    mutationObserver.observe(textElement.value, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  // 监听元素可见性变化
  intersectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          debouncedCheckOverflow();
        }
      });
    },
    { threshold: 0 },
  );
  if (textElement.value) {
    intersectionObserver.observe(textElement.value);
  }
}

function cleanup() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  if (clickOutsideTimer) {
    clearTimeout(clickOutsideTimer);
  }
  if (listenResize) {
    window.removeEventListener("resize", debouncedCheckOverflow);
  }
  mutationObserver?.disconnect();
  intersectionObserver?.disconnect();
}

onMounted(() => {
  initObservers();
  debouncedCheckOverflow();
});

onBeforeUnmount(() => {
  cleanup();
});
</script>

<template>
  <el-tooltip
    v-if="showTooltip"
    :popper-class="['text-tip-popover', popperClass]"
    :popper-style="popperStyle"
    :content="tooltipContent"
    :effect="effect"
    :placement="placement"
    :trigger="isOutsideTrigger ? 'click' : (trigger as TooltipTriggerType)"
    transition="text-tip-fade"
    v-bind="tooltipAttrs"
    :visible="isOutsideTrigger ? tooltipVisible : undefined"
    :show-after="300"
    @update:visible="handleTooltipVisibleUpdate"
  >
    <template #content>
      <el-scrollbar
        max-height="300px"
        class="popper-content"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
      >
        <slot name="content">
          {{ tooltipContent }}
        </slot>
      </el-scrollbar>
    </template>
    <span
      ref="textElement"
      class="cursor-pointer"
      :class="textClass"
      v-bind="$attrs"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      @click="handleSpanClick"
    >
      <!-- 文本内容部分 -->
      <span class="text-tip-content">
        <slot>{{ content }}</slot>
      </span>

      <!-- 文本箭头插槽 -->
      <slot v-if="showTextArrow" name="arrow">
        <i class="ri-arrow-right-s-line arrow-icon" :style="textArrowStyle" />
      </slot>
    </span>
  </el-tooltip>
  <span
    v-else
    ref="textElement"
    :class="textClass"
    v-bind="$attrs"
    @click="handleSpanClick"
  >
    <span class="text-tip-content">
      <slot>{{ content }}</slot>
    </span>
  </span>
</template>

<style scoped lang="scss">
.text-tip-ellipsis {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  max-width: 100%;
  line-height: 1.3;

  .text-tip-content {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}

.popper-content {
  padding: 8px;
  word-break: break-word;
  white-space: pre-line;
  word-wrap: break-word;
}

.arrow-icon {
  flex-shrink: 0;
  margin-left: 4px;
  transition: transform 0.2s ease;
}
</style>

<style lang="scss">
// 全局样式，用于 popper-class
.text-tip-popover {
  max-width: 100%;
  width: 100%;
  padding: 0;
  box-shadow: var(--el-box-shadow-light);
}
</style>
