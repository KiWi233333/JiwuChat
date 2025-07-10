<script setup lang="ts">
const setting = useSettingStore();
const progress = computed(() => +((setting.appUploader.downloaded / setting.appUploader.contentLength) * 100 || 0).toFixed(2));
</script>

<template>
  <ElButton
    v-if="!setting.appUploader.isUpdating"
    class="flex-row-c-c cursor-pointer transition-all"


    :title="setting.appUploader.newVersion ? `v${setting.appUploader.version} > v${setting.appUploader.newVersion}` : `当前版本：v${setting.appUploader.version}` "
    size="small"
    round text plain
    style="padding: 0 0.8em 0 0.5em; height: 1.5rem;"
    :class="{
      '!hover:bg-color-3': !setting.appUploader.isUpload,
    }"
    :type="setting.appUploader.isUpload ? 'info' : ''"
    @click="setting.checkUpdates(true)"
  >
    <span flex-row-c-c>
      <i
        i-solar:archive-down-minimlistic-line-duotone mr-1 inline-block
        :class="{
          'i-solar:refresh-outline animate-spin': setting.appUploader.isCheckUpdatateLoad,
          'i-solar:cloud-download-linear': !setting.appUploader.isCheckUpdatateLoad && setting.appUploader.isUpload,
        }"
      />
      {{ setting.appUploader.isUpload ? '新版本' : '检查更新' }}
    </span>
  </ElButton>
  <el-progress
    v-else
    :percentage="progress"
    color="#10cf80"
    :stroke-width="22"
    style="padding: 0 0.8em 0 0.5em; height: 1.5rem;width: 6rem;"
    striped
    striped-flow
    text-inside
  />
</template>

<style lang="scss" scoped>
#version-toast {
  --at-apply: "bg-transparent p-0 m-0";
}
.preview {
  :deep(#version-toast-preview) {
    font-size: 0.74rem;

    .version-toast-preview-wrapper {
      .task-list-item-checkbox[type="checkbox"] {
        display: none !important;
      }
    }
  }
}
.animation-swing {
  animation-name: animation-swing;
  animation-duration: 5s;
  animation-iteration-count: infinite;
  animation-timing-function: ease-in-out;
  animation-fill-mode: both;
}

@keyframes animation-swing {
  4% {
    transform: rotate3d(0, 0, 1, 15deg);
  }
  8% {
    transform: rotate3d(0, 0, 1, -10deg);
  }
  12% {
    transform: rotate3d(0, 0, 1, 5deg);
  }
  16% {
    transform: rotate3d(0, 0, 1, -5deg);
  }
  20% {
    transform: rotate3d(0, 0, 1, 0deg);
  }
  to {
  }
}
</style>

