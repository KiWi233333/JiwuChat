<script lang="ts" setup>
import { appKeywords, appName } from "~/constants";

useSeoMeta({
  title: `设置 - ${appName}`,
  description: "极物聊天 - 极物聊天 开启你的极物之旅！",
  keywords: appKeywords,
});

const user = useUserStore();
const setting = useSettingStore();

// 默认
const {
  isFullLoading,
  notificationTypeList,
  changeAnimateMode,
} = useSettingDefault();

const size = computed(() => {
  if (setting.settingPage.fontSize.value < 16) {
    return "small";
  }
  else if (setting.settingPage.fontSize.value >= 16 && setting.settingPage.fontSize.value <= 20) {
    return "default";
  }
  else if (setting.settingPage.fontSize.value > 20) {
    return "large";
  }
  else {
    return "default";
  }
});
</script>

<template>
  <el-scrollbar
    v-loading.fullscreen.lock="isFullLoading"
    class="h-full w-full flex-1 pt-8 bg-color-3 sm:card-bg-color-2"
    wrap-class="h-full w-full pb-4 sm:pb-20 flex flex-1 flex-col px-4"
    element-loading-text="更新中..."
    element-loading-background="transparent"
    :element-loading-spinner="defaultLoadingIcon"
  >
    <h3 flex items-center px-3 sm:px-4>
      设置
      <i i-solar:settings-bold ml-2 inline-block p0.6em opacity-60 hover:animate-spin />
    </h3>
    <!-- 主题与字体 -->
    <label class="title">主题与字体</label>
    <div class="box">
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
    <label class="title">通知与提醒</label>
    <div class="box">
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
    <!-- 功能与交互 -->
    <label class="title">功能与交互</label>
    <div class="box">
      <!-- 关闭动画 -->
      <div class="group h-8 flex-row-bt-c">
        流畅模式
        <el-tooltip
          :content="!setting.settingPage.isCloseAllTransition ? '开启动画' : '关闭动画'" placement="left"
          popper-style="padding: 0 0.5em;"
        >
          <el-switch
            v-model="setting.settingPage.isCloseAllTransition"
            class="transition-opacity hover:op-80"
            :size="size"
            inline-prompt @change="changeAnimateMode"
          />
        </el-tooltip>
      </div>
      <!-- 上下按键切换会话 -->
      <div v-if="!setting.isMobileSize" class="group h-8 flex-row-bt-c">
        切换会话
        <el-tooltip
          :content="!setting.downUpChangeContact ? '开启方向上下键切换' : '关闭方向上下键切换'" placement="left"
          popper-style="padding: 0 0.5em;"
        >
          <el-switch
            v-model="setting.downUpChangeContact"
            class="transition-opacity hover:op-80"
            :size="size"
            inline-prompt
          />
        </el-tooltip>
      </div>
      <!-- Esc -->
      <div v-if="setting.isDesktop" class="group h-8 flex-row-bt-c">
        ESC 最小化
        <el-switch
          v-model="setting.settingPage.isEscMin"
          class="transition-opacity hover:op-80"
          :size="size"
          :active-value="true"
          :inactive-value="false"
          inline-prompt @change="(val: string | number | boolean) => setting.settingPage.isEscMin = !!val"
        />
      </div>
    </div>
    <!-- 系统与更新 -->
    <label class="title">系统与更新</label>
    <div class="box">
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
        class="h-10 w-full rounded-4rem shadow sm:(ml-a h-fit w-fit) !card-bg-color" icon-class="i-solar:trash-bin-trash-outline" :transition-icon="true"
        style="--el-color-primary: var(--el-color-danger);--el-button-hover-border-color: var(--el-color-danger);background-color: inherit;"
        @click="setting.reset()"
      >
        重置
      </BtnElButton>
      <BtnElButton
        class="h-10 w-full rounded-4rem shadow sm:(ml-a h-fit w-fit)" icon-class="i-solar:logout-3-outline" type="danger" :transition-icon="true"
        style="margin-left: 0;"
        @click="user.exitLogin()"
      >
        退出登录
      </BtnElButton>
    </div>
  </el-scrollbar>
</template>

<style scoped lang="scss">
.title {
  --at-apply: "text-0.9em block px-3 tracking-0.1em mt-4 mb-2 sm:(px-4 mt-6 mb-3) ";
}
.box {
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
</style>
