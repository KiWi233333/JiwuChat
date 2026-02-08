<script lang="ts" setup>
import { appName } from "@/constants/index";

const {
  navClass = "z-999 h-3rem relative left-0 top-0 flex-row-bt-c select-none gap-4 rounded-b-0 px-3 border-default-b bg-color pl-4 pr-2 border-default-b",
} = defineProps<{
  navClass?: string
}>();

const setting = useSettingStore();
const route = useRoute();

const getAppTitle = computed(() => {
  if (route.path === "/")
    return appName;
  else if (route.path === "/friend")
    return "联系人";
  else if (route.path === "/ai")
    return "AI";
  else if (route.path.startsWith("/user"))
    return "";
  else if (route.path === "/user/safe")
    return "账号与安全";
  else if (route.path === "/setting")
    return "设置";
});
</script>

<template>
  <menu class="group min-h-6" :class="navClass">
    <slot name="left" />

    <!-- 拖拽区域 -->
    <div class="absolute left-0 top-0 z-0 h-full w-full flex-row-c-c" :data-tauri-drag-region="setting.isDesktop">
      <slot name="drag-content" />
    </div>

    <slot name="center" :app-title="getAppTitle" />

    <slot name="search-contact" />

    <!-- 菜单栏右侧 -->
    <slot name="right">
      <div class="right relative z-1 flex items-center gap-2">
        <!-- 桌面更新菜单 -->
        <SettingUpdater v-if="$route.path !== '/setting'" />
        <!-- 下载（部分端） -->
        <BtnDownload v-if="!setting.isWeb" icon-class="block mx-1 w-5 h-5" />

        <!-- 折叠菜单 -->
        <MenuDots v-if="$route.path.startsWith('/extend')">
          <template #btn>
            <div
              text
              class="mx-1 w-2.2em flex-row-c-c btn-primary"
              size="small"
              title="菜单"
            >
              <i class="i-solar:hamburger-menu-outline" />
            </div>
          </template>
        </MenuDots>

        <template v-if="setting.isDesktop || setting.isWeb">
          <!-- web下载推广菜单 -->
          <BtnAppDownload />
          <!-- 菜单按钮 -->
          <template v-if="setting.isDesktop && setting.appPlatform !== 'macos'">
            <MenuController size="small">
              <template #start="{ data }">
                <ElButton
                  text
                  size="small"
                  :style="data.btnStyle"
                  @click="data.handleWindow('alwaysOnTop')"
                >
                  <i
                    :title="data.isAlwaysOnTopVal ? '取消置顶' : '置顶'"
                    class="i-solar:pin-broken cursor-pointer text-0.8em transition-200"
                    :class="data.isAlwaysOnTopVal ? ' mb-1 color-theme-warning -rotate-45' : 'mb-0 btn-primary'"
                  />
                </ElButton>
                <div class="mx-1 h-1.2em border-default-l" />
              </template>
            </MenuController>
          </template>
        </template>
      </div>
    </slot>
  </menu>
</template>

<style lang="scss" scoped>
.dark .nav {
  backdrop-filter: blur(1rem);
  background-size: 3px 3px;
}
</style>
