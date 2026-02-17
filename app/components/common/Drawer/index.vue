<script lang="ts">
</script>

<script setup lang="ts">
import type { DrawerProps } from "./useDrawer";
import { ref } from "vue";
import { useDrawer } from "./useDrawer";

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(defineProps<DrawerProps>(), {
  direction: "bottom",
  showHandle: true,
  dragToClose: true,
  closeThreshold: 0,
  closeOnClickModal: true,
  closeOnPressEscape: true,
  size: "auto",
  customClass: "",
  modalOpacity: 0.5,
  duration: 500,
  destroyOnClose: false,
  teleportTo: "body",
  bodyLock: true,
  expandable: true,
  expandThreshold: 150,
});

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

const drawerRef = ref<HTMLElement | null>(null);
const handleRef = ref<HTMLElement | null>(null);

const {
  isOpen,
  shouldRender,
  isDragging,
  drawerStyle,
  overlayStyle,
  handleDragStart,
  handleToggleExpand,
  handleClose,
  onBeforeEnter,
  onAfterEnter,
  onBeforeLeave,
  onAfterLeave,
  direction,
  showHandle,
  title,
  teleportTo,
  customClass,
  duration,
  isHorizontal,
  isVertical,
} = useDrawer(props, emit, modelValue, drawerRef, handleRef);

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
          class="drawer-content"
          :class="[
            `drawer-${direction}`,
            customClass,
            { 'drawer-dragging': isDragging },
          ]"
          :style="drawerStyle"
          @click.stop
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
            @dblclick="handleToggleExpand"
          >
            <div
              class="drawer-handle-bar rounded-full bg-color-inverse transition-colors"
              :class="{
                'w-16 h-1': isVertical,
                'w-1 h-16': isHorizontal,
              }"
            />
          </div>

          <!-- 头部 -->
          <div
            v-if="title || $slots.header"
            class="drawer-header"
          >
            <slot name="header">
              <div class="text-lg text-color font-medium">
                {{ title }}
              </div>
            </slot>
          </div>

          <!-- 内容区 -->
          <el-scrollbar class="drawer-body flex-1">
            <slot />
          </el-scrollbar>

          <!-- 底部 -->
          <div
            v-if="$slots.footer"
            class="drawer-footer"
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
  --at-apply: "shadow-xl fixed flex flex-col bg-color-2 pt-0";
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
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-top-left-radius: 1rem;
  border-top-right-radius: 1rem;
  --at-apply: "border-default-3-t";
}

.drawer-top {
  top: 0;
  left: 0;
  right: 0;
  max-height: 80vh;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  border-bottom-left-radius: 1rem;
  border-bottom-right-radius: 1rem;
  --at-apply: "border-default-3-b";
}

.drawer-left {
  top: 0;
  left: 0;
  bottom: 0;
  width: 75%;
  max-width: 24rem;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  border-top-right-radius: 1rem;
  border-bottom-right-radius: 1rem;
  --at-apply: "border-default-3-r";
}

.drawer-right {
  top: 0;
  right: 0;
  bottom: 0;
  width: 75%;
  max-width: 24rem;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-top-left-radius: 1rem;
  border-bottom-left-radius: 1rem;
  --at-apply: "border-default-3-l";
}

// 手柄样式
.drawer-handle {
  flex-shrink: 0;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  --at-apply: "transition-all";

  &.drawer-handle-vertical {
    padding: 0.75rem 0;
  }

  &.drawer-handle-horizontal {
    padding: 0 0.5rem;
    writing-mode: vertical-lr;
  }

  &:active .drawer-handle-bar {
    --at-apply: "op-70";
  }
}

// 遮罩层样式
.drawer-overlay {
  transition: backdrop-filter var(--drawer-duration) ease-in-out;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(calc(var(--modal-opacity) * 4px));
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
