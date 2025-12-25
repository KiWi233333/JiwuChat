import type { LinkOptions } from "@tiptap/extension-link";
import type { MentionOptions } from "@tiptap/extension-mention";
import type { PlaceholderOptions } from "@tiptap/extension-placeholder";
import type { TableOptions } from "@tiptap/extension-table";
import type { TaskItemOptions } from "@tiptap/extension-task-item";
import type { TaskListOptions } from "@tiptap/extension-task-list";
import type { StarterKitOptions } from "@tiptap/starter-kit";
import type { Content, EditorOptions, Editor as TiptapEditor, Range as TiptapRange } from "@tiptap/vue-3";

export type { Content, TiptapEditor, TiptapRange };

export type EditorContentType = "json" | "html" | "text" | "markdown";

export interface SuggestionState<T = any> {
  isOpen: boolean
  query: string
  items: T[]
  selectedIndex: number
  position: { x: number; y: number }
  command: ((item: T) => void) | null
  range: TiptapRange | null
}

export interface MentionSuggestionConfig<T = any> {
  char: string
  items: T[]
  getLabel?: (item: T) => string
  onSelect?: (editor: TiptapEditor, item: T, range: TiptapRange) => void
  filterFn?: (item: T, query: string) => boolean
  maxItems?: number
}

export interface SuggestionConfig<T = any> {
  char: string
  items: T[]
  getLabel?: (item: T) => string
  onSelect?: (editor: TiptapEditor, item: T, range: TiptapRange) => void
  filterFn?: (item: T, query: string) => boolean
  maxItems?: number
}

export interface EditorProps {
  modelValue?: Content
  contentType?: EditorContentType
  placeholder?: string | Partial<PlaceholderOptions>
  starterKit?: Partial<StarterKitOptions>
  image?: boolean
  link?: Partial<LinkOptions>
  table?: Partial<TableOptions>
  taskList?: Partial<TaskListOptions>
  taskItem?: Partial<TaskItemOptions>
  mention?: Partial<MentionOptions>
  mentionSuggestions?: MentionSuggestionConfig[]
  suggestions?: SuggestionConfig[]
  editable?: boolean
  autofocus?: boolean | "start" | "end" | "all" | number
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

export interface ToolbarItem {
  icon?: string
  label?: string
  title?: string
  action?: (editor: TiptapEditor) => void
  isActive?: (editor: TiptapEditor) => boolean
  disabled?: boolean
  type?: "button" | "divider"
}

export interface CommandItem {
  icon?: string
  iconClass?: string
  label: string
  description?: string
  group?: string
  action: (editor: TiptapEditor) => void
}

export interface EmojiItem {
  id: string
  name: string
  emoji: string
  keywords: string[]
}

export interface RichEditorProps {
  modelValue?: string
  contentType?: EditorContentType
  placeholder?: string
  enableToolbar?: boolean
  enableSlashCommand?: boolean
  enableEmojiSuggestion?: boolean
  enableDragHandle?: boolean
  toolbarLayout?: "fixed" | "bubble" | "floating"
  commandItems?: CommandItem[]
  emojiItems?: EmojiItem[]
  mentionSuggestions?: MentionSuggestionConfig[]
  editable?: boolean
  autofocus?: boolean | "start" | "end" | "all" | number
  class?: any
}
