<script setup lang="ts">
import { openPath } from "@tauri-apps/plugin-opener";

interface Props {
  size?: "small" | "default" | "large"
}

defineProps<Props>();

const setting = useSettingStore();

// 存储数据状态
const storageData = ref({
  localStorage: { size: 0, count: 0 },
  sessionStorage: { size: 0, count: 0 },
  indexedDB: { size: 0, count: 0 },
  cache: { size: 0, count: 0 },
  total: 0,
});

const isCalculatingSize = ref(false);
const isClearing = ref(false);

// 格式化存储大小
function formatSize(bytes: number): string {
  if (bytes === 0)
    return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

// 计算 localStorage 大小
function calculateLocalStorageSize() {
  let size = 0;
  let count = 0;
  try {
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        size += localStorage[key].length + key.length;
        count++;
      }
    }
  }
  catch (error) {
    console.warn("无法访问 localStorage:", error);
  }
  return { size: size * 2, count }; // 字符串是 UTF-16，每个字符 2 字节
}

// 计算 sessionStorage 大小
function calculateSessionStorageSize() {
  let size = 0;
  let count = 0;
  try {
    for (const key in sessionStorage) {
      if (Object.prototype.hasOwnProperty.call(sessionStorage, key)) {
        size += sessionStorage[key].length + key.length;
        count++;
      }
    }
  }
  catch (error) {
    console.warn("无法访问 sessionStorage:", error);
  }
  return { size: size * 2, count }; // 字符串是 UTF-16，每个字符 2 字节
}

// 计算 IndexedDB 大小（简化版）
async function calculateIndexedDBSize() {
  try {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const localStorageSize = storageData.value.localStorage.size;
      const sessionStorageSize = storageData.value.sessionStorage.size;
      const indexedDBSize = Math.max(0, usage - localStorageSize - sessionStorageSize);
      return { size: indexedDBSize, count: 1 };
    }
  }
  catch (error) {
    console.warn("无法计算 IndexedDB 大小:", error);
  }
  return { size: 0, count: 0 };
}

// 计算缓存大小
async function calculateCacheSize() {
  try {
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      let totalSize = 0;

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();

        for (const request of requests) {
          const response = await cache.match(request);
          if (response) {
            const blob = await response.blob();
            totalSize += blob.size;
          }
        }
      }

      return { size: totalSize, count: cacheNames.length };
    }
  }
  catch (error) {
    console.warn("无法计算缓存大小:", error);
  }
  return { size: 0, count: 0 };
}

// 计算所有存储数据大小
async function calculateAllStorageSize(isLog = false) {
  isCalculatingSize.value = true;
  try {
    const localStorage = calculateLocalStorageSize();
    const sessionStorage = calculateSessionStorageSize();
    const indexedDB = await calculateIndexedDBSize();
    const cache = await calculateCacheSize();

    const total = localStorage.size + sessionStorage.size + indexedDB.size + cache.size;

    storageData.value = {
      localStorage,
      sessionStorage,
      indexedDB,
      cache,
      total,
    };
    isLog && ElMessage.info("刷新成功！");
  }
  catch (error) {
    console.error("计算存储大小失败:", error);
    ElMessage.error("计算存储大小失败");
  }
  finally {
    isCalculatingSize.value = false;
  }
}

// 清理 localStorage
async function clearLocalStorage() {
  try {
    const count = storageData.value.localStorage.count;
    localStorage.clear();
    ElMessage.success(`已清理 ${count} 个 localStorage 项目`);
  }
  catch (error) {
    console.error("清理 localStorage 失败:", error);
    ElMessage.error("清理 localStorage 失败");
  }
}

// 清理 sessionStorage
async function clearSessionStorage() {
  try {
    const count = storageData.value.sessionStorage.count;
    sessionStorage.clear();
    ElMessage.success(`已清理 ${count} 个 sessionStorage 项目`);
  }
  catch (error) {
    console.error("清理 sessionStorage 失败:", error);
    ElMessage.error("清理 sessionStorage 失败");
  }
}

// 清理 IndexedDB
async function clearIndexedDB() {
  try {
    if ("indexedDB" in window) {
      // 获取所有数据库名称并删除
      const databases = await indexedDB.databases();
      const deletePromises = databases.map((db) => {
        if (db.name) {
          return new Promise<void>((resolve, reject) => {
            const deleteRequest = indexedDB.deleteDatabase(db.name!);
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
          });
        }
        return Promise.resolve();
      });

      await Promise.all(deletePromises);
      ElMessage.success(`已清理 ${databases.length} 个 IndexedDB 数据库`);
    }
  }
  catch (error) {
    console.error("清理 IndexedDB 失败:", error);
    ElMessage.error("清理 IndexedDB 失败");
  }
}

// 清理缓存
async function clearCache() {
  try {
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName)),
      );
      ElMessage.success(`已清理 ${cacheNames.length} 个缓存`);
    }
  }
  catch (error) {
    console.error("清理缓存失败:", error);
    ElMessage.error("清理缓存失败");
  }
}
// 获取存储空间使用情况
const storageUsage = ref({
  used: 0,
  total: 0,
  percentage: 0,
});

async function getStorageUsage() {
  try {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      storageUsage.value = {
        used: Math.round((estimate.usage || 0) / 1024 / 1024),
        total: Math.round((estimate.quota || 0) / 1024 / 1024),
        percentage: Math.round(((estimate.usage || 0) / (estimate.quota || 1)) * 100),
      };
    }
  }
  catch (error) {
    console.error("获取存储使用情况失败:", error);
  }
}


// 下载目录统计信息
const downloadDirStats = ref<DirStats | null>(null);
const isLoadingStats = ref(false);

// 扫描下载目录统计信息
async function scanDownloadDirStats() {
  if (!setting.appDataDownloadDirUrl)
    return;

  isLoadingStats.value = true;
  try {
    const stats = await scanDirStats(setting.appDataDownloadDirUrl);
    downloadDirStats.value = stats;
  }
  catch (error) {
    console.error("扫描下载目录失败:", error);
    downloadDirStats.value = null;
  }
  finally {
    isLoadingStats.value = false;
  }
}

// 打开下载文件夹
async function openFileFolder() {
  if (!await existsFile(setting.appDataDownloadDirUrl)) {
    ElMessageBox.confirm("下载目录不存在，是否创建？", {
      title: "提示",
      center: true,
      confirmButtonText: "创建",
      cancelButtonText: "取消",
      confirmButtonClass: "el-button-warning",
      lockScroll: true,
      callback: async (action: string) => {
        if (action === "confirm") {
          mkdirFile(setting.appDataDownloadDirUrl);
        }
      },
    });
    return;
  }
  await openPath(setting.appDataDownloadDirUrl);
}


onMounted(() => {
  // 组件挂载时扫描下载目录
  scanDownloadDirStats();
  // 组件挂载时计算缓存大小和存储使用情况
  calculateAllStorageSize();
  getStorageUsage();
});
</script>

<template>
  <div class="setting-group">
    <label class="title">存储数据</label>
    <div class="box">
      <div class="setting-item">
        <span class="setting-label">缓存和文件</span>
        <div class="flex items-center gap-3">
          <span class="text-theme-warning font-medium">{{ formatSize(storageData.total + (downloadDirStats?.total_size || 0)) }}</span>
          <BtnElButton
            size="small"
            text
            class="text-4"
            icon-class="i-solar:refresh-outline hover:rotate-180 transition-200"
            @click="calculateAllStorageSize(true)"
          />
        </div>
      </div>
      <!-- 存储空间配额 -->
      <div class="setting-item">
        <span class="setting-label">存储配额</span>
        <div class="flex items-center gap-3">
          <div class="text-sm opacity-70">
            <span>{{ storageUsage.used }}MB / {{ storageUsage.total }}MB</span>
          </div>
          <el-progress
            :percentage="storageUsage.percentage"
            :width="40"
            type="circle"
            :show-text="false"
            :stroke-width="10"
            class="flex-shrink-0"
          />
        </div>
      </div>
      <!-- 下载路径 -->
      <SettingDownLoad v-if="!setting.isWeb" />
    </div>
    <!-- 文件数据 -->
    <label v-if="!setting.isWeb" class="title">文件数据</label>
    <div v-if="!setting.isWeb" class="box">
      <div class="setting-item">
        <span class="setting-label">文件总大小</span>
        <div class="flex items-center gap-3">
          <div class="text-sm">
            <span v-if="downloadDirStats" class="text-theme-info font-medium dark:text-light">
              {{ formatSize(downloadDirStats.total_size) }}
            </span>
            <span v-else class="opacity-70">未统计</span>
          </div>
          <BtnElButton
            size="small"
            text
            class="text-4"
            icon-class="i-solar:refresh-outline hover:rotate-180 transition-200"
            :loading="isLoadingStats"
            @click="scanDownloadDirStats"
          />
        </div>
      </div>
      <div class="setting-item">
        <span class="setting-label">文件统计</span>
        <div title="总文件数量" class="ml-a flex-row-c-c btn-warning-bg border-default-2 card-default card-rounded-df px-2 py-1" @click="openFileFolder">
          共{{ downloadDirStats?.file_count || 0 }}个
          <img class="ml-1 h-4 w-4" src="/images/icon/DEFAULT.png" alt="">
        </div>
        <div title="文件夹数量" class="ml-2 flex-row-c-c btn-info-bg border-default-2 card-default card-rounded-df px-2 py-1" @click="openFileFolder">
          共{{ downloadDirStats?.dir_count || 0 }}个
          <img class="ml-1 h-4 w-4" src="/images/icon/OpenedFolder.png" alt="">
        </div>
      </div>
    </div>
    <!-- 存储分析 -->
    <label class="title">存储分析</label>
    <div class="box storage-details !py-4">
      <!-- 存储详情 -->
      <div class="storage-details">
        <!-- localStorage -->
        <div class="storage-item">
          <div class="flex items-center gap-2">
            <i class="i-solar:server-2-bold-duotone text-yellow-500" />
            <span class="text-sm">localStorage</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="text-mini">
              {{ formatSize(storageData.localStorage.size) }}
              <span v-if="storageData.localStorage.count > 0">
                ({{ storageData.localStorage.count }} 项)
              </span>
            </div>
            <BtnElButton
              size="small"
              class="btn"
              text bg
              icon-class="i-solar:trash-bin-minimalistic-outline mr-1"
              :disabled="storageData.localStorage.count === 0"
              @click="clearLocalStorage"
            >
              清理
            </BtnElButton>
          </div>
        </div>

        <!-- sessionStorage -->
        <div class="storage-item">
          <div class="flex items-center gap-2">
            <i class="i-solar:server-outline text-green-500" />
            <span class="text-sm">sessionStorage</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="text-xs opacity-70">
              {{ formatSize(storageData.sessionStorage.size) }}
              <span v-if="storageData.sessionStorage.count > 0">
                ({{ storageData.sessionStorage.count }} 项)
              </span>
            </div>
            <BtnElButton
              size="small"
              class="btn"
              bg text
              icon-class="i-solar:trash-bin-minimalistic-outline mr-1"
              :disabled="storageData.sessionStorage.count === 0"
              @click="clearSessionStorage"
            >
              清理
            </BtnElButton>
          </div>
        </div>

        <!-- IndexedDB -->
        <div class="storage-item">
          <div class="flex items-center gap-2">
            <i class="i-solar:database-linear text-blue-500" />
            <span class="text-sm">IndexedDB</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="text-xs opacity-70">
              {{ formatSize(storageData.indexedDB.size) }}
            </div>
            <BtnElButton
              size="small"
              class="btn"
              bg text
              icon-class="i-solar:trash-bin-minimalistic-outline mr-1"
              :disabled="storageData.indexedDB.size === 0"
              @click="clearIndexedDB"
            >
              清理
            </BtnElButton>
          </div>
        </div>

        <!-- 缓存 -->
        <div class="storage-item">
          <div class="flex items-center gap-2">
            <i class="i-solar:cloud-storage-outline text-orange-500" />
            <span class="text-sm">缓存</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="text-xs opacity-70">
              {{ formatSize(storageData.cache.size) }}
              <span v-if="storageData.cache.count > 0">
                ({{ storageData.cache.count }} 项)
              </span>
            </div>
            <BtnElButton
              size="small"
              class="btn"
              bg text
              icon-class="i-solar:trash-bin-minimalistic-outline mr-1"
              :disabled="storageData.cache.size === 0"
              @click="clearCache"
            >
              清理
            </BtnElButton>
          </div>
        </div>
      </div>
      <!-- 操作 -->
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <BtnElButton
            title="重置并清理缓存"
            class="ml-a px-3 py-2"
            icon-class="i-solar:trash-bin-trash-outline mr-1"
            bg
            text
            @click="setting.reset()"
          >
            重置应用
          </BtnElButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "./setting.g.scss";

.storage-details {
  --at-apply: "border-t";

  .storage-item {
    --at-apply: "flex items-center justify-between py-2 px-3 rounded-lg mb-2 border-b border-default-3 hover:!border-default transition-200";
  }
}
.btn {
  --at-apply: "w-fit px-2 h-6";
}
</style>
