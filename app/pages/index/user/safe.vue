<script lang="ts" setup>
import { appKeywords } from "@/constants/index";

useSeoMeta({
  title: "账户与安全 - 极物聊天",
  description: "账户与安全 - 极物聊天 开启你的极物之旅！",
  keywords: appKeywords,
});
definePageMeta({
  key: route => route.fullPath,
});

const isAnim = ref(true);
const activeName = ref("security");
onActivated(() => {
  isAnim.value = false;
});
watch(activeName, () => {
  isAnim.value = true;
});
</script>

<template>
  <main class="w-full flex flex-1 flex-col card-bg-color-2 p-4 pt-12 sm:(p-6 pt-10)">
    <h3 flex items-center>
      账户与安全
      <i i-solar:devices-bold-duotone ml-2 inline-block p0.6em opacity-60 />
    </h3>
    <el-tabs
      v-model="activeName"
      tab-position="top"
      class="tabs mt-6 flex-1 overflow-hidden rounded-2 bg-transparent"
    >
      <el-tab-pane name="security" label="账号" lazy>
        <UserSafeUpdateCards :data-fade="isAnim" />
      </el-tab-pane>
      <el-tab-pane name="account" label="安全管理" lazy>
        <UserSafeDeviceList :data-fade="isAnim" />
      </el-tab-pane>
      <el-tab-pane name="system" label="系统信息" lazy>
        <UserSafeSystemInfo :data-fade="isAnim" />
      </el-tab-pane>
    </el-tabs>
  </main>
</template>

<style scoped lang="scss">
.inputs {
  --at-apply: "transition-200 select-none opacity-80 group-hover:opacity-100";
}
:deep(.el-tabs.tabs) {
  .el-tab-pane {
    height: 100%;
    max-height: 100%;
  }
}
:deep(.el-radio-group.inputs) {
  border: 1px solid #7c7c7c33;
  border-radius: 1rem;

  .el-radio-button__inner {
    border: none;
    border-radius: 1rem;
    width: 100%;
  }
}

:deep(.el-select) {
  position: relative;
  z-index: 99;

  .el-input__wrapper {
    border-radius: 1rem;
  }

  .el-popper.el-select__popper {
    border-radius: 1rem;
    overflow: hidden;
  }

  .el-input__inner {
    padding-left: 0.5rem;
  }
}
</style>
