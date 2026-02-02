<script setup lang="ts">
import Emoji from "./index.vue";

const emit = defineEmits<{
  "submit": [value: string];
  "update:visible": [visible: boolean];
}>();

const popoverVisible = ref(false);

function handleEmojiSubmit(val: string) {
  popoverVisible.value = false;
  emit("update:visible", false);
  emit("submit", val);
}
</script>

<template>
  <el-popover
    v-model:visible="popoverVisible"
    placement="top"
    trigger="click"
    width="fit-content"
    popper-class="emoji-select-popover"
  >
    <template #reference>
      <slot name="reference">
        <i class="i-solar:sticker-smile-circle-2-linear h-6 w-6 btn-primary cursor-pointer sm:(h-5 w-5)" />
      </slot>
    </template>
    <div
      class="h-20rem max-w-full min-w-18rem p-2"
    >
      <Emoji
        model-value-mode="raw"
        @update:model-value="handleEmojiSubmit"
      />
    </div>
  </el-popover>
</template>

<style scoped>
:deep(.emoji-list-group .grid) {
  padding: 0.5rem 0;
  grid-template-columns: repeat(auto-fill, minmax(1.5rem, 1fr));
  gap: 0.5rem;
}

:deep(.emoji-list-group .grid > div) {
  height: 1.5rem;
  width: 1.5rem;
  font-size: 1.5rem;
}
</style>

<style>
.emoji-select-popover {
  padding: 0 !important;
}
</style>
