<script lang="ts" setup>
const {
  defaultSrc,
  loadClass,
  previewSrcList,
  errorRootClass,
  errorClass,
  src,
} = defineProps<{
  src?: string
  defaultSrc?: string
  loadClass?: string
  errorRootClass?: string
  errorClass?: string
  previewSrcList?: string[]
  ctxName?: string
}>();
const target = computed(() => defaultSrc !== undefined ? BaseUrlImg + defaultSrc : src);

// 打开图片预览
function openPreview() {
  if (previewSrcList && previewSrcList.length > 0) {
    useImageViewer.open({
      urlList: previewSrcList,
      initialIndex: 0,
    });
  }
}
</script>

<template>
  <el-image
    :src="target"
    fit="cover"
    :draggable="false"
    v-bind="$attrs"
    :preview-teleported="false"
    :preview-src-list="[]"
    :ctx-name="ctxName"
    class="cursor-pointer"
    @click="openPreview"
  >
    <!-- 占位 -->
    <template #placeholder>
      <slot name="placeholder">
        <div :class="loadClass !== undefined ? loadClass : 'sky-loading h-full w-full'" />
      </slot>
    </template>
    <!-- 错误 -->
    <template #error>
      <slot name="error">
        <div :ctx-name="ctxName" class="h-full w-full flex-row-c-c" :class="errorRootClass">
          <i :ctx-name="ctxName" class="i-solar-user-line-duotone block h-3/5 max-h-4/5 max-w-4/5 min-h-4 min-w-4 w-3/5 text-gray op-60" :class="errorClass" />
        </div>
      </slot>
    </template>
  </el-image>
</template>
