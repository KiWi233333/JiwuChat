<script lang="ts" setup>
/**
 * 自动折叠面板组件
 * 当内容超过指定高度时，自动显示展开/收起按钮
 */
interface Props {
  /** 最大高度（px） */
  maxHeight?: number
  /** 显示展开按钮时的最大高度（px） */
  maxHeightWithExpandButton?: number
  /** 是否禁用动画 */
  disabledAnimate?: boolean
  /** 是否自动隐藏展开按钮（鼠标悬停时显示） */
  autoHideExpandButton?: boolean
  /** 是否禁用自动折叠 */
  disabled?: boolean
  /** 渐变背景颜色（hash 颜色，如 #ffffff） */
  gradientColor?: string
  /** 受控模式：展开/收起状态（支持 v-model） */
  modelValue?: boolean
  /** 默认展开状态 */
  defaultExpanded?: boolean
}

const {
  maxHeight = 200,
  maxHeightWithExpandButton = 40,
  disabledAnimate = false,
  autoHideExpandButton = true,
  disabled = false,
  gradientColor = "var(--el-bg-color-overlay)",
  modelValue = undefined,
  defaultExpanded = false,
} = defineProps<Props>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
}>();

// 非受控模式下的内部状态
const internalExpanded = ref(defaultExpanded);

// 判断是否为受控模式
const isControlled = computed(() => modelValue !== undefined);

// 展开状态：受控模式使用 modelValue，非受控模式使用内部状态
const isExpanded = computed({
  get: () => isControlled.value ? (modelValue ?? defaultExpanded) : internalExpanded.value,
  set: (value: boolean) => {
    if (isControlled.value) {
      emit("update:modelValue", value);
    }
    else {
      internalExpanded.value = value;
    }
  },
});
const contentHeight = ref(0);
const shouldShowExpandButton = ref(false);
const contentRef = ref<HTMLElement>();
let observer: ResizeObserver | null = null;

const getHeight = computed(() => {
  if (!shouldShowExpandButton.value || disabled || disabledAnimate) {
    return "none";
  }
  return isExpanded.value
    ? `${contentHeight.value + maxHeightWithExpandButton}px`
    : `${maxHeight}px`;
});

function checkContentOverflow() {
  const element = contentRef.value;
  if (element) {
    contentHeight.value = element.scrollHeight || 0;
    shouldShowExpandButton.value = contentHeight.value > maxHeight;
  }
}

function observeContent() {
  const element = contentRef.value;
  if (!element)
    return;

  observer = new ResizeObserver(() => {
    checkContentOverflow();
  });

  observer.observe(element);
  checkContentOverflow(); // Initial check
}

function toggleExpand(value?: boolean) {
  if (value !== undefined) {
    isExpanded.value = value;
  }
  else {
    isExpanded.value = !isExpanded.value;
  }
}

onMounted(() => {
  observeContent();
});

onBeforeUnmount(() => {
  if (observer) {
    observer.disconnect();
  }
});
</script>

<template>
  <div
    v-if="!disabled"
    class="relative min-h-0 overflow-hidden"
    :class="{
      'transition-none': disabledAnimate,
      'auto-hide-expand-button': autoHideExpandButton,
      'gradient-overlay': shouldShowExpandButton && !isExpanded,
    }"
    :style="{
      'maxHeight': getHeight,
      'transition': disabledAnimate ? 'none' : 'min-height 0.3s ease-in-out, max-height 0.3s ease-in-out',
      '--gradient-color': gradientColor,
    }"
    v-bind="$attrs"
  >
    <div ref="contentRef">
      <slot />
    </div>
    <slot
      v-if="shouldShowExpandButton && !disabled"
      name="toggle-button"
      :is-expanded="isExpanded"
      :toggle-expand="toggleExpand"
    >
      <div
        class="sticky bottom-0 left-0 right-0 z-100 min-w-fit flex btn-default-text cursor-pointer items-center justify-center border-1px border-transparent rounded-2 bg-color-linear-down p-1 px-2 pb-2 text-mini-50 transition-all-200"
        :class="{
          'transition-opacity-200 bg-transparent': autoHideExpandButton,
        }"
        @click="() => toggleExpand()"
      >
        {{ isExpanded ? '收起' : '展开' }}
        <i
          class="i-solar-double-alt-arrow-up-line-duotone ml-1 text-1em transition-transform-300"
          :class="{ 'rotate-180deg': !isExpanded }"
        />
      </div>
    </slot>
  </div>
  <template v-if="disabled">
    <slot />
  </template>
</template>

<style lang="scss" scoped>
.auto-hide-expand-button {
  &:hover {
    > div:nth-child(2) {
      --at-apply: "op-100";
    }
  }
}

.gradient-overlay {
  &::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: min(50%, 100px);
    pointer-events: none;
    z-index: 1;
    background: linear-gradient(to top, var(--el-bg-color-overlay), transparent 100%);
  }
}
</style>

