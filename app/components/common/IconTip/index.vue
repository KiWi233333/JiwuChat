<script lang="ts">
export interface IconTipProps {
  /** 图标名称 (支持 iconify 格式如 'ri:information-line') */
  icon?: string;
  /** tooltip 内容 */
  tip?: string;
  /** tooltip 显示位置 */
  placement?:
    | "top"
    | "top-start"
    | "top-end"
    | "bottom"
    | "bottom-start"
    | "bottom-end"
    | "left"
    | "left-start"
    | "left-end"
    | "right"
    | "right-start"
    | "right-end";
  /** tooltip 主题 */
  effect?: "dark" | "light";
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否禁用 tooltip */
  disabledTooltip?: boolean;
  /** 是否圆形背景 */
  round?: boolean;
  /** 是否激活状态 */
  active?: boolean;
  /** 是否显示背景 */
  background?: boolean;
  /** 是否启用滚动内容 */
  enabledScrollContent?: boolean;
  /** 弹窗最大宽度 */
  popoverMaxWidth?: string;
  /** 弹窗最大高度 */
  popoverMaxHeight?: string;
  /** 显示延迟 (ms) */
  showAfter?: number;
  /** 隐藏延迟 (ms) */
  hideAfter?: number;
  /** 触发方式 */
  trigger?: "hover" | "click" | "focus" | "contextmenu";
}
</script>

<script lang="ts" setup>
const {
  tip = "",
  effect = "dark",
  placement = "top",
  showAfter,
  hideAfter = 0,
  trigger = "hover",
  background = true,
  disabled = false,
  disabledTooltip = false,
  round = false,
  active = false,
  enabledScrollContent = false,
  popoverMaxWidth,
  popoverMaxHeight,
  icon,
} = defineProps<IconTipProps>();

const emit = defineEmits<{
  (e: "click", event: MouseEvent): void;
}>();

const slots = useSlots();
const hasContentSlot = computed(() => !!slots.content);

const setting = useSettingStore();

const shouldDisableTooltip = computed(() => setting.isMobileSize || disabled || disabledTooltip);

/** 有 content 插槽时仅显示插槽内容，不传文案避免与 #content 冲突 */
const tooltipContent = computed(() => (hasContentSlot.value ? "" : tip));

function handleClick(event: MouseEvent) {
  if (!disabled) {
    emit("click", event);
  }
}
</script>

<template>
  <el-tooltip
    :content="tooltipContent"
    :effect="effect"
    :disabled="shouldDisableTooltip"
    :placement="placement"
    :show-after="showAfter"
    :hide-after="hideAfter"
    :trigger="trigger"
  >
    <template #content>
      <slot name="content">
        <el-scrollbar
          v-if="enabledScrollContent"
          :max-height="popoverMaxHeight"
          :style="{ maxWidth: popoverMaxWidth }"
        >
          {{ tip }}
        </el-scrollbar>
        <template v-else>
          {{ tip }}
        </template>
      </slot>
    </template>

    <span
      class="icon-tip"
      v-bind="$attrs"
      :class="[
        {
          'is-disabled': disabled,
          'is-active': active,
          'is-background': background,
          'is-round': round,
        },
      ]"
      @click="handleClick"
    >
      <slot name="default">
        <i v-if="icon" :class="icon" class="icon-tip-icon" />
      </slot>
    </span>
  </el-tooltip>
</template>

<style lang="scss" scoped>
.icon-tip {
  --at-apply: "relative cursor-pointer select-none transition-200";
  --at-apply: "inline-flex items-center justify-center";
  font-size: 1.2rem;
  line-height: 1;
  box-sizing: border-box;

  .icon-tip-icon {
    display: block;
    width: 1em;
    height: 1em;
  }

  &.is-disabled {
    --at-apply: "cursor-not-allowed opacity-50";

    &::after {
      content: "";
      --at-apply: "absolute left-0 top-0 w-full h-full cursor-not-allowed rounded-sm";
      background-color: rgba(255, 255, 255, 0.3);
    }
  }

  &.is-background {
    --at-apply: "p-1 rounded-sm";

    &:hover:not(.is-disabled) {
      --at-apply: "bg-color-inverse text-color";
    }
  }

  &.is-round {
    --at-apply: "rounded-full";
  }

  &.is-active {
    --at-apply: "bg-color-inverse";

    &:hover:not(.is-disabled) {
      --at-apply: "bg-color-second";
    }
  }
}
</style>
