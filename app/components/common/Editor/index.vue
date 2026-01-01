
<script setup lang="ts">
import type { LinkOptions } from "@tiptap/extension-link";
import type { MentionOptions } from "@tiptap/extension-mention";
import type { PlaceholderOptions } from "@tiptap/extension-placeholder";
import type { TableOptions } from "@tiptap/extension-table";
import type { TaskItemOptions } from "@tiptap/extension-task-item";
import type { TaskListOptions } from "@tiptap/extension-task-list";
import type { StarterKitOptions } from "@tiptap/starter-kit";
import type { SuggestionProps } from "@tiptap/suggestion";
import type { Content, EditorOptions, Editor as TiptapEditor, Range as TiptapRange } from "@tiptap/vue-3";
import { Extension, mergeAttributes } from "@tiptap/core";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Link from "@tiptap/extension-link";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { Markdown } from "@tiptap/markdown";
import { PluginKey } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import Suggestion from "@tiptap/suggestion";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { defu } from "defu";
import ImageResize from "tiptap-extension-resize-image";

/** 编辑器内容输出类型 */
export type EditorContentType = "json" | "html" | "text" | "markdown";

/** 建议菜单状态（用于 @ 提及和自定义触发器） */
export interface SuggestionState<T = any> {
  isOpen: boolean
  query: string
  items: T[]
  selectedIndex: number
  position: { x: number; y: number }
  command: ((item: T) => void) | null
  range: TiptapRange | null
}

/** @ 提及建议配置 */
export interface MentionSuggestionConfig<T = any> {
  char: string
  items: T[]
  getLabel?: (item: T) => string
  onSelect?: (editor: TiptapEditor, item: T, range: TiptapRange) => void
  filterFn?: (item: T, query: string) => boolean
  maxItems?: number
}

/** 自定义触发器建议配置（如 / 命令） */
export interface SuggestionConfig<T = any> {
  char: string
  items: T[]
  getLabel?: (item: T) => string
  onSelect?: (editor: TiptapEditor, item: T, range: TiptapRange) => void
  filterFn?: (item: T, query: string) => boolean
  maxItems?: number
}

/**
 * Tiptap 富文本编辑器组件 Props
 * @description 支持 GFM Markdown、图片拖拽缩放、表格、任务列表等功能
 */
export interface EditorProps {
  modelValue?: Content
  /** 内容类型：json | html | text | markdown */
  contentType?: EditorContentType
  placeholder?: string | Partial<PlaceholderOptions>
  starterKit?: Partial<StarterKitOptions>
  /** 是否启用图片（支持拖拽缩放） */
  image?: boolean
  link?: Partial<LinkOptions>
  /** 表格配置（默认启用 resizable） */
  table?: Partial<TableOptions>
  taskList?: Partial<TaskListOptions>
  /** 任务列表项配置（默认启用 nested） */
  taskItem?: Partial<TaskItemOptions>
  mention?: Partial<MentionOptions>
  /** @ 提及建议列表配置 */
  mentionSuggestions?: MentionSuggestionConfig[]
  /** 自定义触发器建议配置（如 / 命令菜单） */
  suggestions?: SuggestionConfig[]
  editable?: boolean
  autofocus?: boolean | "start" | "end" | "all" | number
  /** 额外的 Tiptap 扩展 */
  extensions?: EditorOptions["extensions"]
  class?: any
}

export interface EditorEmits {
  (e: "update:modelValue", value: Content): void
  (e: "focus", event: FocusEvent): void
  (e: "blur", event: FocusEvent): void
}

export interface EditorSlots {
  default: (props: { editor: TiptapEditor }) => any
}

defineOptions({ name: "CommonEditor" });

const {
  modelValue,
  contentType: propsContentType = "html",
  placeholder: propsPlaceholder,
  starterKit: propsStarterKit,
  image: propsImage,
  link: propsLink,
  table: propsTable,
  taskList: propsTaskList,
  taskItem: propsTaskItem,
  mention: propsMention,
  mentionSuggestions: propsMentionSuggestions,
  suggestions: propsSuggestions,
  editable = true,
  autofocus,
  extensions: propsExtensions,
  class: className,
} = defineProps<EditorProps>();

const emit = defineEmits<EditorEmits>();
defineSlots<EditorSlots>();

const contentType = computed(() => propsContentType || (typeof modelValue === "string" ? "html" : "json"));

function getEditorContent(ed: TiptapEditor, type: EditorContentType): Content {
  switch (type) {
    case "html":
      return ed.getHTML();
    case "json":
      return ed.getJSON();
    case "markdown":
      return ed.getMarkdown();
    default:
      return ed.getText();
  }
}

function serializeContent(content: Content, type: EditorContentType): string {
  if (type === "json" && typeof content === "object") {
    return JSON.stringify(content);
  }
  return String(content ?? "");
}

// contentType 为 text 时禁用所有富文本格式化功能
const starterKitOptions = computed(() => {
  const base: Partial<StarterKitOptions> = {
    horizontalRule: false,
    heading: { levels: [1, 2, 3, 4] },
    dropcursor: { color: "var(--el-color-primary)", width: 2 },
    link: false,
  };

  if (contentType.value === "text") {
    Object.assign(base, {
      bold: false,
      italic: false,
      strike: false,
      code: false,
      codeBlock: false,
      blockquote: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      heading: false,
      hardBreak: false,
    });
  }

  return defu(propsStarterKit, base) as Partial<StarterKitOptions>;
});

const placeholderOptions = computed(() => {
  if (typeof propsPlaceholder === "string") {
    return { placeholder: propsPlaceholder, showOnlyWhenEditable: true, showOnlyCurrent: true };
  }
  return defu(propsPlaceholder, { showOnlyWhenEditable: true, showOnlyCurrent: true }) as Partial<PlaceholderOptions>;
});

const imageEnabled = computed(() => propsImage ?? true);

const linkOptions = computed(() => defu(propsLink, {
  openOnClick: false,
  autolink: true,
  linkOnPaste: true,
}) as Partial<LinkOptions>);

const tableOptions = computed(() => defu(propsTable, {
  resizable: true,
}) as Partial<TableOptions>);

const taskListOptions = computed(() => defu(propsTaskList, {
  HTMLAttributes: {
    class: "task-list",
  },
}) as Partial<TaskListOptions>);

const taskItemOptions = computed(() => defu(propsTaskItem, {
  nested: true,
  HTMLAttributes: {
    class: "task-list-item",
  },
}) as Partial<TaskItemOptions>);

function createMentionSuggestionConfig<T>(config: MentionSuggestionConfig<T>) {
  const state = createSuggestionState<T>(config.char);
  const maxItems = config.maxItems ?? 50;
  const getLabel = config.getLabel ?? ((item: T) => String((item as any).label ?? (item as any).name ?? item));
  const filterFn = config.filterFn ?? ((item: T, query: string) => {
    const label = getLabel(item);
    return label.toLowerCase().includes(query.toLowerCase());
  });

  return {
    char: config.char,
    pluginKey: new PluginKey(`mention-${config.char}`),
    items: ({ query }: { query: string }) => {
      if (!config.items?.length)
        return [];
      if (!query)
        return config.items.slice(0, maxItems);
      return config.items.filter(item => filterFn(item, query)).slice(0, maxItems);
    },
    command: ({ editor: ed, range, props }: { editor: any; range: TiptapRange; props: T }) => {
      if (config.onSelect) {
        config.onSelect(ed as TiptapEditor, props, range);
      }
    },
    render: () => {
      return {
        onStart: (props: SuggestionProps<T>) => {
          state.query = props.query;
          state.items = props.items;
          state.selectedIndex = 0;
          state.range = props.range;
          state.command = (item: T) => props.command(item);
          updatePosition(props.clientRect, state);
          state.isOpen = true;
        },
        onUpdate: (props: SuggestionProps<T>) => {
          state.query = props.query;
          state.items = props.items;
          state.range = props.range;
          state.command = (item: T) => props.command(item);
          updatePosition(props.clientRect, state);
        },
        onKeyDown: (props: { event: KeyboardEvent }) => {
          if (props.event.key === "Escape") {
            state.isOpen = false;
            return true;
          }
          if (props.event.key === "ArrowUp") {
            state.selectedIndex = (state.selectedIndex + state.items.length - 1) % state.items.length;
            return true;
          }
          if (props.event.key === "ArrowDown") {
            state.selectedIndex = (state.selectedIndex + 1) % state.items.length;
            return true;
          }
          if (props.event.key === "Enter") {
            const item = state.items[state.selectedIndex];
            if (item && state.command) {
              state.command(item);
              state.isOpen = false;
            }
            return true;
          }
          return false;
        },
        onExit: () => {
          state.isOpen = false;
        },
      };
    },
  };
}

const mentionOptions = computed(() => {
  const base: Partial<MentionOptions> = {
    HTMLAttributes: { class: "editor-mention" },
  };

  if (propsMentionSuggestions && propsMentionSuggestions.length > 0) {
    base.suggestions = propsMentionSuggestions.map(config => createMentionSuggestionConfig(config));
  }

  return defu(propsMention, base) as Partial<MentionOptions>;
});

function updatePosition(clientRect: (() => DOMRect | null) | null | undefined, target: { position: { x: number; y: number } }) {
  if (!clientRect)
    return;
  const rect = clientRect();
  if (!rect)
    return;
  target.position = {
    x: rect.left - 5,
    y: rect.bottom + 8,
  };
}

const suggestionStates = reactive<Map<string, SuggestionState>>(new Map());

function createSuggestionState<T>(char: string): SuggestionState<T> {
  const state: SuggestionState<T> = reactive({
    isOpen: false,
    query: "",
    items: [],
    selectedIndex: 0,
    position: { x: 0, y: 0 },
    command: null,
    range: null,
  });
  suggestionStates.set(char, state);
  return state;
}

function getSuggestionState<T>(char: string): SuggestionState<T> | undefined {
  return suggestionStates.get(char) as SuggestionState<T> | undefined;
}

function createSuggestionExtension<T>(config: SuggestionConfig<T>): ReturnType<typeof Extension.create> {
  const state = createSuggestionState<T>(config.char);
  const maxItems = config.maxItems ?? 50;
  const getLabel = config.getLabel ?? ((item: T) => String((item as any).label ?? (item as any).name ?? item));
  const filterFn = config.filterFn ?? ((item: T, query: string) => {
    const label = getLabel(item);
    return label.toLowerCase().includes(query.toLowerCase());
  });

  return Extension.create({
    name: `suggestion-${config.char}`,
    addProseMirrorPlugins() {
      const editorRef = this.editor;
      return [
        Suggestion({
          editor: editorRef,
          char: config.char,
          pluginKey: new PluginKey(`suggestion-${config.char}`),
          items: ({ query }) => {
            if (!config.items?.length)
              return [];
            if (!query)
              return config.items.slice(0, maxItems);
            return config.items.filter(item => filterFn(item, query)).slice(0, maxItems);
          },
          command: ({ editor: ed, range, props }) => {
            if (config.onSelect) {
              config.onSelect(ed as TiptapEditor, props as T, range);
            }
          },
          render: () => {
            return {
              onStart: (props: SuggestionProps<T>) => {
                state.query = props.query;
                state.items = props.items;
                state.selectedIndex = 0;
                state.range = props.range;
                state.command = (item: T) => props.command(item);
                updatePosition(props.clientRect, state);
                state.isOpen = true;
              },
              onUpdate: (props: SuggestionProps<T>) => {
                state.query = props.query;
                state.items = props.items;
                state.range = props.range;
                state.command = (item: T) => props.command(item);
                updatePosition(props.clientRect, state);
              },
              onKeyDown: (props: { event: KeyboardEvent }) => {
                if (props.event.key === "Escape") {
                  state.isOpen = false;
                  return true;
                }
                if (props.event.key === "ArrowUp") {
                  state.selectedIndex = (state.selectedIndex + state.items.length - 1) % state.items.length;
                  return true;
                }
                if (props.event.key === "ArrowDown") {
                  state.selectedIndex = (state.selectedIndex + 1) % state.items.length;
                  return true;
                }
                if (props.event.key === "Enter") {
                  const item = state.items[state.selectedIndex];
                  if (item && state.command) {
                    state.command(item);
                    state.isOpen = false;
                  }
                  return true;
                }
                return false;
              },
              onExit: () => {
                state.isOpen = false;
              },
            };
          },
        }),
      ];
    },
  });
}

const suggestionExtensions = computed(() => {
  if (!propsSuggestions?.length)
    return [];
  return propsSuggestions.map(config => createSuggestionExtension(config));
});

const extensions = computed(() => {
  const exts = [
    StarterKit.configure(starterKitOptions.value),
    HorizontalRule.extend({
      renderHTML() {
        return ["div", mergeAttributes(this.options.HTMLAttributes, { "data-type": this.name }), ["hr"]];
      },
    }),
    imageEnabled.value ? ImageResize : null,
    Link.configure(linkOptions.value),
    Table.configure(tableOptions.value),
    TableRow,
    TableHeader,
    TableCell,
    TaskList.configure(taskListOptions.value),
    TaskItem.configure(taskItemOptions.value),
    propsPlaceholder ? Placeholder.configure(placeholderOptions.value) : null,
    Mention.configure(mentionOptions.value),
    Markdown.configure({
      markedOptions: {
        gfm: true, // GitHub Flavored Markdown
        pedantic: false, // 严格模式
        breaks: true, // \n 变为 <br>
      },
    }),
    ...suggestionExtensions.value,
    ...(propsExtensions || []),
  ];
  return exts.filter((ext): ext is NonNullable<typeof ext> => Boolean(ext));
});

const editor = useEditor({
  content: modelValue,
  extensions: extensions.value,
  editable,
  autofocus,
  onUpdate: ({ editor: editorInstance }) => {
    try {
      const value = getEditorContent(editorInstance as TiptapEditor, contentType.value);
      emit("update:modelValue", value);
    }
    catch {
      emit("update:modelValue", editorInstance.getText());
    }
  },
  onFocus: ({ event }) => emit("focus", event),
  onBlur: ({ event }) => emit("blur", event),
});

watch(() => modelValue, (newVal) => {
  if (!editor.value || newVal == null)
    return;

  const currentContent = serializeContent(getEditorContent(editor.value, contentType.value), contentType.value);
  const newContent = serializeContent(newVal, contentType.value);

  if (currentContent === newContent)
    return;

  const currentPos = editor.value.state.selection.from;
  editor.value.commands.setContent(newVal);

  if (currentPos <= editor.value.state.doc.content.size) {
    editor.value.commands.setTextSelection(currentPos);
  }
});

watch(() => editable, (val) => {
  editor.value?.setEditable(val);
});

// 向子组件提供 editor 实例和建议状态
provide("tiptapEditor", editor);
provide("suggestionStates", suggestionStates);

defineExpose({ editor, suggestionStates, getSuggestionState });
</script>

<template>
  <div class="relative w-full" :class="className">
    <template v-if="editor">
      <slot :editor="editor" />
      <EditorContent :editor="editor" class="editor-content" />
    </template>
  </div>
</template>

<style lang="scss" scoped>
.editor-content {
  :deep(.tiptap) {
    --at-apply: "outline-none";

    &:focus {
      --at-apply: "outline-none";
    }

    p.is-editor-empty:first-child::before {
      --at-apply: "text-mini float-left h-0 pointer-events-none";
      content: attr(data-placeholder);
    }

    .editor-mention {
      --at-apply: "text-color-primary bg-primary/10 rounded px-1 py-0.5";
    }

    .ProseMirror-selectednode::selection {
      color: initial;
    }

    [draggable="true"].ProseMirror-selectednode {
      // --at-apply: "bg-[--el-color-info-light-9]";
      background-color: inherit !important;
      border-color: inherit !important;
      color: inherit !important;

      ::selection {
        --at-apply: "text-color";
      }
    }
  }
}
</style>
