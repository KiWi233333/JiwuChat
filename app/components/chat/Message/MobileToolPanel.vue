<script setup lang="ts">
export interface ToolItem {
  id: string;
  icon: string;
  label: string;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  panel?: Component;
  panelProps?: Record<string, any>;
}

const props = defineProps<{
  show: boolean;
  tools: ToolItem[];
}>();

const emit = defineEmits<{
  "update:show": [value: boolean];
}>();

const activePanel = ref<string | null>(null);

const showPanel = computed({
  get: () => props.show,
  set: (val: boolean) => emit("update:show", val),
});

function handleToolClick(tool: ToolItem) {
  if (tool.disabled)
    return;

  if (tool.panel) {
    activePanel.value = tool.id;
  }
  else {
    tool.onClick?.();
  }
}

function closePanel() {
  if (activePanel.value) {
    activePanel.value = null;
  }
  else {
    showPanel.value = false;
  }
}

const activeTool = computed(() => {
  if (!activePanel.value)
    return null;
  return props.tools.find(t => t.id === activePanel.value) || null;
});

const activePanelComponent = computed(() => activeTool.value?.panel || null);
const activePanelProps = computed(() => activeTool.value?.panelProps || {});

watch(() => props.show, (val) => {
  if (!val) {
    activePanel.value = null;
  }
});

defineExpose({
  closePanel,
  activePanel,
});
</script>

<template>
  <Transition name="slide-height">
    <div v-if="show" class="w-full overflow-hidden">
      <div class="h-32vh flex select-none overflow-hidden">
        <div v-if="!activePanel" key="tools" class="grid grid-cols-4 my-a w-full gap-4 p-4">
          <div
            v-for="tool in tools"
            :key="tool.id"
            class="flex-row-c-c flex-col gap-1 transition-200 hover:op-70"
            :class="[tool.className, tool.disabled ? 'op-50 pointer-events-none' : 'cursor-pointer']"
            @click="handleToolClick(tool)"
          >
            <span class="h-15 w-15 flex-row-c-c card-default">
              <i class="p-3.6" :class="[tool.icon]" />
            </span>
            <span class="text-xs">{{ tool.label }}</span>
          </div>
        </div>

        <div v-else key="panel" class="tool-panel-container h-full w-full bg-color">
          <component :is="activePanelComponent" v-bind="activePanelProps" />
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
</style>
