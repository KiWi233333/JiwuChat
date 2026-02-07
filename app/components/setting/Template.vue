<script lang="ts" setup>
/*
 * 设置页模板组件逻辑
 * - 设置页面头部 meta 信息
 * - 响应路由变化进行菜单高亮
 * - 支持移动端和桌面端不同跳转和交互
 * - 自动处理 hash 定位和焦点动画
 */

import { LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import MenuHeaderMenuBarDesktop from "~/components/menu/HeaderMenuBarDesktop.vue";
import MenuHeaderMenuBarMobile from "~/components/menu/HeaderMenuBarMobile.vue";
import { appKeywords, appName } from "~/constants";
import { IS_PROD } from "~/init/setting";

// 组件外部属性：控制顶部菜单栏显示、主区域和菜单栏自定义样式
const {
  menuBar = true,
} = defineProps<{
  menuBar?: boolean;
  mainClass?: string;
  menuClass?: string;
}>();

// 设置页面头部信息（title/关键词/描述等）
// title: 设置 - {appName} | 配置全局参数与偏好设置
useHead({
  title: `设置 - ${appName} | 配置全局参数与偏好设置`,
  meta: [
    { name: "description", content: `调整和管理 ${appName} 的系统参数、环境变量、外观与体验、通知和存储等核心设置。` },
    { name: "keywords", content: `${appKeywords}, 设置, 偏好, 主题, 通知, 存储, 系统, 更新` },
  ],
});

// 菜单项结构定义
interface MenuItem {
  label: string; // 菜单显示名
  value: string; // 路由参数
  icon: string; // 默认图标
  activeIcon: string; // 高亮图标
  hidden?: boolean; // 是否隐藏
  tip?: string; // 悬浮提示
  domId?: string; // DOM 元素 ID，用于哈希联动
}

// 获取全局设置和当前路由
const setting = useSettingStore();
const route = useRoute();

// 侧边菜单配置（支持动态隐藏菜单项）
const menuOptions = computed<MenuItem[]>(() => [
  { label: "通知", tip: "系统通知、自定义铃声", value: "notification", icon: "i-solar:bell-outline", activeIcon: "i-solar:bell-bold light:op-70", domId: "notification" },
  { label: "主题与字体", tip: "自定义主题和字体", value: "appearance", icon: "i-solar:pallete-2-line-duotone", activeIcon: "i-solar:pallete-2-bold", domId: "appearance" },
  { label: "音频设置", tip: "麦克风设备选择与管理", value: "audio-device", icon: "i-solar:microphone-3-line-duotone", activeIcon: "i-solar:microphone-3-bold", domId: "audio-device" },
  { label: "快捷键", tip: "快捷键自定义", value: "shortcut", hidden: setting.isMobileSize, icon: "i-solar:keyboard-line-duotone", activeIcon: "i-solar:keyboard-bold", domId: "shortcut" },
  { label: "工具", tip: "翻译等工具", value: "tools", icon: "i-solar:inbox-archive-line-duotone", activeIcon: "i-solar:inbox-archive-bold", domId: "tools" },
  { label: "新特性", tip: "自定义动画、窗口阴影", value: "function", icon: "i-solar:telescope-outline", activeIcon: "i-solar:telescope-bold", domId: "function" },
  { label: "数据与存储", tip: "数据与存储情况、文件情况、缓存清理", value: "storage", icon: "i-solar:database-outline", activeIcon: "i-solar:database-bold", domId: "storage" },
  { label: "系统与更新", tip: "开机自启、系统应用更新", value: "system", icon: "i-solar:server-square-update-linear", activeIcon: "i-solar:server-square-update-bold", domId: "system" },
].filter(item => !item.hidden));

// 菜单文字最大长度，避免布局溢出
const MENU_OPTIONS_LABEL_MAX_LENGTH = 5;

// 计算当前激活菜单 value，根据路由最后一个 segment
const activeMenu = computed({
  get: () => {
    const path = route.path.split("/").pop();
    // 判断当前路由 segment 是否为菜单项之一
    return menuOptions.value.some(item => item.value === path) ? path! : "";
  },
  set: (val) => {
    if (!val) {
      // 如未传入值，则跳转到父级路径
      const current = route.path.split("/").pop();
      if (current && menuOptions.value.some(item => item.value === current)) {
        const parentPath = route.path.slice(0, -(current.length + 1));
        navigateTo(parentPath || "/");
      }
    }
    else {
      // 跳转到新菜单
      const current = route.path.split("/").pop();
      if (menuOptions.value.some(item => item.value === current)) {
        // 当前路径已带有菜单项，替换最后一段
        const base = route.path.slice(0, -current!.length);
        navigateTo(base + val);
      }
      else {
        // 普通追加
        const base = route.path.endsWith("/") ? route.path : `${route.path}/`;
        navigateTo(base + val);
      }
    }
  },
});

// 当前激活的菜单项对象
const activeItem = computed(() => menuOptions.value.find(item => item.value === activeMenu.value));

// 滚动条引用、动画定时器与动画状态
const scrollbarRef = useTemplateRef("scrollbarRef");
const timer = shallowRef<NodeJS.Timeout>();
const showAnima = ref(false);

/**
 * 响应 url hash 变化，滚动并高亮目标元素
 * - 用于点击左侧菜单自动定位右侧内容
 */
async function onHashHandle() {
  await nextTick();
  if (!document || !document.location.hash)
    return;
  const dom = document.querySelector(window.location.hash) as HTMLElement;
  if (!dom || showAnima.value)
    return;
  showAnima.value = true;
  // 计算需要滚动的距离
  let top = 0;
  const wrapHeight = scrollbarRef.value?.wrapRef?.clientHeight || 0;
  const domRect = dom.getBoundingClientRect();
  const wrapRect = scrollbarRef.value?.wrapRef?.getBoundingClientRect();
  const offsetTop = domRect.top - (wrapRect?.top || 0);
  top = offsetTop - (wrapHeight / 2) + (domRect.height / 2);
  clearTimeout(timer.value);
  if (top !== 0) {
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

/**
 * 桌面端下：没有选中的情况下自动跳转到第一个菜单（通知）
 */
watch(() => setting.isMobileSize, (mobileSize) => {
  if (!mobileSize && !activeMenu.value) {
    // 桌面端无选中菜单，默认跳转到通知
    const path = route.path.endsWith("/") ? route.path : `${route.path}/`;
    navigateTo(`${path}notification`, { replace: true });
  }
}, { immediate: false });

/**
 * 监听路由变化，桌面端进入 /setting 根页面时自动补全
 */
watch(() => route.path, () => {
  if (!setting.isMobileSize && !activeMenu.value) {
    const path = route.path.endsWith("/") ? route.path : `${route.path}/`;
    navigateTo(`${path}notification`, { replace: true });
  }
});

// 生命周期钩子：激活/挂载时设置页面尺寸与目标滚动，高亮处理
onActivated(onHashHandle);
onMounted(() => {
  onHashHandle();
  // 桌面端强制 webview 窗口尺寸
  if (setting.isDesktop) {
    getCurrentWebviewWindow().setSize(new LogicalSize(920, 820));
  }
  // 桌面端无选中菜单，默认跳转到通知
  if (!setting.isMobileSize && !activeMenu.value) {
    const path = route.path.endsWith("/") ? route.path : `${route.path}/`;
    navigateTo(`${path}notification`, { replace: true });
  }
});
// 取消动画和定时器
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
      'stop-transition': showAnima,
    }"
    class="h-full flex flex-col select-none bg-color-2 sm:bg-color"
  >
    <component
      :is="setting.isMobileSize ? MenuHeaderMenuBarMobile : MenuHeaderMenuBarDesktop"
      v-if="menuBar"
      nav-class="relative h-fit z-1001 shadow left-0 w-full top-0 ml-a h-3.5rem w-full flex flex-shrink-0 items-center justify-right gap-4 rounded-b-0 px-3 sm:(absolute shadow-none right-0 top-0  p-1 ml-a h-3.125rem h-fit border-b-0 !bg-transparent) border-default-2-b bg-color"
    >
      <template #center="{ appTitle }">
        <!-- 移动端菜单 -->
        <div v-if="setting.isMobile" class="absolute-center-center block tracking-0.1em sm:hidden" :data-tauri-drag-region="setting.isDesktop">
          {{ appTitle || appName }}
        </div>
      </template>
      <template #right>
        <div class="right relative z-1 flex items-center gap-1 sm:gap-2">
          <template v-if="setting.isDesktop || setting.isWeb">
            <BtnAppDownload />
            <MenuController v-if="setting.isDesktop && setting.appPlatform !== 'macos'" size="small" />
          </template>
        </div>
      </template>
    </component>
    <main :class="mainClass" class="relative h-full flex-1 sm:flex">
      <menu
        class="h-full w-full transition-360 sm:(max-w-14rem min-w-fit border-default-2-r shadow-lg)"
        :class="[
          menuClass,
          activeItem?.value && setting.isMobileSize ? '-translate-x-1/2 scale-98 css-will-change' : '',
        ]"
      >
        <CommonPageHeader
          title="设置"
          icon="i-solar:settings-bold-duotone"
          :show-back-button="true"
          :back-target="{
            path: '/user',
            replace: true,
          }"
          class="px-5 pt-5 sm:(px-5 pt-10)"
        />
        <el-segmented
          v-model="activeMenu"
          :options="menuOptions"
          direction="vertical"
          class="menu"
          :style="{ '--menu-options-label-max-length': MENU_OPTIONS_LABEL_MAX_LENGTH }"
          :size="setting.isMobileSize ? 'large' : 'small'"
        >
          <template #default="{ item }">
            <div
              v-ripple="{ color: !setting.isMobileSize ? 'transparent' : 'rgba(var(--el-color-primary-rgb), 0.1)' }"
              class="item flex items-center rounded-2 px-2 py-1"
              :title="(item as MenuItem).tip"
            >
              <i :class="activeMenu === (item as MenuItem).value ? (item as MenuItem).activeIcon : (item as MenuItem).icon" mr-2 />
              <div>{{ (item as MenuItem).label }}</div>
              <i i-solar:alt-arrow-right-line-duotone ml-a inline p-2.4 text-small sm:hidden />
            </div>
          </template>
        </el-segmented>
      </menu>
      <el-scrollbar
        ref="scrollbarRef"
        class="left-0 top-0 h-full w-full flex-1 bg-color-3 pt-4 shadow-lg transition-360 !fixed !z-999 sm:(z-1 card-bg-color-2 pt-10 shadow-none) !sm:static !sm:transition-none"
        wrap-class="h-full w-full pb-4 sm:pb-20 flex flex-1 flex-col px-4"
        :class="{
          'settinlink-animated': showAnima,
          'translate-x-full': !activeMenu,
        }"
      >
        <CommonPageHeader
          v-if="activeItem"
          :title="activeItem?.label"
          :show-back-button="true"
          class="border-default-2-b pb-3 font-500 sm:p-4"
          @click="setting.isMobileSize && (activeMenu = '')"
        />
        <!-- 内容 -->
        <NuxtPage class="w-full" />
      </el-scrollbar>
    </main>
  </div>
</template>

<style scoped lang="scss">
:deep(.el-segmented.menu) {
  --el-border-radius-base: 0.6rem;
  --el-segmented-item-selected-bg-color: transparent;
  --at-apply: "bg-transparent w-full p-4 text-color !shadow-none";

  .el-segmented__item-selected {
    --at-apply: "bg-color-2 text-color shadow-none border-none";
  }
  .el-segmented__item:not(.is-disabled):not(.is-selected):active,
  .el-segmented__item:not(.is-disabled):not(.is-selected):hover {
    --at-apply: "bg-color-2 text-color !bg-op-50";
  }
  .el-segmented__item {
    --at-apply: "shadow-none p-0 border-none";

    .item {
      --at-apply: "py-2";
    }

    &.is-selected {
      --at-apply: "text-color";
      i {
        --at-apply: "scale-105";
      }
    }
  }

  .el-segmented__group {
    --at-apply: "gap-1";
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

      .item {
        --at-apply: "py-3 px-4";
      }

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
.css-will-change {
  will-change: transform;
}
</style>
