<script setup lang="ts">
import { MdPreview } from "md-editor-v3";
import { appEnName } from "~/constants";
import "md-editor-v3/lib/preview.css";

const setting = useSettingStore();
const progress = computed(() => +((setting.appUploader.downloaded / setting.appUploader.contentLength) * 100 || 0).toFixed(2));

const latestVersionInfo = ref<AppVersionInfoVO | null>(null);
const app = useRuntimeConfig();
const currentVersion = computed(() => app.public.version || "");

const showVersionNotifyDialog = useLocalStorage("show-version-notify-dialog", "");
const ignoreShowVersionDialog = computed({
  get: () => showVersionNotifyDialog.value === `${app.public.version}_ignore`,
  set: (val) => {
    showVersionNotifyDialog.value = val ? `${app.public.version}_ignore` : "";
  },
});

onMounted(async () => {
  const res = await getVersionNotice("latest");
  if (res.code === StatusCode.SUCCESS) {
    latestVersionInfo.value = res.data;
  }
  else {
    latestVersionInfo.value = null;
  }
});

const ignoreUpdate = computed({
  get: () => setting.appUploader.ignoreVersion.includes(latestVersionInfo.value?.version || ""),
  set: (val) => {
    if (val) {
      setting.appUploader.ignoreVersion.push(latestVersionInfo.value?.version || "");
    }
    else {
      setting.appUploader.ignoreVersion = setting.appUploader.ignoreVersion.filter(v => v !== latestVersionInfo.value?.version);
    }
  },
});
</script>

<template>
  <el-popover
    v-if="!setting.appUploader.isUpdating && !ignoreShowVersionDialog"
    placement="bottom"
    width="fit-content"
    :teleported="true"
    popper-style="border-radius: 0.75rem;"
    popper-class="popover"
    trigger="click"
    append-to="body"
    :hide-after="0"
  >
    <template #reference>
      <ElButton
        class="flex-row-c-c cursor-pointer transition-all"
        round
        plain
        size="small"
        style="padding: 0 0.8em 0 0.5em; height: 1.5rem;"
        :class="{
          '!hover:bg-color-3': !setting.appUploader.isUpload,
        }"
        :text="!setting.appUploader.isUpload"
        :type="!setting.appUploader.isUpload ? '' : 'info'"
      >
        <span flex-row-c-c>
          <i
            mr-1 inline-block
            :class="{
              'i-solar:refresh-outline animate-spin': setting.appUploader.isCheckUpdatateLoad,
              'i-solar:archive-minimalistic-line-duotone animation-swing': !setting.appUploader.isCheckUpdatateLoad && !setting.appUploader.isUpload,
              'i-solar:cloud-download-linear': !setting.appUploader.isCheckUpdatateLoad && setting.appUploader.isUpload,
            }"
          />
          {{ setting.appUploader.isUpload ? '新版本' : '更新内容' }}
        </span>
      </ElButton>
    </template>
    <template #default>
      <div class="w-20rem p-1">
        <!-- 版本信息 -->
        <div class="top flex">
          <CardElImage src="/logo.png" class="mr-3 h-10 w-10" />
          <div class="flex flex-1 flex-col justify-around text-xs">
            <strong>
              {{ appEnName }}
            </strong>
            <div class="">
              v{{ latestVersionInfo?.version.replace(/^v/, '') || '-' }} 版本
            </div>
          </div>
        </div>
        <div class="main py-3">
          <small>{{ currentVersion !== latestVersionInfo?.version ? '发现新版本，立即更新体验新功能 🎉' : "新版本已更新，快去体验吧 🎉" }}</small>
          <el-scrollbar max-height="25rem">
            <MdPreview
              language="zh-CN"
              editor-id="version-toast"
              show-code-row-number
              :no-img-zoom-in="setting.isMobileSize"
              :theme="$colorMode.value === 'dark' ? 'dark' : 'light'"
              :code-foldable="false"
              class="preview m-0 bg-transparent p-0"
              :model-value="(latestVersionInfo?.noticeSummary || '').substring(0, 200)"
            />
          </el-scrollbar>
        </div>
        <div v-if="currentVersion !== latestVersionInfo?.version || setting.appUploader.isUpload" class="flex-row-bt-c">
          <el-checkbox v-model="ignoreUpdate" size="small">
            忽略更新
          </el-checkbox>
          <BtnElButton :loading="setting.appUploader.isUpdating" size="small" type="primary" @click="setting.handleAppUpdate()">
            立即更新
          </BtnElButton>
        </div>
        <div v-else class="flex-row-bt-c">
          <span text-mini>操作</span>
          <el-checkbox v-model="ignoreShowVersionDialog" size="small">
            不再提示
          </el-checkbox>
        </div>
      </div>
    </template>
  </el-popover>
  <el-progress
    v-else-if="!ignoreShowVersionDialog"
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

