<script setup lang="ts">
import { MdPreview } from "md-editor-v3";
import "md-editor-v3/lib/preview.css";

const setting = useSettingStore();

// 公告
const {
  showNotice,
  notice,
  currentVersion,
  showUpateNoticeLine,
  showVersionNotice,
  handleCheckUpadate,
  isNoMore,
  versionList,
  loadVersionPage,
} = useSettingNotice();
</script>

<template>
  <div v-bind="$attrs" class="group h-8 flex-row-bt-c">
    关于更新
    <div class="ml-a flex items-center gap-2 sm:gap-4">
      <span class="text-0.8rem tracking-0.1em !btn-info" @click="showUpateNoticeLine = true">{{ currentVersion ? `v${currentVersion}` : "" }} 更新日志</span>
      <template v-if="setting.isDesktop">
        <el-badge
          v-if="!setting.appUploader.isUpdating"
          :offset="[-5, 5]" :hidden="!setting.appUploader.isUpload"
          is-dot
          :value="+setting.appUploader.isUpload"
        >
          <ElButton
            v-if="setting.isDesktop"
            class="flex-row-c-c cursor-pointer transition-all"
            round plain
            size="small"
            style="height: 1.5rem;padding: 0 0.8rem 0 0.4rem;"
            :type="setting.appUploader.isUpdating ? 'warning' : 'info'"
            @click="!setting.appUploader.isCheckUpdatateLoad && setting.checkUpdates(true)"
          >
            <span flex-row-c-c>
              <i
                i-solar:refresh-outline mr-1 inline-block p-2
                :class="setting.appUploader.isCheckUpdatateLoad ? 'animate-spin' : ''"
              />
              检查更新
            </span>
          </ElButton>
        </el-badge>
        <el-progress
          v-else
          :percentage="+((setting.appUploader.downloaded / setting.appUploader.contentLength) * 100 || 0).toFixed(2)"
          :stroke-width="18"
          striped
          striped-flow
          text-inside
          class="progress-bar w-13rem"
        >
          {{ setting.appUploader.downloadedText || "- / - MB" }}
        </el-progress>
      </template>
    </div>
  </div>
  <!-- 版本公告 -->
  <DialogPopup
    v-model="showNotice"
    destroy-on-close
    :duration="300"
    :z-index="1100"
    width="fit-content"
  >
    <template #title>
      <h4 mb-4 text-center text-1.2rem>
        &emsp;版本公告 🔔
      </h4>
    </template>
    <div class="max-h-60vh min-h-30vh w-86vw overflow-y-auto sm:w-500px">
      <MdPreview
        language="zh-CN"
        editor-id="notice-toast"
        show-code-row-number
        :no-img-zoom-in="setting.isMobileSize"
        :theme="$colorMode.value === 'dark' ? 'dark' : 'light'"
        preview-theme="smart-blue"
        :code-foldable="false"
        code-theme="a11y"
        class="mt-2 px-4 !bg-transparent"
        :model-value="notice"
      />
    </div>
    <div class="mt-2 mt-4 flex-row-c-c">
      <el-button type="primary" @click="showNotice = false">
        &emsp;我知道了 🎉
      </el-button>
    </div>
  </DialogPopup>
  <!-- 版本的时间线 -->
  <DialogPopup
    v-model="showUpateNoticeLine"
    destroy-on-close
    :duration="300"
    :z-index="1099"
  >
    <template #title>
      <h4 mb-6 text-center text-1.2rem>
        更新日志
        <i i-solar:notebook-bold ml-2 p-3 text-theme-warning />
      </h4>
    </template>
    <el-scrollbar wrap-class="w-86vw pr-2 pl-1 sm:pr-4 animate-[blur-in_.6s] overflow-y-auto max-h-40vh min-h-30vh sm:max-h-60vh md:w-420px sm:w-380px">
      <el-timeline style="max-width: 100%;">
        <ListAutoIncre
          :immediate="true"
          :auto-stop="true"
          :no-more="isNoMore"
          @load="loadVersionPage"
        >
          <el-timeline-item
            v-for="(item, i) in versionList"
            :key="item.notice"
            :color="i === 0 ? 'var(--el-color-primary)' : ''"
            class="group"
          >
            <div class="flex items-center text-xl font-bold">
              v{{ item.version }}
              <el-tag v-if="item.version === currentVersion" type="primary" effect="dark" size="small" class="ml-2 text-xs text-dark">
                当前
              </el-tag>
              <el-tag v-else-if="item.isLatest" type="danger" effect="dark" size="small" class="ml-2 text-xs text-dark">
                有新版本
              </el-tag>
              <div :title="item.createTime" class="ml-a mt-2 text-mini font-400">
                <span
                  v-if="item.notice "
                  class="mr-2 cursor-pointer text-center text-mini transition-200 hover:text-color-info group-hover:op-100 sm:op-0"
                  @click="item.notice ? showVersionNotice(item.version) : ''"
                >
                  更多
                </span>
                {{ formatVersionDate(item.createTime) }}
              </div>
            </div>
            <div
              v-if="item.noticeSummary"
              class="relative max-h-12em cursor-pointer truncate sm:max-h-16em"
              :class="{ '!max-h-30em pb-4': item.isLatest }"
              @click="showVersionNotice(item.version)"
            >
              <MdPreview
                language="zh-CN"
                editor-id="notice-toast"
                show-code-row-number
                :theme="$colorMode.value === 'dark' ? 'dark' : 'light'"
                :code-foldable="false"
                code-theme="a11y"
                no-img-zoom-in
                style="background-color: transparent;"
                class="preview mt-2 card-rounded-df op-60 shadow-sm shadow-inset transition-opacity !border-default-hover hover:op-100"
                :model-value="item.noticeSummary.substring(0, 400)"
              />
              <!-- <div class="notice-summary">{{ item.noticeSummary }}</div> -->
              <div
                class="linear-bt absolute bottom-0 left-0 w-full pt-6 text-center text-mini hover:text-color-info"
              >
                <span op-0 transition-opacity group-hover:op-100>
                  查看更多
                </span>
              </div>
            </div>
          </el-timeline-item>
          <template #done>
            <div class="py-1rem text-center text-mini">
              {{ versionList.length ? "没有更多了" : "快去认识其他人" }}
            </div>
          </template>
        </ListAutoIncre>
      </el-timeline>
    </el-scrollbar>
    <div class="mt-2 mt-4 flex-row-c-c">
      <BtnElButton class="w-6rem" @click="showUpateNoticeLine = false">
        关&nbsp;闭
      </BtnElButton>
      <BtnElButton
        v-if="setting.isDesktop"
        class="w-6rem"
        type="primary"
        :loading="setting.appUploader.isCheckUpdatateLoad || setting.appUploader.isUpdating"
        @click="handleCheckUpadate"
      >
        {{ setting.appUploader.isUpdating ? '正在更新' : '检查更新' }}
      </BtnElButton>
    </div>
  </DialogPopup>
</template>

<style lang="scss" scoped>
:deep(.md-editor-preview-wrapper) {
  padding: 0;
  h1:first-of-type {
    font-size: 1.5em;
  }
}
.preview {
  :deep(#notice-toast-preview) {
    font-size: 0.74rem;

    .notice-toast-preview-wrapper {
      .task-list-item-checkbox[type="checkbox"] {
        display: none !important;
      }
    }
  }
}
:deep(.el-timeline-item){
  .el-timeline-item__tail {
    left: 5px;
    top:0.3em;
  }
  .el-timeline-item__node--normal {
    left: 0;
    top: 0.3em;
  }
}

.notice-summary:nth-of-type(1) {
  font-weight: bold;
}

.linear-bt {
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.8) 50%, rgba(255, 255, 255, 1) 100%);
}
.dark .linear-bt {
  background: linear-gradient(to bottom, rgba(15, 15, 15, 0) 0%, rgba(15, 15, 15, 0.8) 50%, rgba(15, 15, 15, 1) 100%);
}
</style>

