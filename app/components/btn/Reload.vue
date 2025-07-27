<script lang="ts" setup>
defineEmits(["reload"]);
</script>

<template>
  <ElButton
    class="btn"
    round
    @click="$emit('reload')"
  >
    <span class="hidden overflow-hidden truncate md:inline">刷新</span>
    <i
      class="i-solar:refresh-outline w-1.4em w-1.4em cursor-pointer bg-[var(--el-color-info)] transition-300 hover:rotate-180"
      alt="页面刷新"
    />
  </ElButton>
</template>

<style lang="scss" scoped>
.btn {
  padding: 0em 0.4em;
  transition: $transition-delay;

  span {
    width: 0;
    overflow: hidden;
    transition: $transition-delay;
    letter-spacing: 0.1em;
  }

  &:hover {
    span {
      width: 3em;
    }
  }
  &:hover span,
  &:focus span {
    width: 3em;
    margin: 0 0.4em;
  }
}
</style>
