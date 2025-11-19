<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { CustomDialogPopupId } from "@/composables/hooks/useShortcuts";

interface DialogPosition {
  x: number
  y: number
}

interface DialogStyle {
  transformOrigin?: string
  transform?: string
  opacity?: string
  width?: string
  transition?: string
}

interface DialogProps {
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

const {
  overlayerAttrs = {},
  modelValue = false,
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
  leaveEasing = "cubic-bezier(0.4, 0, 0.2, 1)", // 平滑退出
} = defineProps<DialogProps>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void
  (e: "confirm"): void
  (e: "cancel"): void
  (e: "open"): void
  (e: "opened"): void
  (e: "close"): void
  (e: "closed"): void
}>();

// ==================== 状态管理 ====================
const dialogModelRef = useTemplateRef<HTMLElement>("dialogModelRef");
const dialogRef = useTemplateRef<HTMLElement>("dialogRef");

// 控制内容渲染的状态
const shouldRenderContent = ref(modelValue);
// 是否应当销毁内容标记
const shouldDestroy = ref(false);
// 动画加载状态
const loadingAnima = ref(false);
// 最后点击位置
const lastClickPosition = ref<DialogPosition>({ x: 0, y: 0 });
// 对话框样式
const dialogStyle = ref<DialogStyle>({
  transform: "scale(1)",
  opacity: "1",
});

// ==================== 计算属性 ====================
// 计算对话框的最终宽度
const dialogWidth = computed(() => {
  if (!width)
    return "";
  return typeof width === "number" ? `${width}px` : width;
});

// 进入动画过渡
const enterTransition = computed(() =>
  `transform var(--duration, 0.3s) ${enterEasing}, opacity var(--duration, 0.3s) ${enterEasing}`,
);

// 离开动画过渡
const leaveTransition = computed(() =>
  `transform var(--duration, 0.3s) ${leaveEasing}, opacity var(--duration, 0.3s) ${leaveEasing}`,
);

// ==================== 监听器 ====================
// 监听 modelValue 变化
watch(() => modelValue, (newVal) => {
  if (newVal) {
    // 打开时,立即渲染内容
    shouldRenderContent.value = true;
    shouldDestroy.value = false;
  }
  else if (destroyOnClose) {
    // 关闭时,将销毁标记置为true,实际销毁会在动画结束后执行
    shouldDestroy.value = true;
  }
});

// ==================== 工具函数 ====================
// 计算点击位置相对于对话框的相对坐标
function calculateTransformOrigin() {
  // 如果不从触发点开始动画,直接返回中心点
  if (!animateFromTrigger)
    return "center";

  if (!dialogRef.value)
    return "center";

  const dialog = dialogRef.value;
  const rect = dialog.getBoundingClientRect();

  // 使用最后的点击位置或窗口中心作为默认值
  const clickX = lastClickPosition.value.x || window.innerWidth / 2;
  const clickY = lastClickPosition.value.y || window.innerHeight / 2;

  // 计算点击位置相对于对话框的相对坐标
  const originX = clickX - rect.left;
  const originY = clickY - rect.top;

  return `${originX}px ${originY}px`;
}

// 销毁方法
function destroy() {
  // 只有在需要销毁时才执行
  if (shouldDestroy.value) {
    // 设置状态以阻止内容渲染
    shouldRenderContent.value = false;
    // 重置点击位置
    lastClickPosition.value = { x: 0, y: 0 };
  }
}

// ==================== 事件处理 ====================
// 监听鼠标点击事件,记录点击位置
function trackMousePosition(e: MouseEvent) {
  if ((!loadingAnima.value && !modelValue) || (!lastClickPosition.value.x && !lastClickPosition.value.y)) {
    lastClickPosition.value = { x: e.clientX, y: e.clientY };
  }
}

// 处理ESC键关闭
function handleEscClose(e: KeyboardEvent) {
  // 检查是否启用ESC关闭功能且对话框已打开
  if (escClose && modelValue && e.key === "Escape") {
    // 立即阻止事件冒泡和默认行为,防止其他监听器捕获
    e.stopImmediatePropagation();
    e.preventDefault();
    e.stopPropagation();
    emit("update:modelValue", false);
    emit("cancel");
  }
}

// 处理关闭对话框
function handleClose() {
  if (closeOnClickModal) {
    emit("update:modelValue", false);
    emit("cancel");
  }
}

// 处理确认按钮点击
function handleConfirm() {
  emit("confirm");
  emit("update:modelValue", false);
}

// ==================== 过渡动画钩子 ====================
function onBeforeEnter(): void {
  emit("open");
  loadingAnima.value = true;
  // 重置样式,准备开始入场动画
  dialogStyle.value = {
    transform: `scale(${minScale})`,
    opacity: "0",
    transition: "none",
  };
}

function onEnter(): void {
  // 在下一个帧应用变换原点和动画
  nextTick(() => {
    if (!dialogRef.value)
      return;
    const originPoint = calculateTransformOrigin();
    dialogStyle.value = {
      transformOrigin: originPoint,
      transform: "scale(1)",
      opacity: "1",
      transition: enterTransition.value,
    };
  });
}

function onAfterEnter(): void {
  emit("opened");
  loadingAnima.value = false;
}

function onBeforeLeave(): void {
  emit("close");
  loadingAnima.value = true;
  if (!dialogRef.value)
    return;

  // 使用与打开相同的变换原点
  const originPoint = calculateTransformOrigin();

  // 首先确保有正确的原点,但保持对话框可见
  dialogStyle.value = {
    transformOrigin: originPoint,
    transform: "scale(1)",
    opacity: "1",
    transition: "none", // 确保立即应用
  };

  // 然后在下一帧应用收缩动画
  nextTick(() => {
    dialogStyle.value = {
      transformOrigin: originPoint,
      transform: `scale(${minScale})`,
      opacity: "0",
      transition: leaveTransition.value,
    };
  });
}

function onAfterLeave(): void {
  emit("closed");
  // 重置样式
  dialogStyle.value = {
    transform: "scale(1)",
    opacity: "1",
  };
  loadingAnima.value = false;

  // 在动画完全结束后,如果标记为应当销毁,则执行销毁操作
  if (shouldDestroy.value) {
    destroy();
  }
}

// ==================== 生命周期钩子 ====================
onMounted(() => {
  window.addEventListener("mousedown", trackMousePosition);
  // 添加键盘事件监听器
  if (escClose) {
    window?.addEventListener("keydown", handleEscClose);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("mousedown", trackMousePosition);
  // 移除键盘事件监听器
  if (escClose) {
    window?.removeEventListener("keydown", handleEscClose);
  }
});

// ==================== 暴露方法 ====================
defineExpose({
  handleClose,
  handleConfirm,
  destroy,
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
        v-show="modelValue"
        key="dialogModel"
        ref="dialogModelRef"
        :style="{
          '--duration': `${duration}ms`,
          'zIndex': `${zIndex}`,
        }"
        v-bind="overlayerAttrs"
        class="fixed inset-0 flex items-center justify-center"
        @click.self="handleClose"
      >
        <!-- 背景遮罩 -->
        <Transition name="page-fade">
          <div
            v-if="modelValue"
            class="fixed inset-0 z-0 border-default-2 card-rounded-df bg-black/30 transition-opacity duration-300 dark:bg-black/40"
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
          :data-model-value="escClose && modelValue"
          :style="[dialogStyle, { width: dialogWidth }]"
          class="relative"
          :class="{
            [disableClass]: loadingAnima,
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
</style>
