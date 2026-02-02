<script lang="ts">
import type { HTMLAttributes } from "vue";
</script>

<script setup lang="ts">
/**
 * 智能弹窗组件
 * 根据 setting.isMobileSize 自动切换桌面端 Dialog 和移动端 Drawer 样式
 *
 * 设计原则：
 * 1. 对外保持统一的 API 接口
 * 2. 内部根据屏幕大小智能分发到不同的实现组件
 * 3. 支持通过 mode prop 强制指定显示模式
 */
import PopupDesktop from "./Desktop.vue";
import PopupMobile from "./Mobile.vue";

export interface PopupProps {
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
  /**
   * 强制使用指定的显示模式
   * - 'auto': 根据屏幕大小自动选择（默认）
   * - 'desktop': 强制使用桌面端 Dialog 样式
   * - 'mobile': 强制使用移动端 Drawer 样式
   */
  mode?: "auto" | "desktop" | "mobile"
}

defineOptions({
  inheritAttrs: false,
});

const props = defineProps<PopupProps>();

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

// ==================== 设备检测 ====================
const setting = useSettingStore();

// 计算实际使用的模式
const actualMode = computed(() => {
  if (props.mode === "desktop")
    return "desktop";
  if (props.mode === "mobile")
    return "mobile";
  // auto 模式：根据屏幕大小自动选择
  return setting.isMobileSize ? "mobile" : "desktop";
});

// 当前使用的组件
const currentComponent = computed(() => {
  return actualMode.value === "mobile" ? PopupMobile : PopupDesktop;
});

// 从 props 中排除 modelValue，避免与 v-model 冲突
const forwardProps = computed(() => {
  const { modelValue: _, ...rest } = props;
  return rest;
});

// ==================== 组件引用 ====================
const popupRef = useTemplateRef<{ handleClose: () => void; handleConfirm: () => void }>("popupRef");

// ==================== 事件转发 ====================
function onConfirm() {
  emit("confirm");
}

function onCancel() {
  emit("cancel");
}

function onOpen() {
  emit("open");
}

function onOpened() {
  emit("opened");
}

function onClose() {
  emit("close");
}

function onClosed() {
  emit("closed");
}

// ==================== 暴露方法 ====================
defineExpose({
  handleClose: () => popupRef.value?.handleClose(),
  handleConfirm: () => popupRef.value?.handleConfirm(),
});
</script>

<template>
  <component
    :is="currentComponent"
    ref="popupRef"
    v-model="modelValue"
    v-bind="{ ...$attrs, ...forwardProps }"
    @confirm="onConfirm"
    @cancel="onCancel"
    @open="onOpen"
    @opened="onOpened"
    @close="onClose"
    @closed="onClosed"
  >
    <!-- 转发 before 插槽（仅桌面端支持） -->
    <template v-if="$slots.before && actualMode === 'desktop'" #before>
      <slot name="before" />
    </template>

    <!-- 转发 mark-content 插槽（仅桌面端支持） -->
    <template v-if="$slots['mark-content'] && actualMode === 'desktop'" #mark-content>
      <slot name="mark-content" />
    </template>

    <!-- 转发 title 插槽 -->
    <template v-if="$slots.title" #title>
      <slot name="title" />
    </template>

    <!-- 移动端使用 header 插槽 -->
    <template v-if="$slots.title && actualMode === 'mobile'" #header>
      <slot name="title" />
    </template>

    <!-- 默认内容插槽 -->
    <slot />

    <!-- 转发 footer 插槽 -->
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </component>
</template>
