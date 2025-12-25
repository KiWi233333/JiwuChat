<script setup lang="ts">
import type { CommandItem, EmojiItem, MentionSuggestionConfig, RichEditorProps, SuggestionConfig, TiptapEditor, TiptapRange } from "./types";
import { defaultCommandItems, defaultToolbarItems, getAllEmojiItems } from "./utils";

defineOptions({ name: "CommonEditorRich" });

const {
  modelValue,
  contentType = "markdown",
  placeholder = "",
  enableToolbar = true,
  enableSlashCommand = true,
  enableEmojiSuggestion = true,
  enableDragHandle = true,
  toolbarLayout = "bubble",
  commandItems: propsCommandItems,
  emojiItems: propsEmojiItems,
  mentionSuggestions: propsMentionSuggestions,
  editable = true,
  autofocus,
  class: className,
} = defineProps<RichEditorProps>();

const emit = defineEmits<{
  "update:modelValue": [value: string]
  "focus": [event: FocusEvent]
  "blur": [event: FocusEvent]
}>();

const vModel = computed({
  get: () => modelValue,
  set: (val: string) => emit("update:modelValue", val),
});

const allEmojiItems = computed<EmojiItem[]>(() => {
  if (propsEmojiItems)
    return propsEmojiItems;
  return getAllEmojiItems();
});

const commandItemsList = computed(() => propsCommandItems ?? defaultCommandItems);

const mentionSuggestions = computed<MentionSuggestionConfig[]>(() => {
  if (!propsMentionSuggestions?.length)
    return [];
  return propsMentionSuggestions.map((config: MentionSuggestionConfig) => ({
    char: config.char ?? "@",
    items: config.items ?? [],
    getLabel: config.getLabel,
    onSelect: config.onSelect ?? ((editor: TiptapEditor, item: any, range: TiptapRange) => {
      editor.chain().focus().deleteRange(range).insertContent({
        type: "mention",
        attrs: { id: item.id, label: item.label },
      }).run();
    }),
    filterFn: config.filterFn,
    maxItems: config.maxItems,
  }));
});

const suggestions = computed<SuggestionConfig[]>(() => {
  const result: SuggestionConfig[] = [];

  if (enableSlashCommand) {
    result.push({
      char: "/",
      items: commandItemsList.value,
      getLabel: (item: CommandItem) => item.label,
      onSelect: (editor: TiptapEditor, item: CommandItem, range: TiptapRange) => {
        editor.chain().focus().deleteRange(range).run();
        item.action(editor);
      },
    });
  }

  if (enableEmojiSuggestion) {
    result.push({
      char: ":",
      items: allEmojiItems.value,
      getLabel: (item: EmojiItem) => item.name,
      filterFn: (item: EmojiItem, query: string) => {
        const q = query.toLowerCase();
        if (item.name.toLowerCase().includes(q))
          return true;
        if (item.id.toLowerCase().includes(q))
          return true;
        if (item.keywords?.some(k => k.toLowerCase().includes(q)))
          return true;
        return false;
      },
      onSelect: (editor: TiptapEditor, item: EmojiItem, range: TiptapRange) => {
        editor.chain().focus().deleteRange(range).insertContent(item.emoji).run();
      },
      maxItems: 30,
    });
  }

  return result;
});
</script>

<template>
  <CommonEditor
    v-slot="{ editor }"
    v-model="vModel"
    :content-type="contentType"
    :placeholder="placeholder"
    :mention-suggestions="mentionSuggestions"
    :suggestions="suggestions"
    :editable="editable"
    :autofocus="autofocus"
    :class="[className, `github-markdown-${$colorMode.value}`]"
    @focus="emit('focus', $event)"
    @blur="emit('blur', $event)"
  >
    <CommonEditorToolbar
      v-if="enableToolbar && toolbarLayout === 'fixed'"
      :editor="editor"
      :items="defaultToolbarItems"
      layout="fixed"
      class="mb-2"
    />

    <CommonEditorToolbar
      v-if="enableToolbar && toolbarLayout === 'bubble'"
      :editor="editor"
      :items="defaultToolbarItems"
      layout="bubble"
    />

    <CommonEditorToolbar
      v-if="enableToolbar && toolbarLayout === 'floating'"
      :editor="editor"
      :items="defaultToolbarItems"
      layout="floating"
    />

    <CommonEditorDragHandle v-if="enableDragHandle" :editor="editor" />

    <CommonEditorSuggestionMenu v-if="enableSlashCommand" char="/" />
    <CommonEditorSuggestionMenu v-if="enableEmojiSuggestion" char=":" />

    <slot :editor="editor" />
  </CommonEditor>
</template>


<style lang="scss">
@use "@/assets/styles/markdown/markdown-theme.scss" as *;

// 应用 markdown-body 样式到编辑器内容
.editor-content .tiptap {
  @extend .markdown-body;
}
</style>
