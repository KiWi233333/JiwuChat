<script lang="ts" setup>
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { appDescription, appKeywords } from "@/constants/index";

const setting = useSettingStore();
const user = useUserStore();

useSeoMeta({
  title: "登录 - 极物聊天",
  description: appDescription,
  keywords: appKeywords,
});

definePageMeta({
  key: route => route.fullPath,
  layout: "default",
});


onMounted(() => {
  initWindowAnimate();
});

/**
 * 初始化窗口动画
 */
function initWindowAnimate() {
  user.showLoginPageType = "login";
  if (setting.isDesktop) {
    const wind = getCurrentWindow();
    watch(() => user.showLoginPageType, async (val) => {
      if (val !== "") {
        // 关闭窗口动画
        const height = 480;
        if (setting.settingPage.isCloseAllTransition || setting.osType === "macos") { // mac动态变化有问题
          wind?.setSize(new LogicalSize(340, height));
          return;
        }
        // 窗口动画
        invoke("animate_window_resize", {
          windowLabel: LOGIN_WINDOW_LABEL,
          toWidth: 340,
          toHeight: height,
          duration: 160,
          steps: 12,
        }).catch((err: any) => console.error("窗口动画失败:", err));
      }
    }, {
      immediate: true,
    });
  }
}
</script>

<template>
  <div
    class="main-box relative overflow-hidden drop-shadow-color-blue-1"
    :class="{
      'img-none is-desktop': setting.isDesktop,
      'is-mobile': setting.isMobileSize,
      'show-register': user.showLoginPageType === 'register',
      'show-env-config': user.showLoginPageType === 'env-config',
    }"
  >
    <!-- 背景 -->
    <Teleport to="body">
      <div v-if="setting.isWeb && !setting.isMobileSize" class="fixed left-0 top-0 h-full w-full -z-1">
        <LazyOtherLoginBg
          :enable-rainbow="false"
          :grid-color="$colorMode.value === 'dark' ? '#7429ff' : '#000000'"
          :ripple-intensity="0.02"
          :grid-size="20"
          :fade-distance="1"
          :grid-thickness="30"
          :vignette-strength="$colorMode.value === 'dark' ? 2 : 1"
          :mouse-interaction="false"
          :opacity="$colorMode.value === 'dark' ? 0.6 : 0.1"
        />
      </div>
      <ClientOnly>
        <div
          :data-tauri-drag-region="setting.isDesktop"
          class="controls absolute right-0 top-0 z-1000 w-100vw flex items-center gap-2"
          :class="{
            'cursor-move': setting.isDesktop,
          }"
        >
          <!-- 标题 -->
          <HeadrHeaderLogo v-if="!setting.isMobileSize" class="ml-4" />
          <!-- 菜单按钮 -->
          <div class="group ml-a flex flex items-center gap-2 p-2 sm:px-3">
            <BtnTheme
              :class="setting.isDesktop ? 'op-50 h-1.5rem w-2rem card-rounded-df group-hover:op-100' : ' h-2rem w-2rem rounded-1/2 card-default border-default' "
              title="切换主题"
            />
            <BtnEnvConfig
              :class="setting.isDesktop ? 'scale-90 op-50 group-hover:op-100' : ' !h-2rem !w-2rem  !card-bg-color rounded-1/2 !border-default' "
              :size="setting.isDesktop ? 'small' : ''"
              :icon-class="user.showLoginPageType === 'env-config' ? 'i-solar:settings-minimalistic-bold-duotone text-0.9em' : 'i-solar:settings-minimalistic-outline text-1em'"
              title="环境切换"
              @click="user.showLoginPageType = (user.showLoginPageType === 'env-config' ? 'login' : 'env-config')"
            />
            <BtnAppDownload />
            <MenuController v-if="setting.isDesktop && setting.appPlatform !== 'macos'" key="header" :size="setting.isDesktop ? 'small' : ''" :show-max="false" />
          </div>
        </div>
      </ClientOnly>
    </Teleport>
    <!-- 表单 -->
    <div
      class="flex select-none rounded-t-8 px-6 py-4 shadow-lg sm:(mt-0 h-full animate-none border-0 rounded-t-0 shadow-none)"
      :class="[
        setting.isDesktop ? 'w-full h-full !rounded-0 flex-row-c-c animate-none' : 'h-fit flex-row-c-c sm:static absolute bottom-0 left-0 w-full shadow-lg border-default-t',
        setting.isWeb && !setting.isMobileSize ? '' : 'login-bg',
        setting.isMobileSize ? 'min-h-62vh' : '',
      ]"
      data-fade
    >
      <div data-fades class="form-main mx-a my-a w-full text-center sm:px-4">
        <!-- 登录 -->
        <FormLoginForm
          v-if="user.showLoginPageType === 'login'"
          key="login-form"
          style="--anima: blur-in;"
          class="login-form"
        />
        <!-- 注册 -->
        <FormRegisterForm
          v-else-if="user.showLoginPageType === 'register'"
          key="register-form"
          style="--anima: blur-in;"
          :size="setting.isDesktop ? 'default' : 'large'"
          class="register-form"
        />
        <!-- 环境配置 -->
        <SettingEnvConfigForm
          v-else-if="user.showLoginPageType === 'env-config'"
          key="env-config-form"
          style="--anima: blur-in;"
          :size="setting.isDesktop ? 'default' : 'large'"
          class="env-config-form"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss">
body > .controls {
  --at-apply: "sm:(fixed top-0 left-0)";
}
</style>

<style lang="scss" scoped>
@media (max-width: 640px) {
  .main-box:not(.img-none) {
    background-image: url("https://oss.jiwuhub.top/user_bg/login_bg.jpg");
    background-repeat: no-repeat;
    background-position: top center;
    background-size: contain;
    overflow: hidden;
  }
}
.main-box {
  --el-border-radius-base: 0.5rem;

  :deep(.el-form) {
    --el-border-radius-base: 0.5rem;
  }
}
.main-box {
  --el-input-border: transparent;
  --el-border-radius-base: 0.5rem;
  :deep(.el-form) {
    --el-border-radius-base: 0.5rem;

    .el-button,
    .el-input-group__append,
    .el-input__wrapper {
      --el-input-bg-color: rgba(250, 250, 250, 0.95);
      --el-input-shadow: transparent;
      box-shadow: 0 0 0 1px rgba(133, 133, 133, 0.05) inset;
      &.is-focus {
        box-shadow: 0 0 0 1px var(--el-input-focus-border-color) inset;
      }
    }
  }
}
.dark .main-box {
  :deep(.el-form) {
    .el-input__wrapper {
      --el-input-bg-color: rgba(26, 26, 26, 0.4);
    }
  }
}

/* 适配桌面版 */
.is-desktop {
  .login-logo {
    --at-apply: " !static mb-4 p-0  flex-row-c-c";
    .logo {
      --at-apply: "w-8 h-8";
    }
  }
}

.env-config-form,
.login-form,
.register-form {
  --at-apply: "py-4 w-full";
}

.show-register {
  .login-logo {
    --at-apply: "hidden";
    .logo {
      --at-apply: "w-6 h-6";
    }
    .app-name {
      --at-apply: "text-1em";
    }
  }
}

.show-env-config {
  .login-logo {
    --at-apply: "hidden";
    .logo {
      --at-apply: "w-6 h-6";
    }
    .app-name {
      --at-apply: "text-1em";
    }
  }
}

/* 镜像渐变背景样式 */
.animated-background {
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 30% 20%, rgba(132, 98, 255, 0.3) 0%, rgba(135, 206, 235, 0.1) 25%, transparent 50%),
    radial-gradient(ellipse at 70% 80%, rgba(1132, 98, 255, 0.3) 0%, rgba(167, 143, 255, 0.1) 25%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba(173, 216, 230, 0.04) 0%, transparent 40%);
  background-size:
    120% 120%,
    140% 140%,
    160% 160%;
  animation: gradient-shift 15s ease-in-out infinite;
}

.is-mobile {
  .form-main {
    --at-apply: "min-h-52vh";
  }
}

.dark .animated-background {
  background: transparent;
  background-image: none;
  animation: none;
}

.login-bg {
  background-color: #f9f7ff;
  background-image:
    radial-gradient(closest-side, #e9e1ff, transparent), radial-gradient(closest-side, #e8e0ff, transparent),
    radial-gradient(closest-side, #f3e4ff, transparent), radial-gradient(closest-side, #fff6e8, transparent),
    radial-gradient(closest-side, #f6f3ff, transparent);
  background-size:
    130vmax 130vmax,
    80vmax 80vmax,
    90vmax 90vmax,
    110vmax 110vmax,
    90vmax 90vmax;
  background-position:
    -80vmax -80vmax,
    60vmax -30vmax,
    10vmax 10vmax,
    -30vmax -10vmax,
    50vmax 50vmax;
  background-repeat: no-repeat;
  animation: bg-animation 12s linear infinite;
}
.dark {
  .login-bg {
    background-color: #1f1f1f;
    background-image: none;
  }
}

@keyframes bg-animation {
  0%,
  100% {
    background-size:
      130vmax 130vmax,
      80vmax 80vmax,
      90vmax 90vmax,
      110vmax 110vmax,
      90vmax 90vmax;
    background-position:
      -80vmax -80vmax,
      60vmax -30vmax,
      10vmax 10vmax,
      -30vmax -10vmax,
      50vmax 50vmax;
  }
  25% {
    background-size:
      100vmax 100vmax,
      90vmax 90vmax,
      100vmax 100vmax,
      90vmax 90vmax,
      60vmax 60vmax;
    background-position:
      -60vmax -90vmax,
      50vmax -40vmax,
      0vmax -20vmax,
      -40vmax -20vmax,
      40vmax 60vmax;
  }
  50% {
    background-size:
      80vmax 80vmax,
      110vmax 110vmax,
      80vmax 80vmax,
      60vmax 60vmax,
      80vmax 80vmax;
    background-position:
      -50vmax -70vmax,
      40vmax -30vmax,
      10vmax 0vmax,
      20vmax 10vmax,
      30vmax 70vmax;
  }
  75% {
    background-size:
      90vmax 90vmax,
      90vmax 90vmax,
      100vmax 100vmax,
      90vmax 90vmax,
      70vmax 70vmax;
    background-position:
      -50vmax -40vmax,
      50vmax -30vmax,
      20vmax 0vmax,
      -10vmax 10vmax,
      40vmax 60vmax;
  }
}
</style>
