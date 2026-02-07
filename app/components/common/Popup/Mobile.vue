<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface PopupMobileProps {
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
</script>

<script setup lang="ts">
/**
 * 移动端 Popup 适配组件
 * 将 Popup API 映射到 Drawer 组件（固定底部方向）
 */

const {
  title,
  showClose = true,
  closeOnClickModal = true,
  teleportTo = "body",
  duration = 300,
  destroyOnClose = false,
  zIndex = 1999,
  escClose = true,
  contentClass = "",
} = defineProps<PopupMobileProps>();

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

// Drawer 引用
const drawerRef = useTemplateRef<{ close: () => void; open: () => void }>("drawerRef");

// ==================== 事件处理 ====================
function handleClose() {
  modelValue.value = false;
  emit("cancel");
}

function handleConfirm() {
  emit("confirm");
  modelValue.value = false;
}

// ==================== Drawer 事件转发 ====================
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
  handleClose,
  handleConfirm,
});
</script>

<template>
  <CommonDrawer
    ref="drawerRef"
    v-model="modelValue"
    direction="bottom"
    :show-handle="true"
    :drag-to-close="true"
    :close-threshold="100"
    :close-on-click-modal="closeOnClickModal"
    :close-on-press-escape="escClose"
    :title="title"
    :z-index="zIndex"
    :duration="duration"
    :destroy-on-close="destroyOnClose"
    :teleport-to="teleportTo"
    :custom-class="`w-full ${contentClass}`"
    :body-lock="true"
    @open="onOpen"
    @opened="onOpened"
    @close="onClose"
    @closed="onClosed"
  >
    <!-- 头部插槽转发 -->
    <template v-if="$slots.title || title || showClose && ($slots.title || title)" #header>
      <div class="relative w-full flex items-center justify-between">
        <slot name="title">
          <div class="text-lg text-color font-medium">
            {{ title }}
          </div>
        </slot>
        <span
          v-if="showClose"
          class="btn-danger cursor-pointer"
          @click="handleClose"
        >
          <i
            i-carbon:close p-2.8
            title="关闭"
          />
        </span>
      </div>
    </template>

    <!-- 内容插槽转发 -->
    <slot />

    <!-- 底部插槽转发 -->
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </CommonDrawer>
</template>
