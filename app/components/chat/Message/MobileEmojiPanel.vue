<script setup lang="ts">
import CommonEmoji from "@/components/common/Emoji/index.vue";

const emit = defineEmits<{
  submit: [value: string];
}>();

function handleSubmit(emoji: string) {
  emit("submit", emoji);
}
</script>

<template>
  <div class="h-full w-full p-4 pt-0">
    <CommonEmoji
      class="h-full"
      model-value-mode="raw"
      :enable-search="false"
      :enable-category-title="false"
      @update:model-value="handleSubmit"
    />
  </div>
</template>

<style scoped lang="scss">
:deep(.emoji-list-group) {
  --at-apply: "bg-color-2 mt-2 rounded-lg";
}
</style>
