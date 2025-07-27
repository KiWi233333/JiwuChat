<script lang="ts" setup>
const user = useUserStore();
function exitForm() {
  user.showLoginPageType = "";
}

const [autoAnimateRef, enable] = useAutoAnimate({});
onMounted(() => {
  const setting = useSettingStore();
  enable(!setting.settingPage.isCloseAllTransition);
});
</script>

<template>
  <div>
    <transition name="fade">
      <div
        v-if="user.showLoginPageType !== ''"
        ref="autoAnimateRef"
        tag="div"
        name="popup"
        class="forms"
        relative
        @keyup.esc="exitForm"
        @click.self="exitForm"
      >
        <!-- 登录 -->
        <FormLoginForm v-if="user.showLoginPageType === 'login'" key="login-form" />
        <!-- 注册 -->
        <FormRegisterForm v-else-if="user.showLoginPageType === 'register'" key="register-form" />
        <!-- 找回密码 -->
        <!-- <FormRegisterForm key="form" v-if="user.showUpdatePwd" /> -->
      </div>
    </transition>
  </div>
</template>

<style scoped lang="scss">
.forms {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1002;
  background-color: rgba(70, 70, 70, 0.3);
  backdrop-filter: blur(4px);
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.dark .forms {
  background-color: rgba(20, 20, 20, 0.4);
}

// fade-in-out
.fadeInOutShadow-enter-active {
  animation: 0.2s fadeIn $animate-cubic;
}

.fadeInOutShadow-leave-active {
  animation: 0.2s fadeOut $animate-cubic;
}

.animate__animated {
  animation-duration: 0.2s;
}
</style>
