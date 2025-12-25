<script setup lang="ts">
import type { SuggestionState } from "./types";

export interface SuggestionMenuProps {
  char: string
}

defineOptions({ name: "CommonEditorSuggestionMenu" });

const { char } = defineProps<SuggestionMenuProps>();

const suggestionStates = inject<Map<string, SuggestionState>>("suggestionStates");

const state = computed(() => suggestionStates?.get(char));

const itemRefs = ref<HTMLElement[]>([]);

const groupedItems = computed(() => {
  if (!state.value?.items?.length)
    return [];
  const items = state.value.items;
  if (!items[0]?.group) {
    return [{ group: "", items }];
  }
  const groups = new Map<string, any[]>();
  for (const item of items) {
    const group = item.group || "";
    if (!groups.has(group)) {
      groups.set(group, []);
    }
    groups.get(group)!.push(item);
  }
  return Array.from(groups.entries()).map(([group, groupItems]) => ({ group, items: groupItems }));
});

const flatItems = computed(() => {
  return groupedItems.value.flatMap(g => g.items);
});

function selectItem(item: any) {
  if (!state.value?.command)
    return;
  state.value.command(item);
  state.value.isOpen = false;
}

function getItemLabel(item: any): string {
  return item.label ?? item.name ?? String(item);
}

function getItemKey(item: any, index: number): string {
  return item.id ?? item.name ?? `item-${index}`;
}

function getGlobalIndex(groupIndex: number, itemIndex: number): number {
  let index = 0;
  for (let i = 0; i < groupIndex; i++) {
    index += groupedItems.value[i]?.items.length ?? 0;
  }
  return index + itemIndex;
}

watch(() => state.value?.selectedIndex, (newIndex) => {
  if (newIndex !== undefined && itemRefs.value[newIndex]) {
    itemRefs.value[newIndex].scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }
});

onBeforeUpdate(() => {
  itemRefs.value = [];
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="state?.isOpen && flatItems.length"
      class="suggestion-menu fixed z-50 max-w-64 min-w-48 overflow-hidden border-default rounded-lg card-bg-color p-1.5 shadow-lg"
      :style="{ left: `${state.position.x}px`, top: `${state.position.y}px` }"
    >
      <el-scrollbar max-height="20rem" class="scrollbar-hidden">
        <template v-for="(group, groupIndex) in groupedItems" :key="group.group || groupIndex">
          <div v-if="group.group" class="px-2 pb-1 pt-2 text-xs text-small-color font-medium">
            {{ group.group }}
          </div>
          <div
            v-for="(item, itemIndex) in group.items"
            :key="getItemKey(item, itemIndex)"
            :ref="el => { if (el) itemRefs[getGlobalIndex(groupIndex, itemIndex)] = el as HTMLElement }"
            class="suggestion-item flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-color-2"
            :class="{ 'bg-color-2': getGlobalIndex(groupIndex, itemIndex) === state.selectedIndex }"
            @click="selectItem(item)"
            @mouseenter="state.selectedIndex = getGlobalIndex(groupIndex, itemIndex)"
          >
            <el-avatar
              v-if="item.avatar"
              :src="item.avatar"
              :size="20"
              class="flex-shrink-0"
            />
            <span
              v-else-if="item.icon"
              class="flex-shrink-0 text-base"
              :class="[item.icon, item.iconClass || 'text-color']"
            />
            <span v-else-if="item.emoji" class="flex-shrink-0 text-base leading-none">{{ item.emoji }}</span>
            <span class="truncate text-sm text-color">{{ getItemLabel(item) }}</span>
          </div>
        </template>
      </el-scrollbar>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.scrollbar-hidden {
  :deep(.el-scrollbar__bar) {
    display: none;
  }
}

.suggestion-menu {
  backdrop-filter: blur(8px);
}
</style>
