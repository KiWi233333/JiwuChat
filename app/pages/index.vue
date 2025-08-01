<script lang="ts" setup>
import { mitter, MittEventType } from "~/composables/utils/useMitt";
import { appName } from "~/constants";

const user = useUserStore();
const setting = useSettingStore();
const chat = useChatStore();
const showGroupDialog = computed({
  get() {
    return chat.inviteMemberForm.show;
  },
  set(val) {
    chat.inviteMemberForm = val
      ? {
          ...chat.inviteMemberForm,
          show: true,
        }
      : {
          show: false,
          roomId: undefined,
          uidList: [],
        };
  },
});

// 监听消息
useMsgLinear();

// 页面过渡
const pageTransition = computed(() => (setting.isMobileSize && !setting.settingPage.isCloseAllTransition) ? (setting.settingPage.animation.pageTransition ? chat.pageTransition : false) : false);

// 好友申请弹窗状态
const isShowApply = ref(false);
const applyUserId = ref<string | undefined>();
// 检查用户是否绑定了邮箱或手机号
function checkUserBindingStatus() {
  // 如果用户已登录
  if (user.isLogin) {
    // 检查是否已绑定邮箱和手机号
    const isEmailBound = user.userInfo.isEmailVerified === isTrue.TRUE;
    const isPhoneBound = user.userInfo.isPhoneVerified === isTrue.TRUE;

    // 如果邮箱和手机号都未绑定
    if (!isEmailBound && !isPhoneBound) {
      // 获取上次提醒时间
      const lastRemindTime = localStorage.getItem(`${user.userId}_lastBindingRemindTime`);
      const now = new Date().toDateString();

      // 如果没有提醒过或者上次提醒不是今天
      // console.log("提醒时间", lastRemindTime, now);
      if (!lastRemindTime || lastRemindTime !== now) {
        // 显示提醒对话框
        ElMessageBox.confirm(
          "请绑定邮箱或手机号以提高账号安全性，是否前往绑定？",
          "账号安全",
          {
            confirmButtonText: "前往绑定",
            cancelButtonText: "稍后再说",
            type: "warning",
            center: true,
            customClass: "text-center",
          },
        ).then(() => {
          // 用户点击确认，跳转到安全设置页面
          navigateTo("/user/safe");
        }).catch(() => {
          // 用户点击取消，不做任何操作
        });

        // 更新提醒时间
        localStorage.setItem(`${user.userId}_lastBindingRemindTime`, now);
      }
    }
  }
}

// 初始化设置
watch(() => user.isLogin, (val) => {
  if (val) {
    setting.loadSettingPreData();
  }
}, {
  immediate: true,
});

// 监听好友申请弹窗事件
onMounted(() => {
  // 监听好友申请弹窗事件
  mitter.on(MittEventType.FRIEND_APPLY_DIALOG, (payload) => {
    isShowApply.value = payload.show;
    applyUserId.value = payload.userId;
  });

  // 登录后检查绑定状态
  checkUserBindingStatus();
});

// 组件卸载时移除事件监听
onUnmounted(() => {
  mitter.off(MittEventType.FRIEND_APPLY_DIALOG);
});
</script>

<template>
  <main
    v-loading.fullscreen.lock="!user.isLogin"
    class="main relative flex flex-col !overflow-hidden"
    element-loading-text="退出登录中..."
    element-loading-background="transparent"
    :element-loading-spinner="defaultLoadingIcon"
  >
    <div
      v-if="user.isLogin"
      class="h-full flex flex-1 flex-col overflow-hidden"
    >
      <MenuHeaderMenuBar nav-class="relative z-999 left-0 w-full top-0 ml-a h-3.5rem w-full flex flex-shrink-0 select-none items-center justify-right gap-4 rounded-b-0 px-3 sm:(absolute right-0 top-0  p-1 ml-a h-3.125rem h-fit border-b-0 !bg-transparent) border-default-b bg-color">
        <template #center="{ appTitle }">
          <!-- 移动端菜单 -->
          <div v-if="setting.isMobile" class="absolute-center-center block tracking-0.1em sm:hidden" :data-tauri-drag-region="setting.isDesktop">
            {{ appTitle || appName }}
          </div>
          <!-- 连接状态 -->
          <!-- <BtnWsStatusBtns v-if="showWsStatusBtns" class="offline" /> -->
        </template>
      </MenuHeaderMenuBar>
      <div
        class="relative h-1 max-h-full flex flex-1"
      >
        <MenuChatMenu v-if="!setting.isMobileSize" class="w-fit shrink-0 !hidden !sm:flex" />
        <!-- 缓存 页面内容 -->
        <NuxtPage
          keepalive
          :transition="pageTransition"
        />
      </div>
    </div>
    <!-- 邀请进群 -->
    <LazyChatNewGroupDialog
      v-model="showGroupDialog"
      hydrate-on-idle
      :form="chat.inviteMemberForm"
    />
    <!-- 视频播放器 -->
    <LazyUtilVideoPlayerDialog
      v-model="chat.showVideoDialog"
      hydrate-on-idle
    />
    <!-- 扩展菜单 -->
    <LazyMenuExtensionMenu
      v-model:show="chat.showExtension"
      hydrate-on-idle
    />
    <!-- RTC通话弹窗 -->
    <LazyChatRtcCallDialog
      v-model="chat.showRtcCall"
      v-model:call-type="chat.rtcCallType"
      hydrate-on-idle
    />
    <!-- 移动端菜单 - 小屏幕才加载 -->
    <LazyMenuBottomMenu
      v-if="setting.isMobileSize && user.isLogin && chat.isOpenContact"
      hydrate-on-media-query="(max-width: 768px)"
      class="grid sm:hidden"
    />
    <!-- 好友申请弹窗 -->
    <LazyChatFriendApplyDialog
      v-model:show="isShowApply"
      :user-id="applyUserId"
      hydrate-on-idle
    />
  </main>
</template>

<style lang="scss" scoped>
.main:hover {
  .offline {
    :deep(.btns) {
      --at-apply: "scale-100 op-100";
    }
  }
}
</style>
