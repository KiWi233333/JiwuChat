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
interface MenuItem {
  label: string;
  value: string;
  icon: string;
  activeIcon: string;
  component: Component
  hidden?: boolean
  tip?: string;
}
const setting = useSettingStore();

const menuOptions = computed<MenuItem[]>(() => [
  { label: "通知", tip: "系统通知、自定义铃声", value: "notification", icon: "i-solar:bell-outline", activeIcon: "i-solar:bell-bold light:op-70", component: SettingNotification },
  { label: "主题与字体", tip: "自定义主题和字体", value: "appearance", icon: "i-solar:pallete-2-line-duotone", activeIcon: "i-solar:pallete-2-bold", component: SettingAppearance },
  { label: "快捷键", tip: "快捷键自定义", value: "shortcut", hidden: setting.isMobileSize, icon: "i-solar:keyboard-line-duotone", activeIcon: "i-solar:keyboard-bold", component: SettingShortcuts },
  { label: "工具", tip: "翻译等工具", value: "tools", icon: "i-solar:inbox-archive-line-duotone", activeIcon: "i-solar:inbox-archive-bold", component: SettingTools },
  { label: "新特性", tip: "自定义动画、窗口阴影", value: "function", icon: "i-solar:telescope-outline", activeIcon: "i-solar:telescope-bold", component: SettingFunction },
  { label: "数据与存储", tip: "数据与存储情况、文件情况、缓存清理", value: "storage", icon: "i-solar:database-outline", activeIcon: "i-solar:database-bold", component: SettingStorage },
  { label: "系统与更新", tip: "开机自启、系统应用更新", value: "system", icon: "i-solar:server-square-update-linear", activeIcon: "i-solar:server-square-update-bold", component: SettingSystem },
].filter(item => !item.hidden));
const MENU_OPTIONS_LABEL_MAX_LENGTH = 5;
const activeMenu = ref("");
const activeItem = computed(() => menuOptions.value.find(item => item.value === activeMenu.value));

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

watch(() => setting.isMobileSize, (mobileSize: boolean) => {
  if (activeMenu.value && !setting.isMobileSize) {
    return;
  }
  activeMenu.value = mobileSize ? "" : "notification";
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
    id="setting-page"
    :class="{
      'user-none': IS_PROD,
    }"
    class="h-full flex flex-col bg-color-3 sm:bg-color"
  >
    <MenuHeaderMenuBar v-if="menuBar" nav-class="relative h-fit z-1001 shadow left-0 w-full top-0 ml-a h-3.5rem w-full flex flex-shrink-0 items-center justify-right gap-4 rounded-b-0 px-3 sm:(absolute shadow-none right-0 top-0  p-1 ml-a h-3.125rem h-fit border-b-0 !bg-transparent) border-default-2-b bg-color">
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
    <main :class="mainClass" class="relative h-full flex-1 sm:flex">
      <menu
        class="transition-anima h-full w-full sm:(max-w-14rem min-w-fit border-default-2-r shadow-lg)"
        :class="[
          menuClass,
          activeItem?.value && setting.isMobileSize ? '-translate-x-1/2 css-will-change' : '',
        ]"
      >
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
            <div class="flex items-center rounded-2 px-2 py-1" :title="(item as MenuItem).tip">
              <i :class="activeMenu === (item as MenuItem).value ? (item as MenuItem).activeIcon : (item as MenuItem).icon" mr-2 />
              <div>{{ (item as MenuItem).label }}</div>
              <i i-solar:alt-arrow-right-line-duotone ml-a inline p-2.4 text-small sm:hidden />
            </div>
          </template>
        </el-segmented>
      </menu>
      <el-scrollbar
        ref="scrollbarRef"
        class="transition-anima left-0 top-0 h-full w-full flex-1 bg-color-3 pt-4 shadow-lg !fixed !z-1000 sm:(z-1 card-bg-color-2 pt-10 shadow-none transition-none) !sm:static"
        wrap-class="h-full w-full pb-4 sm:pb-20 flex flex-1 flex-col px-4"
        :class="{
          'settinlink-animated': showAnima,
          'translate-x-full css-will-change': !activeMenu,
        }"
      >
        <h3 v-if="activeItem" class="flex cursor-pointer items-center border-default-2-b py-3 sm:p-4" @click="setting.isMobileSize && (activeMenu = '')">
          <i i-solar:alt-arrow-left-line-duotone mr-1 p-3 sm:hidden />
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
    --at-apply: "bg-color-2 text-color";
  }
  .el-segmented__item:not(.is-disabled):not(.is-selected):active,
  .el-segmented__item:not(.is-disabled):not(.is-selected):hover {
    --at-apply: "bg-color-2 text-color !bg-op-50";
  }
  .el-segmented__item {
    &.is-selected {
      --at-apply: "text-color";
      i {
        --at-apply: "scale-105";
      }
    }
  }

  // 小尺寸上
  @media screen and (max-width: 640px) {

    .el-segmented__group {
      --at-apply: "rounded-2 py-2 bg-color overflow-hidden shadow-sm";
    }

    .el-segmented__item-selected {
      --at-apply: "op-0";
    }

    .el-segmented__item:not(.is-disabled):not(.is-selected):active,
    .el-segmented__item:not(.is-disabled):not(.is-selected):hover {
      --at-apply: "bg-color  !bg-op-50";
    }

    .el-segmented__item {
      --at-apply: " bg-color text-sm";

      &.is-selected {
        --at-apply: "bg-color ";
        i {
          --at-apply: "scale-110";
        }
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
.transition-anima {
  transition: transform 0.3s ease-in-out;
}
.css-will-change {
  will-change: transform;
}
</style>
