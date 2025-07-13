<script lang="ts" setup>
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { appKeywords, appName } from "~/constants";

useSeoMeta({
  title: `设置 - ${appName}`,
  description: "极物聊天 - 极物聊天 开启你的极物之旅！",
  keywords: appKeywords,
});
definePageMeta({
  key: route => route.path,
});

const user = useUserStore();
const setting = useSettingStore();
const isWindow10 = ref(false);

// 默认
const {
  notificationTypeList,
  changeAnimateMode,
} = useSettingDefault();

// 定制化动画设置弹窗
const showCustomTransitionPanel = ref(false);

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

function checkWind10Shadow() {
  if (setting.isDesktop) {
    getCurrentWebviewWindow()?.setShadow(setting.settingPage.isWindow10Shadow);
  }
}

onActivated(onHashHandle);
onMounted(async () => {
  onHashHandle();
  const v = await useWindowsVersion();
  isWindow10.value = v === "Windows 10";
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
  <el-scrollbar
    ref="scrollbarRef"
    class="setting-page h-full w-full flex-1 bg-color-3 pt-10 sm:card-bg-color-2"
    wrap-class="h-full w-full pb-4 sm:pb-20 flex flex-1 flex-col px-4"
    :class="{ 'settinlink-animated': showAnima }"
  >
    <h3 flex items-center px-3 sm:px-4>
      设置
      <i i-solar:settings-bold ml-2 inline-block p0.6em opacity-60 hover:animate-spin />
    </h3>
    <!-- 主题与字体 -->
    <label class="title">主题与字体
      <!-- <i class="i-solar:palette-line-duotone ml-1 cursor-pointer p-2.2" /> -->
    </label>
    <div id="theme" class="box">
      <SettingTheme
        :input-props="{
          class: '!w-10rem sm:!w-12rem',
          size,
          id: DEFAULT_THEME_TOGGLE_ID,
        }"
      />
      <SettingFontFamily class="select !w-10rem sm:!w-12rem" :size="size" />
    </div>

    <!-- 通知与提醒 -->
    <label class="title">通知与提醒
      <!-- <i class="i-solar:bell-line-duotone ml-1 cursor-pointer p-2.2" /> -->
    </label>
    <div id="notification" class="box">
      <!-- 消息通知 -->
      <div class="group h-8 flex-row-bt-c">
        消息通知
        <el-segmented
          v-model="setting.settingPage.notificationType"
          class="inputs border-default"
          :size="size"
          style="background-color: transparent;--el-segmented-item-selected-color: #fff;--el-border-radius-base: 2rem;"
          :options="notificationTypeList"
        />
      </div>
      <!-- 通话铃声 -->
      <SettingBell />
    </div>
    <!-- 工具 -->
    <label class="title">工具
      <!-- <i class="i-solar:box-linear ml-1 cursor-pointer p-2.2" /> -->
    </label>
    <div id="translation" class="box">
      <SettingTranslation class="select" :size="size" />
    </div>
    <!-- 快捷键管理 -->
    <SettingShortcuts v-if="!setting.isMobileSize || setting.isDesktop" :size="size" />
    <!-- 功能与交互 -->
    <label class="title">功能与交互
      <!-- <i class="i-solar:telescope-outline ml-1 cursor-pointer p-2.2" /> -->
    </label>
    <div id="function" class="box">
      <!-- 关闭动画 -->
      <div class="group h-8 flex items-center">
        流畅模式
        <BtnElButton
          class="ml-a mr-2 h-5 !border-default-hover"
          icon-class="i-solar:pen-2-bold text-1em mr-1"
          title="定制化动画"
          text bg round
          size="small"
          @click="showCustomTransitionPanel = true"
        />
        <el-switch
          v-model="setting.settingPage.isCloseAllTransition"
          class="transition-opacity hover:op-80"
          :size="size"
          inline-prompt
          :title="!setting.settingPage.isCloseAllTransition ? '关闭动画' : '开启动画'"
          @change="(val: string | number | boolean) => changeAnimateMode(!!val)"
        />
      </div>
      <!-- Window10阴影 -->
      <div v-if="setting.isDesktop && isWindow10" class="group h-8 flex items-center">
        窗口阴影
        <span class="tip mx-2 border-default rounded-8 px-2 py-0.2em text-mini">Window 10</span>
        <el-switch
          v-model="setting.settingPage.isWindow10Shadow"
          :title="!setting.settingPage.isWindow10Shadow ? '开启窗口阴影，Windows 10 不兼容圆角' : '关闭窗口阴影，窗口采用圆角'" placement="left"
          class="ml-a transition-opacity hover:op-80"
          :size="size"
          inline-prompt
          @change="checkWind10Shadow"
        />
      </div>
    </div>
    <!-- 系统与更新 -->
    <label class="title">系统与更新</label>
    <div id="system" class="box">
      <!-- 自启动 -->
      <SettingAutoStart v-if="setting.isDesktop" :size="size" />
      <!-- 下载路径 -->
      <SettingDownLoad v-if="!setting.isWeb" />
      <!-- 版本更新 -->
      <SettingVersionDialog />
    </div>
    <div class="btns">
      <BtnElButton
        title="重置并清理缓存"
        class="h-10 w-full shadow sm:(ml-a h-fit w-fit rounded-4rem) !card-bg-color" icon-class="i-solar:trash-bin-trash-outline" :transition-icon="true"
        style="--el-color-primary: var(--el-color-danger);--el-button-hover-border-color: var(--el-color-danger);background-color: inherit;"
        @click="setting.reset()"
      >
        重置
      </BtnElButton>
      <BtnElButton
        class="h-10 w-full shadow sm:(ml-a h-fit w-fit rounded-4rem)" icon-class="i-solar:logout-3-outline" type="danger" :transition-icon="true"
        style="margin-left: 0;"
        @click="user.exitLogin()"
      >
        退出登录
      </BtnElButton>
    </div>
    <SettingAnimationOptDialog
      v-model:show="showCustomTransitionPanel"
      :size="size"
    />
  </el-scrollbar>
</template>

<style scoped lang="scss">
.title {
  --at-apply: "text-0.9em block px-3 tracking-0.1em mt-4 mb-2 sm:(px-4 mt-6 mb-3) ";
}
.box {
  border: 1px solid transparent;
  --at-apply: "text-0.9em card-rounded-df bg-white dark:bg-dark shadow p-3 sm:p-4 flex flex-col gap-3";

  .inputs {
    --at-apply: "w-10rem sm:w-12rem";
  }
}

:deep(.el-scrollbar__thumb) {
  background-color: transparent !important;
}

:deep(.el-segmented) {
  height: 1.8rem;
  min-height: 1.8rem;
  line-height: 1.8rem;
  // --el-segmented-padding: 2px;
  .el-segmented__item-label {
    font-size: 0.86rem;
  }
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
.btns {
  background-image: linear-gradient(to bottom, transparent 0%, #fff 70%);
  --at-apply: "w-full  mt-a  flex flex-col items-center gap-4 sm:flex-row static sm:(absolute p-4 bottom-0) py-6 z-1 right-0";

  :deep(.el-button) {
    span {
      font-size: 0.8rem;
    }
  }
}
.dark .btns {
  background-image: linear-gradient(to bottom, transparent 0%, #111111 70%);
}
@media screen and (max-width: 768px) {
  .btns {
    background-image: none !important;
  }
}

.setting-group {

  .title {
    --at-apply: "text-0.9em block px-3 tracking-0.1em mt-4 mb-2 sm:(px-4 mt-6 mb-3) ";
  }
  .box {
    border: 1px solid transparent;
    --at-apply: "text-0.9em card-rounded-df bg-white dark:bg-dark shadow px-3 sm:px-4 py-2 flex flex-col gap-3";

    .inputs {
      --at-apply: "w-10rem sm:w-12rem";
    }
    .setting-item {
      --at-apply: "h-8 text-sm flex-row-bt-c";
    }
  }

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
