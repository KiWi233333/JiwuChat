<script lang="ts" setup>
import { dayjs } from "element-plus";

defineProps<{
  iconClass?: string
}>();

const [autoAnimateRef, enable] = useAutoAnimate();
const scollRef = ref();
const inputRef = ref();

const search = ref("");
const showSearch = ref(false);
const setting = useSettingStore();


// 打开搜索
async function openSearch() {
  showSearch.value = !showSearch.value;
  inputRef.value?.focus();
}

// 过滤文件列表
const filterList = computed(() => {
  if (search.value.trim()) {
    return setting.fileDownloadList.filter(p =>
      p.fileName.toLowerCase().includes(search.value.toLowerCase()),
    );
  }
  return setting.fileDownloadList;
});
const FileStatusClassMap: Record<FileStatus, string> = {
  [FileStatus.ERROR]: "el-color-error",
  [FileStatus.PAUSED]: "op-70",
  [FileStatus.NOT_FOUND]: "line-through grayscale",
  [FileStatus.DOWNLOADING]: "",
  [FileStatus.DOWNLOADED]: "",
};
onMounted(() => {
  enable(!setting.settingPage.isCloseAllTransition);
  setting.fileDownloadList.filter(p => p.status === FileStatus.DOWNLOADING).forEach(async (p) => {
    const isExist = await existsFile(p.localPath);
    if (!isExist)
      p.status = FileStatus.NOT_FOUND;
    else
      p.status = FileStatus.DOWNLOADED;
  });
});
</script>

<template>
  <el-popover
    v-model:visible="setting.showDownloadPanel"
    placement="top"
    width="fit-content"
    :teleported="true"
    popper-class="popover"
    trigger="click"
    append-to="body"
    :hide-after="0"
  >
    <template #reference>
      <div :class="iconClass">
        <CommonIconTip
          class="btn-info text-5"
          icon="i-solar:download-minimalistic-broken"
          tip="下载管理"
          :disabled-tooltip="setting.showDownloadPanel"
        />
      </div>
    </template>
    <template #default>
      <div
        class="w-90vw sm:w-350px"
      >
        <div class="flex items-center gap-2 p-2 pt-0">
          <i class="i-solar-download-minimalistic-broken p-0.6em" />
          <span>下载</span>
          <nuxt-link to="/setting#system" title="设置下载路径" class="i-solar:settings-linear ml-a btn-primary p-0.6em" />
          <!-- 搜索框 -->
          <el-input
            ref="inputRef"
            v-model.lazy="search"
            placeholder="搜索"
            size="small" clearable
            class="overflow-hidden transition-width"
            :style="{ width: showSearch ? '40%' : '0' }"
          />
          <span class="btn-primary" :title="showSearch ? '关闭搜索' : '打开搜索'" @click="openSearch()">
            <i class="p-0.6em" :class="showSearch ? 'i-carbon:close' : 'i-solar-magnifer-broken'" />
          </span>
        </div>
        <!-- 内容 -->
        <el-scrollbar
          ref="scollRef" view-class="p-2 h-40vh md:h-340px"
          class="relative bg-light shadow shadow-inset rounded dark:bg-dark-9"
        >
          <div v-if="filterList.length" ref="autoAnimateRef" relative flex flex-col pb-4>
            <!-- 文件 -->
            <div
              v-for="p in filterList"
              :key="p.downloadTime"
              :title="`“${p.fileName}” 打开文件`"
              class="group mb-2 w-full flex cursor-pointer gap-2 bg-white px-3 py-2 shadow-sm transition-all rounded !items-center dark:bg-dark-7 hover:shadow"
              :class="FileStatusClassMap[p.status]"
              @click="setting.openFileByDefaultApp(p)"
            >
              <img
                :src="p.mimeType ? (FILE_TYPE_ICON_MAP[p.mimeType] || FILE_TYPE_ICON_DEFAULT) : FILE_TYPE_ICON_DEFAULT"
                class="h-6 w-6 object-contain"
              >
              <div class="flex flex-1 flex-col justify-between gap-1 truncate px-1">
                <p class="truncate text-sm">
                  {{ p.fileName }}
                </p>
                <p flex-row-bt-c gap-2 truncate text-xs op-60>
                  <el-progress
                    v-if="p.status === FileStatus.DOWNLOADING"
                    :stroke-width="6"
                    :percentage="p.currentSize && p.totalSize ? +(p.currentSize / p.totalSize).toFixed(4) * 100 : 0"
                    :show-text="false"
                    class="progress-bar w-7/10"
                  />
                  <small v-else>
                    {{ DownFileTextMap[p.status] }}
                    <span class="hidden group-hover:inline">
                      {{ dayjs(p.downloadTime).format("YYYY-MM-DD HH:mm") }}
                    </span>
                  </small>
                  <small>
                    <template v-if="p.status === FileStatus.DOWNLOADING">
                      {{ formatFileSize(p.currentSize || 0) }} /
                    </template>
                    {{ formatFileSize(p.totalSize || 0) }}
                  </small>
                </p>
              </div>
              <div v-if="[FileStatus.DOWNLOADED, FileStatus.NOT_FOUND, FileStatus.ERROR].includes(p.status as any)" flex gap-3>
                <i
                  v-if="p.status === FileStatus.DOWNLOADED" i-solar-folder-with-files-line-duotone block h-4 w-4
                  btn-primary
                  title="打开所在文件夹"
                  @click.stop.prevent="setting.openFileFolder(p)"
                />
                <i
                  i-solar:trash-bin-trash-outline block h-4 w-4 btn-danger
                  title="删除文件"
                  @click.stop.prevent="setting.deleteDownloadFile(p)"
                />
              </div>
              <!-- <div v-if="[FileStatus.PAUSED, FileStatus.DOWNLOADING, FileStatus.ERROR].includes(p.status as any)" flex gap-3>
                <i
                  i-solar:trash-bin-trash-outline
                  block h-4 w-4 btn-danger
                  title="删除下载"
                  @click.stop.prevent="setting.deleteDownloadFile(p, false)"
                />
              </div> -->
            </div>
            <small block text-center>暂无更多</small>
          </div>
          <!-- 没有文件 -->
          <div v-else class="h-full flex-row-c-c flex-col text-center op-70">
            <i i-solar-folder-with-files-line-duotone class="mb-2 h-8 w-8" />
            <small class="text-sm">
              暂无文件
            </small>
          </div>
        </el-scrollbar>
      </div>
    </template>
  </el-popover>
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

  &:hover span,
  &:focus span {
    width: 4.6em;
    margin: 0 0.4em;
  }
}
</style>
