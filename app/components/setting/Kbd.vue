<script lang="ts">
export interface KbdProps {
  /** 快捷键原始字符串，如 "Ctrl+C"、"+"、"←"、"r/R" */
  shortcut?: string;
  /** 描述文案（传入时渲染"描述 + 快捷键"行布局） */
  description?: string;
}
</script>

<script setup lang="ts">
const { shortcut = "", description = "" } = defineProps<KbdProps>();
/** 特殊键名映射（与设置页 Shortcuts 展示一致） */
const SPECIAL_KEYS = Object.freeze({
  ctrl: "Ctrl",
  alt: "Alt",
  shift: "Shift",
  meta: "Meta",
  cmd: "Cmd",
  enter: "Enter",
  escape: "Escape",
  space: "Space",
  tab: "Tab",
  backspace: "Backspace",
  delete: "Delete",
  arrowup: "ArrowUp",
  arrowdown: "ArrowDown",
  arrowleft: "ArrowLeft",
  arrowright: "ArrowRight",
});

/**
 * 格式化快捷键显示（与 SettingShortcuts 组件一致）
 * @param key 如 "Ctrl+C"、"ArrowLeft"、"r"
 */
function formatShortcutKey(key: string): string {
  if (!key)
    return "";

  if (key.includes("/")) {
    return key.replace(/\//g, " / ").replace(/\+/g, " + ");
  }

  return key.split("+").map((part) => {
    const trimmed = part.trim();
    const lowerKey = trimmed.toLowerCase();
    return SPECIAL_KEYS[lowerKey as keyof typeof SPECIAL_KEYS]
      || trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  }).join(" + ");
}

const formatted = computed(() => formatShortcutKey(shortcut));
const isAlt = computed(() => formatted.value.includes(" / "));

const keyParts = computed((): string[] => {
  if (!formatted.value)
    return [];
  if (shortcut.trim()?.length <= 1) {
    return [formatted.value];
  }
  if (isAlt.value)
    return formatted.value.split(" / ");
  return formatted.value.split(" + ");
});
</script>

<template>
  <!-- 带描述的行布局 -->
  <div v-if="description" class="kbd-row">
    <span class="kbd-row-desc">{{ description }}</span>
    <span class="kbd-keys">
      <template v-for="(part, i) in keyParts" :key="part">
        <kbd class="kbd-item">{{ part }}</kbd>
        <span v-if="i < keyParts.length - 1" class="kbd-sep">{{ isAlt ? "/" : "+" }}</span>
      </template>
    </span>
  </div>
  <!-- 仅快捷键内联显示 -->
  <span v-else-if="keyParts.length" class="kbd-keys">
    <template v-for="(part, i) in keyParts" :key="part">
      <kbd class="kbd-item">{{ part }}</kbd>
      <span v-if="i < keyParts.length - 1" class="kbd-sep">{{ isAlt ? "/" : "+" }}</span>
    </template>
  </span>
</template>

<style lang="scss" scoped>
.kbd-row {
  --at-apply: "flex flex-row-bt-c gap-2 text-sm";
}

.kbd-row-desc {
  --at-apply: "text-color flex-1 min-w-0 truncate";
}

.kbd-keys {
  --at-apply: "inline-flex flex-shrink-0 items-center gap-0.5";
}

.kbd-item {
  --at-apply: "inline-flex items-center justify-center rounded-1 border-default bg-color-2 font-mono text-mini leading-snug";
  padding: 0.15em 0.45em;
  box-shadow: 0 1px 0 1px color-mix(in srgb, currentColor 8%, transparent);
}

.kbd-sep {
  --at-apply: "text-mini text-color opacity-50 mx-0.3 select-none";
}
</style>
