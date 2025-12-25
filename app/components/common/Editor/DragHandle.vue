<script lang="ts">
import type { MiddlewareState, Placement, Strategy } from "@floating-ui/dom";
import type { DragHandleProps } from "@tiptap/extension-drag-handle-vue-3";
import type { Node } from "@tiptap/pm/model";
import type { Editor, JSONContent } from "@tiptap/vue-3";
</script>

<script setup lang="ts">
import type { Ref } from "vue";
import { flip, offset, shift } from "@floating-ui/dom";
import DragHandle from "@tiptap/extension-drag-handle-vue-3";
import { computed, inject, shallowRef } from "vue";

/**
 * Floating UI 配置选项接口
 * 用于自定义拖拽手柄的定位行为
 */
export interface FloatingUIOptions {
  strategy?: Strategy
  placement?: Placement
  offset?: number | ((state: MiddlewareState) => { mainAxis: number; alignmentAxis: number })
  flip?: boolean | Record<string, any>
  shift?: boolean | Record<string, any>
  size?: boolean | Record<string, any>
  autoPlacement?: boolean | Record<string, any>
  hide?: boolean | Record<string, any>
  inline?: boolean | Record<string, any>
}

/**
 * 组件 Props 接口定义
 */
export interface EditorDragHandleProps {
  icon?: string // 拖拽图标类名
  editor?: Editor // 编辑器实例
  showNodeType?: boolean // 是否显示节点类型图标
  showDragIcon?: boolean // 是否显示拖拽图标
  options?: FloatingUIOptions // Floating UI 配置
  pluginKey?: string // 插件 Key
  locked?: boolean // 是否锁定
  onElementDragStart?: DragHandleProps["onElementDragStart"] // 拖拽开始回调
  onElementDragEnd?: DragHandleProps["onElementDragEnd"] // 拖拽结束回调
}

export interface EditorDragHandleSlots {
  default?: (props: { nodeTypeIcon: string; onClick: () => void }) => any
}

export interface EditorDragHandleEmits {
  (e: "nodeChange", value: { node: JSONContent; pos: number }): void
}

defineOptions({ name: "CommonEditorDragHandle" });

const {
  icon = "i-tabler:grip-vertical",
  editor: propsEditor,
  pluginKey = "dragHandle",
  showNodeType = true,
  showDragIcon = true,
  options: floatingUIOptions,
  locked = false,
  onElementDragStart,
  onElementDragEnd,
} = defineProps<EditorDragHandleProps>();

const emit = defineEmits<EditorDragHandleEmits>();

defineSlots<EditorDragHandleSlots>();


// 获取编辑器实例，优先使用 props 传入的，否则尝试注入
const injectedEditor = inject<Ref<Editor | undefined>>("tiptapEditor");
const editor = computed(() => propsEditor || injectedEditor?.value);

// 使用 shallowRef 避免深层响应式触发不必要的重渲染
// 防止 DragHandle 的 tippy.js 实例被销毁 (Issue #6265)
const currentNodePos = shallowRef<number | null>(null);
const currentNode = shallowRef<{ type: string; level?: number }>({
  type: "",
  level: undefined,
});

/**
 * 处理节点变化事件
 * 更新当前选中节点的位置和类型信息
 */
function handleNodeChange(payload: { node: Node | null; pos: number; editor?: any }) {
  const { node, pos } = payload as { node: Node | null; pos: number; editor?: Editor };
  if (pos == null || pos < 0 || !node) {
    currentNodePos.value = null;
    currentNode.value = {
      type: "",
      level: undefined,
    };
    return;
  }

  currentNodePos.value = pos;
  currentNode.value = {
    type: node.type?.name || "",
    level: node.attrs?.level,
  };
}

/**
 * 点击手柄时的处理逻辑
 * 选中当前对应的节点并触发事件
 */
function onClick() {
  if (!editor.value)
    return;

  const pos = currentNodePos.value;
  if (pos == null)
    return;

  const node = editor.value.state.doc.nodeAt(pos);
  if (node) {
    const selectedNode = { node: node.toJSON(), pos };

    emit("nodeChange", selectedNode);
    // 设置编辑器选中该节点
    editor.value.chain().setNodeSelection(pos).run();

    return selectedNode;
  }
}

// 构建 Floating UI middleware
// 配置定位计算的中间件，包括偏移、翻转和位移
const middleware = computed(() => {
  const options = floatingUIOptions || {};
  const middlewareArray: any[] = [];

  // Offset middleware (偏移)
  const offsetValue = options.offset !== undefined
    ? options.offset
    : (state: MiddlewareState) => {
        const blockHeight = state.rects.reference.height;
        const handleHeight = state.rects.floating.height;

        // 根据块元素高度动态调整垂直对齐
        if (blockHeight > 40) {
          return {
            alignmentAxis: 0,
            mainAxis: 0,
          };
        }

        return {
          alignmentAxis: (blockHeight - handleHeight) / 2,
          mainAxis: 0,
        };
      };

  middlewareArray.push(offset(offsetValue));

  // Flip middleware (翻转 - 空间不足时自动翻转位置)
  if (options.flip !== false) {
    middlewareArray.push(flip(typeof options.flip === "object" ? options.flip : {}));
  }

  // Shift middleware (位移 - 保持在视口内)
  if (options.shift !== false) {
    middlewareArray.push(shift(typeof options.shift === "object" ? options.shift : {}));
  }

  return middlewareArray;
});

// Floating UI 最终配置
const computePositionConfig = computed<DragHandleProps["computePositionConfig"]>(() => ({
  strategy: floatingUIOptions?.strategy || "absolute",
  placement: floatingUIOptions?.placement || "left-start",
  middleware: middleware.value,
}));

// 根据节点类型获取对应的图标
// @unocss-include i-tabler:h-1 i-tabler:h-2 i-tabler:h-3 i-tabler:h-4 i-tabler:h-5 i-tabler:h-6
const nodeTypeIcon = computed(() => {
  if (!currentNode.value || !currentNode.value.type)
    return "";

  const { type, level } = currentNode.value;
  switch (type) {
    case "heading":
      return `i-tabler:h-${level || 1}`;
    case "paragraph":
      return "i-tabler:text-size";
    case "bulletList":
      return "i-tabler:list";
    case "orderedList":
      return "i-tabler:list-numbers";
    case "listItem":
      return "i-tabler:list-details";
    case "blockquote":
      return "i-tabler:quote";
    case "codeBlock":
      return "i-tabler:code";
    case "horizontalRule":
      return "i-tabler:separator-horizontal";
    case "image":
      return "i-tabler:photo";
    default:
      return "";
  }
});
</script>

<template>
  <DragHandle
    v-if="editor"
    :editor="editor"
    :plugin-key="pluginKey"
    :compute-position-config="computePositionConfig"
    :locked="locked"
    class="cursor-grab transition-all active:cursor-grabbing"
    :on-element-drag-start="onElementDragStart"
    :on-element-drag-end="onElementDragEnd"
    @click="onClick"
  >
    <slot :node-type-icon="nodeTypeIcon" :on-click="onClick">
      <div data-slot="handle" class="px-1.5">
        <div class="gap-0.5 border-default-3 rounded bg-color p-1 text-xs shadow-sm transition-200 hover:shadow-md">
          <i
            v-if="showNodeType"
            class="p-2 text-theme-primary"
            :class="nodeTypeIcon"
          />
          <i
            v-if="showDragIcon"
            data-slot="icon"
            class="p-2.2 text-color leading-none op-50 transition-colors active:op-100 hover:op-100"
            :class="icon"
          />
        </div>
      </div>
    </slot>
  </DragHandle>
</template>
