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
</script>

<template>
  <main class="w-full flex flex-1 flex-col card-bg-color-2 p-4 pt-6 sm:(bg-color p-6 pt-10)">
    <h3 flex items-center text-base font-500>
      <i i-solar:lock-keyhole-bold-duotone mr-2 inline-block p-2.5 text-secondary hover:animate-spin />
      账户与安全
    </h3>

    <!-- Segmented 选择器 -->
    <div class="mt-4">
      <el-segmented v-model="activeName" :options="segmentOptions" />
    </div>

    <!-- 内容区域 -->
    <el-scrollbar class="hide-scrollbar mt-4 flex flex-1 flex-col overflow-hidden">
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
