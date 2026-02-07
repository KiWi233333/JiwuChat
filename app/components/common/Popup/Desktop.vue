<script lang="ts">
import type { HTMLAttributes } from "vue";
</script>

<script setup lang="ts">
import { CustomDialogPopupId } from "@/composables/hooks/useShortcuts";

export interface PopupDesktopProps {
  overlayerAttrs?: HTMLAttributes
  modelValue?: boolean
  title?: string
  width?: string | number
  showClose?: boolean
  confirmButtonText?: string
  cancelButtonText?: string
  closeOnClickModal?: boolean
  teleportTo?: string | HTMLElement
  contentClass?: string
  duration?: number
  destroyOnClose?: boolean
  center?: boolean
  zIndex?: number
  disableClass?: string
  modelClass?: string
  minScale?: number
  escClose?: boolean
  /** 是否从触发点开始动画 */
  animateFromTrigger?: boolean
  /** 进入动画曲线 */
  enterEasing?: string
  /** 离开动画曲线 */
  leaveEasing?: string
}

defineOptions({
  inheritAttrs: false,
});

const {
  overlayerAttrs = {},
  title,
  width = "",
  showClose = true,
  teleportTo = "body",
  closeOnClickModal = true,
  contentClass = "",
  disableClass = "disabled-anima",
  duration = 300,
  zIndex = 1999,
  center = false,
  destroyOnClose = false,
  minScale = 0.80,
  escClose = true,
  animateFromTrigger = true,
  enterEasing = "cubic-bezier(0.61, 0.225, 0.195, 1)",
  leaveEasing = "cubic-bezier(0.4, 0, 0.2, 1)",
} = defineProps<PopupDesktopProps>();

const emit = defineEmits<{
  (e: "confirm"): void
  (e: "cancel"): void
  (e: "open"): void
  (e: "opened"): void
  (e: "close"): void
  (e: "closed"): void
}>();
const modelValue = defineModel<boolean>({
  default: false,
  required: true,
});

interface DialogPosition {
  x: number
  y: number
}

interface DialogStyle {
  transformOrigin?: string
  transform?: string
  opacity?: string
  transition?: string
}

// ==================== 状态管理 ====================
const dialogRef = useTemplateRef<HTMLElement>("dialogRef");

// 简化状态:合并显示和历史状态
const displayModelValue = ref(modelValue.value);
const shouldRenderContent = ref(modelValue.value);
const isAnimating = ref(false);
const lastClickPosition = ref<DialogPosition>({ x: 0, y: 0 });
const dialogStyle = ref<DialogStyle>({
  transform: "scale(1)",
  opacity: "1",
});

// ==================== 路由历史状态管理 ====================
// 使用路由历史状态管理弹窗打开/关闭状态
// 当弹窗打开时会在 URL 添加 query 参数，用户点击返回键可以关闭弹窗
useHistoryState(modelValue, {
  enabled: true,
  activeValue: true,
  inactiveValue: false,
  useBackNavigation: true,
});

// ==================== 计算属性 ====================
const dialogWidth = computed(() => {
  if (!width)
    return "";
  return typeof width === "number" ? `${width}px` : width;
});

const enterTransition = computed(() =>
  `transform var(--duration, 0.3s) ${enterEasing}, opacity var(--duration, 0.3s) ${enterEasing}`,
);

const leaveTransition = computed(() =>
  `transform var(--duration, 0.3s) ${leaveEasing}, opacity var(--duration, 0.3s) ${leaveEasing}`,
);

// 缓存变换原点,避免重复计算
const transformOrigin = computed(() => {
  if (!animateFromTrigger || !dialogRef.value)
    return "center";

  const dialog = dialogRef.value;
  const originalTransform = dialog.style.transform;
  dialog.style.transform = "none";
  const rect = dialog.getBoundingClientRect();
  dialog.style.transform = originalTransform;

  const clickX = lastClickPosition.value.x || window.innerWidth / 2;
  const clickY = lastClickPosition.value.y || window.innerHeight / 2;

  return `${clickX - rect.left}px ${clickY - rect.top}px`;
});

// ==================== 监听器 ====================
watch(modelValue, (newVal) => {
  displayModelValue.value = newVal;
  if (newVal) {
    shouldRenderContent.value = true;
  }
});

watch(displayModelValue, (newVal) => {
  if (newVal !== modelValue.value) {
    modelValue.value = newVal;
  }
});

// ==================== 工具函数 ====================
function applyDialogStyle(style: DialogStyle) {
  dialogStyle.value = style;
}

function resetClickPosition() {
  lastClickPosition.value = { x: 0, y: 0 };
}

// ==================== 事件处理 ====================
function trackMousePosition(e: MouseEvent) {
  if (!isAnimating.value && !modelValue.value) {
    lastClickPosition.value = { x: e.clientX, y: e.clientY };
  }
}

function handleEscClose(e: KeyboardEvent) {
  if (escClose && modelValue.value && e.key === "Escape") {
    e.stopImmediatePropagation();
    e.preventDefault();
    modelValue.value = false;
    emit("cancel");
  }
}

function handleClose() {
  if (closeOnClickModal) {
    modelValue.value = false;
    emit("cancel");
  }
}

function handleConfirm() {
  emit("confirm");
  modelValue.value = false;
}

// ==================== 过渡动画钩子 ====================
function onBeforeEnter(): void {
  emit("open");
  isAnimating.value = true;
  applyDialogStyle({
    transform: `scale(${minScale})`,
    opacity: "0",
    transition: "none",
  });
}

function onEnter(): void {
  nextTick(() => {
    if (!dialogRef.value)
      return;

    const origin = transformOrigin.value;

    // 立即应用起始状态
    applyDialogStyle({
      transformOrigin: origin,
      transform: `scale(${minScale})`,
      opacity: "0",
      transition: "none",
    });

    // 双帧延迟确保浏览器识别起始状态
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        applyDialogStyle({
          transformOrigin: origin,
          transform: "scale(1)",
          opacity: "1",
          transition: enterTransition.value,
        });
      });
    });
  });
}

function onAfterEnter(): void {
  emit("opened");
  isAnimating.value = false;
}

function onBeforeLeave(): void {
  emit("close");
  isAnimating.value = true;
  if (!dialogRef.value)
    return;

  const origin = transformOrigin.value;

  applyDialogStyle({
    transformOrigin: origin,
    transform: "scale(1)",
    opacity: "1",
    transition: "none",
  });

  nextTick(() => {
    applyDialogStyle({
      transformOrigin: origin,
      transform: `scale(${minScale})`,
      opacity: "0",
      transition: leaveTransition.value,
    });
  });
}

function onAfterLeave(): void {
  emit("closed");
  applyDialogStyle({
    transformOrigin: "center",
    transform: "scale(1)",
    opacity: "1",
  });
  isAnimating.value = false;

  // 动画结束后处理销毁和重置
  if (destroyOnClose) {
    shouldRenderContent.value = false;
  }
  resetClickPosition();
}

// ==================== 生命周期钩子 ====================
onMounted(() => {
  window.addEventListener("mousedown", trackMousePosition, { passive: true });
  if (escClose) {
    window.addEventListener("keydown", handleEscClose);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("mousedown", trackMousePosition);
  if (escClose) {
    window.removeEventListener("keydown", handleEscClose);
  }
});

// ==================== 暴露方法 ====================
defineExpose({
  handleClose,
  handleConfirm,
});
</script>

<template>
  <Teleport :to="teleportTo">
    <slot name="before" />
    <Transition
      active-class="animate-(fade-in duration-300)"
      leave-active-class="animate-(fade-out duration-300)"
      @before-enter="onBeforeEnter"
      @enter="onEnter"
      @after-enter="onAfterEnter"
      @before-leave="onBeforeLeave"
      @after-leave="onAfterLeave"
    >
      <div
        v-show="displayModelValue"
        key="dialogModel"
        :style="{
          '--duration': `${duration}ms`,
          'zIndex': `${zIndex}`,
        }"
        v-bind="overlayerAttrs"
        class="fixed inset-0 flex items-center justify-center"
        @click.self="handleClose"
      >
        <!-- 背景遮罩 -->
        <Transition name="mode-fade">
          <div
            v-if="displayModelValue"
            class="fixed inset-0 z-0 border-default-2 bg-black/30 transition-opacity duration-300 dark:bg-black/40"
            :class="modelClass"
            @click.stop.prevent="handleClose"
          >
            <slot name="mark-content" />
          </div>
        </Transition>
        <!-- 对话框 -->
        <div
          v-if="shouldRenderContent"
          :id="CustomDialogPopupId"
          ref="dialogRef"
          :data-model-value="escClose && displayModelValue"
          :style="[dialogStyle, { width: dialogWidth }]"
          class="relative"
          :class="{
            [disableClass]: isAnimating,
            'max-w-full rounded-2 sm:w-fit p-4 border-default-2 dialog-bg-color shadow': !contentClass,
            [contentClass]: contentClass,
            'text-center': center,
          }"
          v-bind="$attrs"
        >
          <!-- 标题区 -->
          <div v-if="title || showClose || $slots.title" class="relative pr-4">
            <slot name="title">
              <div mb-4>
                {{ title }}
              </div>
            </slot>
            <span
              v-if="showClose"
              class="absolute right-0 top-0 btn-danger cursor-pointer"
              @click="handleClose"
            >
              <i
                i-carbon:close p-2.8
                title="关闭"
              />
            </span>
          </div>
          <!-- 内容区 -->
          <slot />
          <!-- 底部 -->
          <slot name="footer" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.disabled-anima {
  * {
    transition: none !important;
  }
}
.mode-fade-enter-active,
.mode-fade-leave-active {
  transition: opacity 0.3s ease-in-out;
}
.mode-fade-enter-from,
.mode-fade-leave-to {
  opacity: 0;
}
</style>
