<script lang="ts" setup>
const { text, pretext, icon } = defineProps<{
  text?: string | number
  pretext?: string
  icon?: string
}>();
</script>

<template>
  <div v-copying.toast="text" class="cursor-pointer transition-200 hover:text-theme-info">
    <div inline>
      {{ pretext }}
    </div>
    <div
      ml-a
      inline
    >
      {{ text }}
    </div>
    <i
      v-if="icon"
      class="ml-1 p-0.5em opacity-60"
      :class="icon"
    />
  </div>
</template>

<style scoped lang="scss"></style>
