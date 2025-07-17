<script lang="ts" setup>
import type { Component } from "vue";
import { SettingAppearance, SettingFunction, SettingNotification, SettingShortcuts, SettingStorage, SettingSystem, SettingTools } from "#components";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { appKeywords, appName } from "~/constants";
import { IS_PROD } from "~/init/setting";


const {
  menuBar = true,
} = defineProps<{
  menuBar?: boolean;
  mainClass?: string;
  menuClass?: string;
}>();
useHead({
  title: `设置 - ${appName}`,
  meta: [
    { name: "description", content: `配置 ${appName} 的环境变量和其他设置` },
    { name: "keywords", content: appKeywords },
  ],
});
definePageMeta({
  key: route => route.path,
});
interface MenuItem {
  label: string;
  value: string;
  icon: string;
  activeIcon: string;
  component: Component
}
const menuOptions: MenuItem[] = [
  { label: "通知", value: "notification", icon: "i-solar:bell-outline", activeIcon: "i-solar:bell-bold light:op-70", component: SettingNotification },
  { label: "主题与字体", value: "appearance", icon: "i-solar:pallete-2-line-duotone", activeIcon: "i-solar:pallete-2-bold", component: SettingAppearance },
  { label: "快捷键", value: "shortcut", icon: "i-solar:keyboard-line-duotone", activeIcon: "i-solar:keyboard-bold", component: SettingShortcuts },
  { label: "工具", value: "tools", icon: "i-solar:inbox-archive-line-duotone", activeIcon: "i-solar:inbox-archive-bold", component: SettingTools },
  { label: "新特性", value: "function", icon: "i-solar:telescope-outline", activeIcon: "i-solar:telescope-bold", component: SettingFunction },
  { label: "存储管理", value: "storage", icon: "i-solar:database-outline", activeIcon: "i-solar:database-bold", component: SettingStorage },
  { label: "系统与更新", value: "system", icon: "i-solar:server-square-update-linear", activeIcon: "i-solar:server-square-update-bold", component: SettingSystem },
];
const MENU_OPTIONS_LABEL_MAX_LENGTH = 5;
const activeMenu = ref("");
const activeItem = computed(() => menuOptions.find(item => item.value === activeMenu.value));

const setting = useSettingStore();

const size = computed(() => {
  if (setting.settingPage?.fontSize?.value < 16) {
    return "small";
  }
  else if (setting.settingPage?.fontSize?.value >= 16 && setting.settingPage?.fontSize?.value <= 20) {
    return "default";
  }
  else if (setting.settingPage?.fontSize?.value > 20) {
    return "large";
  }
  else {
    return "default";
  }
});

const scrollbarRef = useTemplateRef("scrollbarRef");
const timer = shallowRef<NodeJS.Timeout>();
const showAnima = ref(false);

async function onHashHandle() {
  await nextTick();
  if (!document || !document.location.hash)
    return;
  const dom = document.querySelector(window.location.hash) as HTMLElement;
  if (!dom || showAnima.value)
    return;
  showAnima.value = true;
  let top = 0;
  // 获取滚动容器高度
  const wrapHeight = scrollbarRef.value?.wrapRef?.clientHeight || 0;
  // 获取目标元素相对于父容器的偏移量
  const domRect = dom.getBoundingClientRect();
  const wrapRect = scrollbarRef.value?.wrapRef?.getBoundingClientRect();
  const offsetTop = domRect.top - (wrapRect?.top || 0);
  // 计算滚动位置,使目标元素在容器中间
  top = offsetTop - (wrapHeight / 2) + (domRect.height / 2);
  clearTimeout(timer.value);
  if (top !== 0) { // 缓动
    scrollbarRef.value?.wrapRef?.scrollTo({
      top,
      behavior: "smooth",
    });
  }
  dom.classList.add("setting-hash-anim");
  timer.value = setTimeout(() => {
    dom.classList.remove("setting-hash-anim");
    timer.value = undefined;
    showAnima.value = false;
  }, 2000);
}

watch(() => setting.isMobileSize, (val: boolean) => {
  if (!activeMenu.value) {
    activeMenu.value = val ? "" : "notification";
  }
}, {
  immediate: true,
});

onActivated(onHashHandle);
onMounted(() => {
  onHashHandle();
  if (setting.isDesktop) { // 窗口大小
    getCurrentWebviewWindow().setSize(new LogicalSize(920, 820));
  }
});
onDeactivated(() => {
  clearTimeout(timer.value);
  showAnima.value = false;
  timer.value = undefined;
});
onUnmounted(() => {
  clearTimeout(timer.value);
  showAnima.value = false;
  timer.value = undefined;
});
</script>

<template>
  <div
    :class="{
      'user-none': IS_PROD,
    }"
    class="h-full flex flex-col"
  >
    <MenuHeaderMenuBar v-if="menuBar" nav-class="relative z-999 shadow left-0 w-full top-0 ml-a h-3.5rem w-full flex flex-shrink-0 items-center justify-right gap-4 rounded-b-0 px-3 sm:(absolute shadow-none right-0 top-0  p-1 ml-a h-3.125rem h-fit border-b-0 !bg-transparent) border-default-2-b bg-color">
      <template #center="{ appTitle }">
        <!-- 移动端菜单 -->
        <div v-if="setting.isMobile" class="absolute-center-center block tracking-0.1em sm:hidden" :data-tauri-drag-region="setting.isDesktop">
          {{ appTitle || appName }}
        </div>
      </template>
      <template #right>
        <div class="right relative z-1 flex items-center gap-1 sm:gap-2">
          <template v-if="setting.isDesktop || setting.isWeb">
            <!-- web下载推广菜单 -->
            <BtnAppDownload />
            <!-- 菜单按钮 -->
            <MenuController v-if="!['android', 'web', 'ios'].includes(setting.appPlatform)" size="small" />
          </template>
        </div>
      </template>
    </MenuHeaderMenuBar>
    <main :class="mainClass" class="h-full flex-1 sm:flex">
      <menu class="h-full w-full bg-color sm:(max-w-14rem min-w-fit border-default-2-r shadow)" :class="menuClass">
        <h3 flex items-center class="px-7 pt-8 text-lg">
          <i i-solar:settings-bold mr-2 inline-block p-3 opacity-60 hover:animate-spin />
          设置
        </h3>
        <el-segmented
          v-model="activeMenu"
          :options="menuOptions"
          direction="vertical"
          class="menu"
          :style="{ '--menu-options-label-max-length': MENU_OPTIONS_LABEL_MAX_LENGTH }"
          :size="setting.isMobileSize ? 'large' : 'small'"
        >
          <template #default="{ item }">
            <div class="selece-none flex items-center rounded-2 px-2 py-1">
              <i :class="activeMenu === (item as MenuItem).value ? (item as MenuItem).activeIcon : (item as MenuItem).icon" mr-2 />
              <div>{{ (item as MenuItem).label }}</div>
            </div>
          </template>
        </el-segmented>
      </menu>
      <el-scrollbar
        ref="scrollbarRef"
        class="fixed left-full top-0 h-full w-full flex-1 bg-color-3 pt-10 sm:card-bg-color-2 sm:!static"
        wrap-class="h-full w-full pb-4 sm:pb-20 flex flex-1 flex-col px-4"
        :class="{
          'settinlink-animated': showAnima,
          'left-0 z-1': showAnima,
        }"
      >
        <h3 v-if="activeItem" flex items-center border-default-2-b p-3 sm:p-4>
          {{ activeItem?.label }}
        </h3>
        <!-- 动态显示对应的设置组件 -->
        <component :is="activeItem?.component" v-if="activeItem" :key="activeItem.value" :size="size" class="w-full" />
      </el-scrollbar>
    </main>
  </div>
</template>

<style scoped lang="scss">
:deep(.el-segmented.menu) {
  --el-border-radius-base: 0.6rem;
  --el-segmented-item-selected-bg-color: transparent;
  --el-segmented-item-active-bg-color: ;
  --at-apply: "bg-transparent w-full p-4 text-color";


  .el-segmented__item-selected {
    --at-apply: "bg-color-2 text-color op-100";
  }
  .el-segmented__item:not(.is-disabled):not(.is-selected):active,
  .el-segmented__item:not(.is-disabled):not(.is-selected):hover {
    --at-apply: "bg-color-2 text-color !bg-op-50";
  }
  .el-segmented__item {
    --at-apply: "text-color";

    &.is-selected {
      --at-apply: "text-color op-100";
      i {
        --at-apply: "scale-110";
      }
    }
  }
}
:deep(.el-scrollbar__thumb) {
  background-color: transparent !important;
}

:deep(.select.el-select) {
  .el-select__wrapper {
    height: 1.8rem;
    min-height: 1.8rem;
    padding-top: 0;
    padding-bottom: 0;
  }
}
:deep(.el-slider__button) {
  width: 1rem;
  height: 1rem;
}
</style>

<style lang="scss">
.settinlink-animated {
  .setting-hash-anim {
    animation: border-shading 1s ease-in-out infinite !important;
  }
}
@keyframes border-shading {
  0% {
    border-color: transparent !important;
  }
  50% {
    border-color: var(--el-color-primary) !important;
  }
  100% {
    border-color: transparent !important;
  }
}
</style>
