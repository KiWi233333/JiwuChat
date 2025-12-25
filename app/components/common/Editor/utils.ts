import type { CommandItem, EmojiItem, TiptapEditor, ToolbarItem } from "./types";
import emojiData from "@/assets/emoji.json";
import { buildEmojiGroups } from "@/composables/utils/emoji";
// @unocss-include
export const defaultCommandItems: CommandItem[] = [
  { icon: "i-ri:text", iconClass: "text-theme-primary", label: "文本", description: "普通段落", group: "基础", action: (e: TiptapEditor) => e.chain().focus().setParagraph().run() },
  { icon: "i-ri:h-1", iconClass: "text-theme-primary", label: "一级标题", description: "大标题", group: "基础", action: (e: TiptapEditor) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { icon: "i-ri:h-2", iconClass: "text-theme-primary", label: "二级标题", description: "中标题", group: "基础", action: (e: TiptapEditor) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { icon: "i-ri:h-3", iconClass: "text-theme-primary", label: "三级标题", description: "小标题", group: "基础", action: (e: TiptapEditor) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { icon: "i-ri:h-4", iconClass: "text-theme-primary", label: "四级标题", description: "次标题", group: "基础", action: (e: TiptapEditor) => e.chain().focus().toggleHeading({ level: 4 }).run() },
  { icon: "i-ri:list-ordered-2", iconClass: "text-theme-primary", label: "有序列表", description: "数字编号列表", group: "基础", action: (e: TiptapEditor) => e.chain().focus().toggleOrderedList().run() },
  { icon: "i-ri:list-unordered", iconClass: "text-theme-primary", label: "无序列表", description: "项目符号列表", group: "基础", action: (e: TiptapEditor) => e.chain().focus().toggleBulletList().run() },
  { icon: "i-ri:code-box-line", iconClass: "text-theme-primary", label: "代码块", description: "代码片段", group: "基础", action: (e: TiptapEditor) => e.chain().focus().toggleCodeBlock().run() },
  { icon: "i-ri:double-quotes-l", iconClass: "text-theme-warning", label: "引用", description: "引用块", group: "基础", action: (e: TiptapEditor) => e.chain().focus().toggleBlockquote().run() },
  { icon: "i-ri:separator", iconClass: "text-theme-info", label: "分隔线", description: "水平分割线", group: "基础", action: (e: TiptapEditor) => e.chain().focus().setHorizontalRule().run() },
  { icon: "i-ri:link", iconClass: "text-theme-primary", label: "链接", description: "插入链接", group: "基础", action: (e: TiptapEditor) => e.chain().focus().run() },
  { icon: "i-ri:checkbox-line", iconClass: "text-theme-success", label: "任务", description: "任务列表", group: "常用", action: (e: TiptapEditor) => e.chain().focus().toggleTaskList().run() },
  { icon: "i-ri:table-line", iconClass: "text-theme-primary", label: "表格", description: "插入表格", group: "常用", action: (e: TiptapEditor) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
];

export const defaultToolbarItems: ToolbarItem[][] = [
  [
    { icon: "i-ri:bold", title: "加粗", action: (e: TiptapEditor) => e.chain().focus().toggleBold().run(), isActive: (e: TiptapEditor) => e.isActive("bold") },
    { icon: "i-ri:italic", title: "斜体", action: (e: TiptapEditor) => e.chain().focus().toggleItalic().run(), isActive: (e: TiptapEditor) => e.isActive("italic") },
    { icon: "i-ri:strikethrough", title: "删除线", action: (e: TiptapEditor) => e.chain().focus().toggleStrike().run(), isActive: (e: TiptapEditor) => e.isActive("strike") },
    { icon: "i-ri:code-line", title: "代码", action: (e: TiptapEditor) => e.chain().focus().toggleCode().run(), isActive: (e: TiptapEditor) => e.isActive("code") },
  ],
  [
    { icon: "i-ri:list-unordered", title: "无序列表", action: (e: TiptapEditor) => e.chain().focus().toggleBulletList().run(), isActive: (e: TiptapEditor) => e.isActive("bulletList") },
    { icon: "i-ri:list-ordered", title: "有序列表", action: (e: TiptapEditor) => e.chain().focus().toggleOrderedList().run(), isActive: (e: TiptapEditor) => e.isActive("orderedList") },
    { icon: "i-ri:checkbox-line", title: "任务列表", action: (e: TiptapEditor) => e.chain().focus().toggleTaskList().run(), isActive: (e: TiptapEditor) => e.isActive("taskList") },
    { icon: "i-ri:double-quotes-l", title: "引用", action: (e: TiptapEditor) => e.chain().focus().toggleBlockquote().run(), isActive: (e: TiptapEditor) => e.isActive("blockquote") },
  ],
  [
    { icon: "i-ri:table-line", title: "表格", action: (e: TiptapEditor) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { icon: "i-ri:separator", title: "分割线", action: (e: TiptapEditor) => e.chain().focus().setHorizontalRule().run() },
  ],
  [
    { icon: "i-ri:arrow-go-back-line", title: "撤销", action: (e: TiptapEditor) => e.chain().focus().undo().run() },
    { icon: "i-ri:arrow-go-forward-line", title: "重做", action: (e: TiptapEditor) => e.chain().focus().redo().run() },
  ],
];

let cachedEmojiItems: EmojiItem[] | null = null;

export function getAllEmojiItems(): EmojiItem[] {
  if (cachedEmojiItems)
    return cachedEmojiItems;
  const groups = buildEmojiGroups(emojiData as any);
  cachedEmojiItems = groups.flatMap(g => g.emojis);
  return cachedEmojiItems;
}
