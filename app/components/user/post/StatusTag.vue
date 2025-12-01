<script lang="ts" setup>
import { PostStatus } from "@/composables/api/community/post";

// props
interface Props {
  status?: PostStatus
  updateTime?: number
}
const props = withDefaults(defineProps<Props>(), {
  status: PostStatus.UNDOING,
});
const getStatus = computed(() => {
  return getPostStatusList.find(item => item.value === props.status);
});
</script>

<template>
  <el-tag
    :type="(getStatus?.iconClass || '') as any" class="ml-2 text-light shadow md:ml-4"
    effect="dark"
    v-bind="$attrs"
  >
    <span class="flex items-center text-light">
      <slot name="pre" />
      {{ getStatus?.title }}
    </span>
  </el-tag>
</template>

<style scoped lang="scss">
:deep(.el-loading-mask) {
  background-color: transparent;
}
</style>
