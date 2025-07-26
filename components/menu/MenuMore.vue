<script lang="ts" setup>
import { FriendOptType } from "~/composables/api/chat/friend";
import { applyUserSearchInputDomId } from "~/composables/utils/chat";
import { DEFAULT_THEME_TOGGLE_ID, useModeToggle } from "~/composables/utils/useToggleThemeAnima";
import { appBlogHost } from "~/constants";

const setting = useSettingStore();
const user = useUserStore();
const chat = useChatStore();

const isPageReload = ref(false);
function reloadPage() {
  isPageReload.value = true;
  location.reload();
  setTimeout(() => {
    isPageReload.value = false;
  }, 500);
}

// 跳转好友页面
async function toFriendPage() {
  await nextTick();
  await navigateTo("/friend");
  setTimeout(async () => {
    chat.setTheFriendOpt(FriendOptType.Empty);
    const com = document?.getElementById?.(applyUserSearchInputDomId);
    if (com) {
      com?.focus();
    }
  }, 200);
}

const colorMode = useColorMode();

// @unocss-include
const menuList = reactive([
  {
    label: "添加好友",
    icon: "i-tabler:user-plus",
    hidden: computed(() => !setting.isMobileSize),
    onClick: () => {
      toFriendPage();
    },
  },
  {
    label: "发起群聊",
    icon: "i-solar:chat-round-dots-outline",
    hidden: computed(() => !setting.isMobileSize),
    onClick: () => {
      chat.inviteMemberForm = {
        show: true,
        roomId: undefined,
        uidList: [],
      };
    },
  },
  // {
  //   label: "重载应用",
  //   icon: "i-solar:restart-circle-outline",
  //   attrs: { title: "刷新页面" },
  //   onClick: reloadPage,
  // },
  {
    label: computed(() => user.userInfo?.nickname),
    icon: computed(() => BaseUrlImg + user.userInfo?.avatar),
    customIconClass: "rounded-full",
    attrs: {
      class: "max-w-10em truncate",
      title: computed(() => `${user.userInfo?.nickname} - 前往主页`),
    },
    onClick: () => navigateTo("/user"),
  },
  {
    label: computed(() => colorMode.value === "light" ? "浅色主题" : "深色主题"),
    icon: computed(() => colorMode.value === "dark" ? "/images/icon/moon.svg" : "/images/icon/sun.svg"),
    customIconClass: "filter-grayscale-100",
    attrs: {
      id: DEFAULT_THEME_TOGGLE_ID,
      title: computed(() => colorMode.value === "light" ? "切换到深色主题" : "切换到浅色主题"),
    },
    onClick: () => {
      const modes = colorMode.preference === "dark" ? "light" : "dark";
      useModeToggle(modes);
      setting.settingPage.modeToggle.value = modes;
    },
  },
  {
    label: "设置",
    icon: "i-solar:settings-outline",
    onClick: () => navigateTo("/setting"),
  },
  {
    label: "关于",
    icon: "i-solar:info-circle-outline",
    onClick: () => useOpenUrl(appBlogHost),
  },
  {
    label: "退出登录",
    icon: "i-solar:logout-3-broken",
    onClick: () => user.exitLogin(),
  },
]);
</script>

<template>
  <MenuPopper
    placement="right-end"
    :menu-list="menuList"
    trigger="click"
    v-bind="$attrs"
    :offset="16"
    fakeloading
    :show-arrow="false"
  >
    <template #reference>
      <slot name="default" />
    </template>
  </MenuPopper>
</template>

<style lang="scss" scoped>
:deep(.menu-list) {
  .menu-item {
    justify-content: start;
  }
}
</style>
