
<script lang="ts" setup>
import { removeRootClass, STOP_TRANSITION_KEY } from "~/init/setting";

// 模板页面
const user = useUserStore();
const setting = useSettingStore();

onMounted(() => {
  getwindowSharedData();
  removeRootClass(STOP_TRANSITION_KEY);
});
const { message } = useRouteAnnouncer({
  politeness: "assertive",
});
</script>

<template>
  <main
    v-loading.fullscreen.lock="!user.isLogin"
    class="h-full flex flex-col !overflow-hidden"
    element-loading-text="退出登录中..."
    element-loading-background="transparent"
    :element-loading-spinner="defaultLoadingIcon"
  >
    <div
      v-if="user.isLogin"
      class="relative h-full flex flex-col overflow-hidden"
    >
      <MenuHeaderMenuBar>
        <template #left>
          <!-- logo -->
          <div v-if="setting.osType !== 'macos'" class="left relative z-1000 flex-row-c-c gap-3 tracking-0.2em">
            <span class="hidden flex-row-c-c sm:flex">
              <CardElImage src="/logo.png" class="h-6 w-6" />
            </span>
            <strong hidden sm:block>{{ message }}</strong>
          </div>
          <div v-else class="left relative z-1000 flex-row-c-c gap-3 tracking-0.2em" />
        </template>
      </MenuHeaderMenuBar>
      <div
        class="main-box relative"
        v-bind="$attrs"
      >
        <!-- 缓存内容 -->
        <NuxtPage keepalive />
      </div>
    </div>
  </main>
</template>

<style lang="scss" scoped>
.main-box {
  --at-apply: "mx-a py-4 flex-1 w-full flex overflow-hidden p-0 bg-color";
  padding: 0 !important;
}
</style>
