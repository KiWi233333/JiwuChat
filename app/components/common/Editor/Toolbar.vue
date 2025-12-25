<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";
import type { Measurable } from "element-plus";
import type { Ref } from "vue";
import { BubbleMenu, FloatingMenu } from "@tiptap/vue-3/menus";
import { computed, inject, ref, watch } from "vue";

export interface ToolbarItem {
  icon?: string
  label?: string
  title?: string
  action?: (editor: Editor) => void
  isActive?: (editor: Editor) => boolean
  disabled?: boolean
  type?: "button" | "divider"
}

export interface EditorToolbarProps {
  layout?: "fixed" | "bubble" | "floating"
  items?: ToolbarItem[] | ToolbarItem[][]
  editor?: Editor
  size?: "small" | "default" | "large"
  tippyOptions?: Record<string, any>
  shouldShow?: (props: { editor: Editor, view: any, state: any, from: number, to: number }) => boolean
}

defineOptions({ name: "CommonEditorToolbar" });

const {
  layout = "fixed",
  editor: propsEditor,
  items,
  size = "small",
  tippyOptions,
  shouldShow,
} = defineProps<EditorToolbarProps>();

const injectedEditor = inject<Ref<Editor | undefined>>("tiptapEditor");
const editor = computed(() => propsEditor || injectedEditor?.value);

const virtualRef = ref<Measurable | undefined>();
const tooltipContent = ref("");
const tooltipVisible = ref(false);
const tooltipVisibleDelayed = ref(false);
let delayTimer: ReturnType<typeof setTimeout> | null = null;
const tooltipAnimationDuration = 200;

watch(tooltipVisible, (val) => {
  if (delayTimer) {
    clearTimeout(delayTimer);
    delayTimer = null;
  }
  if (val) {
    delayTimer = setTimeout(() => {
      tooltipVisibleDelayed.value = true;
    }, tooltipAnimationDuration);
  }
  else {
    tooltipVisibleDelayed.value = false;
  }
});

const groups = computed<ToolbarItem[][]>(() => {
  if (!items?.length)
    return [];
  if (Array.isArray(items[0]) && Array.isArray(items[0]))
    return items as ToolbarItem[][];
  return [items as ToolbarItem[]];
});

function isActive(item: ToolbarItem): boolean {
  if (!editor.value?.isEditable)
    return false;
  return item.isActive?.(editor.value) || false;
}

function isDisabled(item: ToolbarItem): boolean {
  if (!editor.value?.isEditable)
    return true;
  return item.disabled ?? false;
}

function onClick(item: ToolbarItem) {
  if (!editor.value?.isEditable || isDisabled(item))
    return;
  item.action?.(editor.value);
}

function onMouseEnter(e: MouseEvent, item: ToolbarItem) {
  const content = item.title || item.label;
  if (!content)
    return;
  virtualRef.value = e.currentTarget as HTMLElement;
  tooltipContent.value = content;
  tooltipVisible.value = true;
}

function onMouseLeave() {
  tooltipVisible.value = false;
}

const Component = computed(() => {
  switch (layout) {
    case "bubble":
      return BubbleMenu;
    case "floating":
      return FloatingMenu;
    default:
      return "div";
  }
});

const menuProps = computed(() => {
  if (layout === "fixed" || !editor.value)
    return {};
  return {
    editor: editor.value,
    tippyOptions,
    shouldShow,
  };
});

const layoutClass = computed(() => {
  const classes = ["inline-flex"];
  if (layout === "bubble" || layout === "floating") {
    classes.push("card-bg-color", "rounded-lg", "shadow-lg", "border-default", "p-1");
  }
  return classes;
});
</script>

<template>
  <component
    :is="Component"
    v-bind="menuProps"
    class="[&_.el-button]:(ml-0 px-2)" :class="[layoutClass]"
  >
    <el-tooltip
      v-model:visible="tooltipVisible"
      :content="tooltipContent"
      :virtual-ref="virtualRef"
      virtual-triggering
      trigger="click"
      :show-after="300"
      :popper-options="{
        modifiers: [
          {
            name: 'computeStyles',
            options: {
              adaptive: false,
              enabled: false,
              gpuAcceleration: true,
            },
          },
        ],
      }"
      :popper-class="['editor-toolbar-tooltip', tooltipVisibleDelayed ? 'support-animation' : tooltipVisible ? 'disable-animation' : '']"
      placement="top"
    />
    <div
      class="flex items-center gap-1"
      role="toolbar"
      @mouseleave="onMouseLeave"
    >
      <template v-for="(group, groupIndex) in groups" :key="`group-${groupIndex}`">
        <div class="flex items-center gap-1">
          <template v-for="(item, index) in group" :key="`item-${groupIndex}-${index}`">
            <el-divider v-if="item.type === 'divider'" direction="vertical" />
            <el-button
              v-else
              :size="size"
              :disabled="isDisabled(item)"
              :type="isActive(item) ? 'primary' : 'default'"
              :class="{ 'is-active': isActive(item) }"
              text
              @click="onClick(item)"
              @mouseenter="onMouseEnter($event, item)"
            >
              <span v-if="item.icon" :class="item.icon" class="p-2" />
              <span v-else-if="item.label">{{ item.label }}</span>
            </el-button>
          </template>
        </div>
        <el-divider
          v-if="groupIndex < groups.length - 1"
          direction="vertical"
          class="mx-1 h-5"
        />
      </template>
    </div>
  </component>
</template>

<style lang="scss">
.editor-toolbar-tooltip {
  &.disable-animation {
    animation: none !important;
    transition: none !important;
  }

  &.support-animation {
    // 支持动画关闭原本的动画
    transition: transform 0.2s var(--el-transition-function-fast-bezier) !important;
  }
}
</style>
