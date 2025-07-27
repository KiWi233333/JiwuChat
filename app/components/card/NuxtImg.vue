<script lang="ts" setup>
defineProps<{
  src?: string
  imgSrc?: string
  alt?: string
}>();
</script>

<template>
  <img
    :src="imgSrc ? (BaseUrlImg + imgSrc) : src"
    fit="cover" object-cover
    v-bind="$attrs"
    :alt="alt || '【图片】'"
  >
</template>

<style scoped lang="scss">
</style>
