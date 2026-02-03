<script lang="ts" setup>
import { appKeywords } from "@/constants/index";

useSeoMeta({
  title: "账户与安全 - 极物聊天",
  description: "账户与安全 - 极物聊天 开启你的极物之旅！",
  keywords: appKeywords,
});

const isAnim = ref(true);
const activeName = ref("security");

// Segmented 选项
const segmentOptions = [
  { label: "账号", value: "security" },
  { label: "安全管理", value: "account" },
  { label: "系统信息", value: "system" },
];

onActivated(() => {
  isAnim.value = false;
});
watch(activeName, () => {
  isAnim.value = true;
});

// 滑动切换逻辑，不能超过边界，到两边停止
function handleSwipeNext() {
  const currentIndex = segmentOptions.findIndex(option => option.value === activeName.value);
  if (currentIndex < segmentOptions.length - 1) {
    activeName.value = segmentOptions[currentIndex + 1]?.value ?? "";
  }
}

function handleSwipePrev() {
  const currentIndex = segmentOptions.findIndex(option => option.value === activeName.value);
  if (currentIndex > 0) {
    activeName.value = segmentOptions[currentIndex - 1]?.value ?? "";
  }
}
</script>

<template>
  <main class="w-full flex flex-1 flex-col card-bg-color p-4 pt-6 sm:(bg-color p-6 pt-10)">
    <CommonPageHeader title="账户与安全" icon="i-solar:lock-keyhole-bold-duotone" />

    <!-- Segmented 选择器 -->
    <div class="mt-4">
      <el-segmented v-model="activeName" :options="segmentOptions" />
    </div>

    <!-- 内容区域 -->
    <el-scrollbar
      v-swipe="{
        sensitivity: 2,
        onlyHorizontal: true,
        onSwipeLeft: handleSwipeNext,
        onSwipeRight: handleSwipePrev,
      }"
      class="hide-scrollbar mt-4 flex flex-1 flex-col overflow-hidden"
    >
      <!-- 账号 Tab -->
      <UserSafeUpdateCards v-show="activeName === 'security'" :is-anim="isAnim" />

      <!-- 安全管理 Tab -->
      <div v-show="activeName === 'account'" style="--anima: blur-in;--anima-duration: 200ms;" :data-fade="isAnim">
        <UserSafeDeviceList />
      </div>

      <!-- 系统信息 Tab -->
      <div v-show="activeName === 'system'" style="--anima: blur-in;--anima-duration: 200ms;" :data-fade="isAnim">
        <UserSafeSystemInfo />
      </div>
    </el-scrollbar>
  </main>
</template>

<style scoped lang="scss">
</style>
