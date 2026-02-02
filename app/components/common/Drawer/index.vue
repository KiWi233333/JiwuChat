<script lang="ts">
</script>

<script setup lang="ts">
import { useZIndex } from "element-plus";
import { DRAWER_BODY_LOCK_CLASS } from "@/constants/ui";

export interface BodyLockConfig {
  /** 目标元素选择器或元素 */
  target?: string | HTMLElement
  /** 添加的类名 */
  className?: string
  /** 缩放比例 */
  scale?: number
  /** Y轴偏移距离(rem) */
  translateY?: number
  /** 圆角大小(rem) */
  borderRadius?: number
}

export interface DrawerProps {
  /** 控制抽屉显示/隐藏 */
  modelValue?: boolean
  /** 抽屉方向 */
  direction?: "top" | "bottom" | "left" | "right"
  /** 是否显示拖拽手柄 */
  showHandle?: boolean
  /** 是否可以通过拖拽关闭 */
  dragToClose?: boolean
  /** 拖拽关闭的阈值(px) */
  closeThreshold?: number
  /** 是否点击遮罩层关闭 */
  closeOnClickModal?: boolean
  /** 是否按ESC关闭 */
  closeOnPressEscape?: boolean
  /** 抽屉标题 */
  title?: string
  /** 抽屉大小(宽度或高度) */
  size?: string | number
  /** 自定义类名 */
  customClass?: string
  /** z-index */
  zIndex?: number
  /** 遮罩层透明度 */
  modalOpacity?: number
  /** 动画时长(ms) */
  duration?: number
  /** 关闭后销毁内容 */
  destroyOnClose?: boolean
  /** 传送目标 */
  teleportTo?: string | HTMLElement
  /** 背景联动效果配置 */
  bodyLock?: boolean | BodyLockConfig
}

const {
  direction = "bottom",
  showHandle = true,
  dragToClose = true,
  closeThreshold = 0,
  closeOnClickModal = true,
  closeOnPressEscape = true,
  title,
  size = "auto",
  customClass = "",
  zIndex,
  modalOpacity = 0.5,
  duration = 500,
  destroyOnClose = false,
  teleportTo = "body",
  bodyLock = true,
} = defineProps<DrawerProps>();

const emit = defineEmits<{
  (e: "open"): void
  (e: "opened"): void
  (e: "close"): void
  (e: "closed"): void
  (e: "dragStart"): void
  (e: "dragMove", offset: number): void
  (e: "dragEnd"): void
}>();
const modelValue = defineModel<boolean>({
  default: false,
  required: true,
});

// 使用 Element Plus 的 zIndex 管理
const { nextZIndex } = useZIndex();
const currentZIndex = ref(zIndex ?? nextZIndex());

// ==================== 背景联动配置 ====================
const bodyLockConfig = computed<BodyLockConfig | false>(() => {
  if (!bodyLock)
    return false;

  if (bodyLock === true) {
    return {
      target: `.${DRAWER_BODY_LOCK_CLASS}`,
      className: "drawer-body-locked",
      scale: 0.95,
      translateY: 2,
      borderRadius: 1,
    };
  }

  return {
    target: bodyLock.target || `.${DRAWER_BODY_LOCK_CLASS}`,
    className: bodyLock.className || "drawer-body-locked",
    scale: bodyLock.scale ?? 0.95,
    translateY: bodyLock.translateY ?? 2,
    borderRadius: bodyLock.borderRadius ?? 1,
  };
});

// ==================== 状态管理 ====================
const drawerRef = useTemplateRef<HTMLElement>("drawerRef");
const handleRef = useTemplateRef<HTMLElement>("handleRef");

const isOpen = computed(() => modelValue.value);
const shouldRender = ref(modelValue.value);
const isAnimating = ref(false);

// 拖拽相关状态
const isDragging = ref(false);
const dragStartPos = ref(0);
const dragCurrentPos = ref(0);
const dragOffset = ref(0);
const velocity = ref(0);
const lastMoveTime = ref(0);
const lastMovePos = ref(0);

// ==================== 计算属性 ====================
const isVertical = computed(() => direction === "top" || direction === "bottom");
const isHorizontal = computed(() => direction === "left" || direction === "right");

const drawerSize = computed(() => {
  if (!size || size === "auto")
    return "auto";
  return typeof size === "number" ? `${size}px` : size;
});

const drawerStyle = computed(() => {
  const baseStyle: any = {
    "--drawer-duration": `${duration}ms`,
    "zIndex": currentZIndex.value + 1,
  };

  if (isVertical.value) {
    if (drawerSize.value !== "auto") {
      baseStyle[direction === "top" ? "maxHeight" : "maxHeight"] = drawerSize.value;
    }
  }
  else {
    if (drawerSize.value !== "auto") {
      baseStyle.width = drawerSize.value;
    }
  }

  // 应用拖拽偏移
  if (isDragging.value || dragOffset.value !== 0) {
    baseStyle.transition = isDragging.value ? "none" : `transform ${duration}ms cubic-bezier(0.32, 0.72, 0, 1)`;

    const offset = dragOffset.value;
    switch (direction) {
      case "bottom":
        baseStyle.transform = `translateY(${Math.max(0, offset)}px)`;
        break;
      case "top":
        baseStyle.transform = `translateY(${Math.min(0, offset)}px)`;
        break;
      case "left":
        baseStyle.transform = `translateX(${Math.min(0, offset)}px)`;
        break;
      case "right":
        baseStyle.transform = `translateX(${Math.max(0, offset)}px)`;
        break;
    }
  }

  return baseStyle;
});

const overlayStyle = computed(() => {
  const style: any = {
    "zIndex": currentZIndex.value,
    "--modal-opacity": modalOpacity,
  };

  // 拖拽时动态调整相关变量
  if (isDragging.value) {
    // 采用更缓的下降速率（平方根方式，拖拽距离越大，透明度下降越慢）
    const ratio = Math.min(1, Math.abs(dragOffset.value) / closeThreshold);
    style["--modal-opacity"] = Math.max(0, modalOpacity * (1 - Math.sqrt(ratio)));
  }
  return style;
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

// ==================== 背景联动处理 ====================
let lockTargetElement: HTMLElement | null = null;

function applyBodyLock() {
  if (!bodyLockConfig.value)
    return;

  const config = bodyLockConfig.value;
  const target = typeof config.target === "string"
    ? document.querySelector<HTMLElement>(config.target)
    : config.target;

  if (!target)
    return;

  lockTargetElement = target;

  // 添加类名
  if (config.className) {
    target.classList.add(config.className);
  }

  // 应用内联样式
  target.style.setProperty("--drawer-body-scale", String(config.scale));
  target.style.setProperty("--drawer-body-translate-y", `${config.translateY}rem`);
  target.style.setProperty("--drawer-body-border-radius", `${config.borderRadius}rem`);
  target.style.setProperty("--drawer-body-duration", `${duration}ms`);

  // 添加过渡效果
  target.style.transition = `transform ${duration}ms cubic-bezier(0.32, 0.72, 0, 1), border-radius ${duration}ms ease`;
  target.style.transform = `scale(var(--drawer-body-scale)) translateY(var(--drawer-body-translate-y))`;
  target.style.borderRadius = `var(--drawer-body-border-radius)`;
  target.style.overflow = "hidden";
}

function removeBodyLock() {
  if (!lockTargetElement || !bodyLockConfig.value)
    return;

  const config = bodyLockConfig.value;

  // 移除类名
  if (config.className) {
    lockTargetElement.classList.remove(config.className);
  }

  // 重置样式
  lockTargetElement.style.transform = "";
  lockTargetElement.style.borderRadius = "";

  // 延迟移除 overflow 和过渡,让动画完成
  setTimeout(() => {
    if (lockTargetElement) {
      lockTargetElement.style.overflow = "";
      lockTargetElement.style.transition = "";
      lockTargetElement.style.removeProperty("--drawer-body-scale");
      lockTargetElement.style.removeProperty("--drawer-body-translate-y");
      lockTargetElement.style.removeProperty("--drawer-body-border-radius");
      lockTargetElement.style.removeProperty("--drawer-body-duration");
    }
    lockTargetElement = null;
  }, duration);
}

// ==================== 监听器 ====================
watch(modelValue, (newVal) => {
  if (newVal) {
    shouldRender.value = true;
  }
});

// ==================== 拖拽处理 ====================
function handleDragStart(e: MouseEvent | TouchEvent) {
  if (!dragToClose)
    return;

  isDragging.value = true;
  const pos = "touches" in e ? e.touches[0] : e;

  if (!pos)
    return;

  if (isVertical.value) {
    dragStartPos.value = pos.clientY;
    lastMovePos.value = pos.clientY;
  }
  else {
    dragStartPos.value = pos.clientX;
    lastMovePos.value = pos.clientX;
  }

  lastMoveTime.value = Date.now();
  emit("dragStart");

  // 添加全局事件监听
  document.addEventListener("mousemove", handleDragMove, { passive: false });
  document.addEventListener("mouseup", handleDragEnd);
  document.addEventListener("touchmove", handleDragMove, { passive: false });
  document.addEventListener("touchend", handleDragEnd);
}

function handleDragMove(e: MouseEvent | TouchEvent) {
  if (!isDragging.value)
    return;

  e.preventDefault();

  const pos = "touches" in e ? e.touches[0] : e;
  if (!pos)
    return;
  const currentPos = isVertical.value ? pos.clientY : pos.clientX;
  const currentTime = Date.now();

  // 计算偏移
  let offset = currentPos - dragStartPos.value;

  // 限制拖拽方向(只能向关闭方向拖)
  switch (direction) {
    case "bottom":
      offset = Math.max(0, offset);
      break;
    case "top":
      offset = Math.min(0, offset);
      break;
    case "left":
      offset = Math.min(0, offset);
      break;
    case "right":
      offset = Math.max(0, offset);
      break;
  }

  // 添加阻尼效果
  const damping = 0.7;
  dragOffset.value = offset * damping;

  // 计算速度
  const timeDiff = currentTime - lastMoveTime.value;
  if (timeDiff > 0) {
    velocity.value = (currentPos - lastMovePos.value) / timeDiff;
  }

  lastMovePos.value = currentPos;
  lastMoveTime.value = currentTime;

  emit("dragMove", dragOffset.value);
}

function handleDragEnd() {
  if (!isDragging.value)
    return;

  isDragging.value = false;

  // 移除全局事件监听
  document.removeEventListener("mousemove", handleDragMove);
  document.removeEventListener("mouseup", handleDragEnd);
  document.removeEventListener("touchmove", handleDragMove);
  document.removeEventListener("touchend", handleDragEnd);

  // 判断是否关闭
  const shouldClose = Math.abs(dragOffset.value) > closeThreshold
    || Math.abs(velocity.value) > 0.5;

  if (shouldClose) {
    modelValue.value = false;
  }

  // 重置状态
  dragOffset.value = 0;
  velocity.value = 0;

  emit("dragEnd");
}

// ==================== 事件处理 ====================
function handleClose() {
  if (closeOnClickModal) {
    modelValue.value = false;
  }
}

function handleEscClose(e: KeyboardEvent) {
  if (closeOnPressEscape && modelValue.value && e.key === "Escape") {
    e.stopImmediatePropagation();
    e.preventDefault();
    modelValue.value = false;
  }
}

// ==================== 过渡钩子 ====================
function onBeforeEnter() {
  emit("open");
  isAnimating.value = true;
  applyBodyLock();
}

function onAfterEnter() {
  emit("opened");
  isAnimating.value = false;
}

function onBeforeLeave() {
  emit("close");
  isAnimating.value = true;
}

function onAfterLeave() {
  emit("closed");
  isAnimating.value = false;
  removeBodyLock();

  if (destroyOnClose) {
    shouldRender.value = false;
  }
}

// ==================== 生命周期 ====================
onMounted(() => {
  if (closeOnPressEscape) {
    window.addEventListener("keydown", handleEscClose);
  }
});

onBeforeUnmount(() => {
  if (closeOnPressEscape) {
    window.removeEventListener("keydown", handleEscClose);
  }
  // 清理拖拽事件监听
  document.removeEventListener("mousemove", handleDragMove);
  document.removeEventListener("mouseup", handleDragEnd);
  document.removeEventListener("touchmove", handleDragMove);
  document.removeEventListener("touchend", handleDragEnd);

  // 清理背景联动效果
  if (lockTargetElement) {
    removeBodyLock();
  }
});

// ==================== 暴露方法 ====================
defineExpose({
  close: () => {
    modelValue.value = false;
  },
  open: () => {
    modelValue.value = true;
  },
});
</script>

<template>
  <Teleport :to="teleportTo">
    <Transition
      name="drawer-fade"
      :duration="duration"
      @before-enter="onBeforeEnter"
      @after-enter="onAfterEnter"
      @before-leave="onBeforeLeave"
      @after-leave="onAfterLeave"
    >
      <div
        v-show="isOpen"
        class="drawer-container fixed inset-0"
      >
        <!-- 遮罩层 -->
        <div
          class="drawer-overlay fixed inset-0"
          :style="overlayStyle"
          @click="handleClose"
        />

        <!-- 抽屉内容 -->
        <div
          v-if="shouldRender"
          ref="drawerRef"
          class="drawer-content fixed flex flex-col bg-color-2"
          :class="[
            `drawer-${direction}`,
            customClass,
            { 'drawer-dragging': isDragging },
          ]"
          :style="drawerStyle"
        >
          <!-- 拖拽手柄 -->
          <div
            v-if="showHandle"
            ref="handleRef"
            class="drawer-handle flex cursor-grab items-center justify-center active:cursor-grabbing"
            :class="{
              'drawer-handle-horizontal': isHorizontal,
              'drawer-handle-vertical': isVertical,
              'order-last': direction === 'top',
              'absolute -right-2 h-full top-0': direction === 'left',
              'absolute -left-2 h-full top-0': direction === 'right',
            }"
            @mousedown="handleDragStart"
            @touchstart="handleDragStart"
          >
            <div
              class="drawer-handle-bar rounded-full bg-color transition-colors"
              :class="{
                'w-16 h-1': isVertical,
                'w-1 h-16': isHorizontal,
              }"
            />
          </div>

          <!-- 头部 -->
          <div
            v-if="title || $slots.header"
            class="drawer-header mx-3 border-default-3-b py-3 sm:mx-4 sm:py-4"
          >
            <slot name="header">
              <div class="text-lg text-color font-medium">
                {{ title }}
              </div>
            </slot>
          </div>

          <!-- 内容区 -->
          <el-scrollbar class="drawer-body flex-1 p-3 sm:p-4">
            <slot />
          </el-scrollbar>

          <!-- 底部 -->
          <div
            v-if="$slots.footer"
            class="drawer-footer border-default-t p-3 sm:p-4"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.drawer-container {
  pointer-events: auto;
}

.drawer-content {
  --at-apply: "shadow-xl";
  transition: transform var(--drawer-duration) cubic-bezier(0.32, 0.72, 0, 1);

  &.drawer-dragging {
    transition: none;
  }
}

// 全局样式 - 背景联动效果
:global(.drawer-body-locked) {
  transform-origin: center center;
}

// 方向样式
.drawer-bottom {
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 80vh;
  border-top-left-radius: 1rem;
  border-top-right-radius: 1rem;
  --at-apply: "border-default-3-t !border-op-90";
}

.drawer-top {
  top: 0;
  left: 0;
  right: 0;
  max-height: 80vh;
  border-bottom-left-radius: 1rem;
  border-bottom-right-radius: 1rem;
  --at-apply: "border-default-3-b !border-op-90";
}

.drawer-left {
  top: 0;
  left: 0;
  bottom: 0;
  width: 75%;
  max-width: 24rem;
  border-top-right-radius: 1rem;
  border-bottom-right-radius: 1rem;
  --at-apply: "border-default-3-r !border-op-90";
}

.drawer-right {
  top: 0;
  right: 0;
  bottom: 0;
  width: 75%;
  max-width: 24rem;
  border-top-left-radius: 1rem;
  border-bottom-left-radius: 1rem;
  --at-apply: "border-default-3-l !border-op-90";
}

// 手柄样式
.drawer-handle {
  flex-shrink: 0;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  --at-apply: "transition-all";

  &.drawer-handle-vertical {
    padding: 1rem 0;
  }

  &.drawer-handle-horizontal {
    padding: 0 1rem;
    writing-mode: vertical-lr;
  }

  &:active .drawer-handle-bar {
    --at-apply: "op-70";
  }
}

// 遮罩层样式
.drawer-overlay {
  transition: backdrop-filter var(--drawer-duration) ease-in-out;
  background: rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(calc(var(--modal-opacity) * 12px));
}

// 动画
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  .drawer-overlay {
    transition: backdrop-filter var(--drawer-duration) ease-in-out;
  }
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  .drawer-overlay {
    backdrop-filter: blur(0px) !important;
  }

  .drawer-bottom {
    transform: translateY(100%);
  }

  .drawer-top {
    transform: translateY(-100%);
  }

  .drawer-left {
    transform: translateX(-100%);
  }

  .drawer-right {
    transform: translateX(100%);
  }
}
</style>
