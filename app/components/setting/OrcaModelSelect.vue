<script lang="ts">
/**
 * Capability-filtered OrcaRouter model selector.
 *
 * The option list is always produced by filtering the discovered catalog; it is
 * never a free-text field and never a hand-written sample list. When the live
 * catalog is unavailable the verified fallback is shown with a degraded notice
 * and is filtered by the same rules.
 */
</script>

<script setup lang="ts">
import type { OrcaCapability, OrcaInputModality } from "~/composables/hooks/orcarouter/core/catalog";
import { computed, ref, watch } from "vue";
import { catalogStatusLabel } from "~/composables/hooks/orcarouter/core/catalog";
import { t } from "~/composables/hooks/orcarouter/core/labels";

export interface OrcaModelSelectProps {
  capability?: "chat" | "embedding" | "image" | "video" | "rerank"
  modalities?: Array<"text" | "image" | "audio" | "video" | "file">
  placeholder?: string
  size?: "small" | "default" | "large"
}

const {
  capability = "chat",
  modalities = ["text"],
  placeholder = undefined,
} = defineProps<OrcaModelSelectProps>();

const orca = useOrcaRouter();
const rootRef = ref<HTMLElement | null>(null);

/**
 * Input types the user can require of the selector. Toggling one recomputes
 * the option list through the provider, so a model that does not declare the
 * modality disappears from the dropdown instead of failing at send time.
 */
const INPUT_TYPES: { value: OrcaInputModality; label: string }[] = [
  { value: "image", label: t("inputImage") },
  { value: "audio", label: t("inputAudio") },
];

const extraModalities = ref<OrcaInputModality[]>([]);

const requiredModalities = computed<OrcaInputModality[]>(() => [
  ...new Set([...(modalities as OrcaInputModality[]), ...extraModalities.value]),
]);

watch(requiredModalities, (next) => {
  // The provider re-validates the current selection and clears it when it is no
  // longer compatible.
  orca.setRequiredModalities(next);
}, { immediate: true });

function toggleInputType(value: OrcaInputModality) {
  extraModalities.value = extraModalities.value.includes(value)
    ? extraModalities.value.filter(item => item !== value)
    : [...extraModalities.value, value];
}

/**
 * The options actually handed to the selector. Recomputed on every catalog,
 * capability or modality change, so an incompatible model can never stay
 * selectable.
 */
const options = computed(() =>
  orca.optionsFor(capability as OrcaCapability, requiredModalities.value),
);

const isLoading = computed(() => orca.state.catalogLoading);

const sourceLabel = computed(() => {
  const catalog = orca.state.catalog;
  if (!catalog) {
    return null;
  }
  if (catalog.source === "live") {
    return `Live catalog · ${options.value.length} compatible models`;
  }
  return catalogStatusLabel(catalog);
});

function onVisibleChange(visible: boolean) {
  if (visible) {
    void orca.loadCatalog(capability as OrcaCapability);
  }
}

defineExpose({
  options,
  isLoading,
  sourceLabel,
  rootRef,
});
</script>

<template>
  <div ref="rootRef" class="orca-model-select" data-testid="orca-model-select">
    <el-select
      :model-value="orca.state.selectedModel"
      class="orca-model-input"
      data-testid="orca-model-trigger"
      popper-class="orca-model-popper"
      :teleported="false"
      placement="bottom"
      :show-arrow="true"
      fit-input-width
      :filterable="true"
      :loading="isLoading"
      :placeholder="placeholder ?? t('modelLabel')"
      :no-data-text="isLoading ? 'Loading models…' : 'No compatible model in the current catalog'"
      @update:model-value="orca.selectModel($event)"
      @visible-change="onVisibleChange"
    >
      <el-option
        v-for="model in options"
        :key="model.id"
        :label="model.name"
        :value="model.id"
        :data-testid="`orca-model-option-${model.id}`"
      >
        <span class="orca-option-name">{{ model.name }}</span>
        <span class="orca-option-id">{{ model.id }}</span>
      </el-option>
    </el-select>

    <!-- Input types this entry point uploads. Changing one recomputes the
         option list; an incompatible selection is cleared, not kept. -->
    <div class="orca-input-types" data-testid="orca-input-types">
      <span class="orca-input-types-label">{{ t("inputTypesLabel") }}</span>
      <button
        v-for="type in INPUT_TYPES"
        :key="type.value"
        type="button"
        class="orca-input-type"
        :class="{ 'is-active': extraModalities.includes(type.value) }"
        :aria-pressed="extraModalities.includes(type.value)"
        :data-testid="`orca-input-type-${type.value}`"
        @click="toggleInputType(type.value)"
      >
        {{ type.label }}
      </button>
    </div>

    <div class="orca-model-meta">
      <span v-if="sourceLabel" class="orca-model-source" data-testid="orca-model-source">
        {{ sourceLabel }}
      </span>
      <button
        type="button"
        class="orca-refresh"
        data-testid="orca-model-refresh"
        :disabled="isLoading"
        @click="orca.loadCatalog(capability as OrcaCapability, true)"
      >
        {{ t("refresh") }}
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.orca-model-select {
  --at-apply: "flex flex-col gap-1 w-full";
}

.orca-model-input {
  --at-apply: "w-full";
}

/**
 * The dropdown is rendered in place (`:teleported="false"`) so it stays inside
 * this component's scroll context. Element Plus leaves the outermost popper
 * translucent, which makes the option list hard to read over the settings page.
 * The popper, its dropdown wrapper and its inner list each paint a background,
   and Element Plus leaves the outermost one translucent (`is-light` popper).
   The repo's own `bg-color` shortcut is applied to all three so the option list
   is fully opaque and theme-aware, matching the rest of the settings UI. */
.orca-option-name {
  --at-apply: "text-small text-color";
}

.orca-option-id {
  --at-apply: "text-mini text-small-color ml-2";
}

.orca-input-types {
  --at-apply: "flex flex-row items-center gap-2 flex-wrap";
}

.orca-input-types-label {
  --at-apply: "text-mini text-small-color";
}

.orca-input-type {
  --at-apply: "px-2 py-1 rounded-md text-mini cursor-pointer transition-200 border-default bg-color-2 text-small-color";

  &.is-active {
    --at-apply: "btn-primary text-color";
  }
}

.orca-model-meta {
  --at-apply: "flex flex-row items-center gap-2 flex-wrap";
}

.orca-model-source {
  --at-apply: "text-mini text-small-color";
}

.orca-refresh {
  --at-apply: "text-mini underline cursor-pointer";
}
</style>

<!--
  The select popper is rendered outside this component's scoped-style boundary,
  so a `:deep()` rule never reaches it. It is addressed through `popper-class`
  instead.

  `app/assets/styles/overrides.scss` styles every `el-select__popper` as a
  translucent, backdrop-blurred glass panel (`!bg-op-80 !backdrop-blur-6`).
  That reads well for a short single-line list, but this selector can render
  hundreds of model rows, and text over a blurred page background is hard to
  read. The panel therefore keeps the project's border, radius and blur while
  being made fully opaque through the same `--un-bg-opacity` variable the
  shortcut uses, so light and dark themes both stay consistent.
-->
<style lang="scss">
.el-popper.el-select__popper.orca-model-popper {
  --un-bg-opacity: 1 !important;

  .el-select-dropdown,
  .el-select-dropdown__list {
    background-color: transparent;
  }
}
</style>
