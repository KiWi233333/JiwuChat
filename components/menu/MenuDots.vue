<script lang="ts" setup>
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
  {
    label: "重载应用",
    icon: "i-solar:restart-circle-outline",
    onClick: reloadPage,
  },
  {
    label: "切换主题",
    icon: computed(() => colorMode.value === "dark" ? "/images/icon/moon.svg" : "/images/icon/sun.svg"),
    customIconClass: "filter-grayscale-100",
    attrs: {
      id: DEFAULT_THEME_TOGGLE_ID,
    },
    onClick: () => {
      const modes = colorMode.preference === "dark" ? "light" : "dark";
      useModeToggle(modes);
      setting.settingPage.modeToggle.value = modes;
    },
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
    placement="bottom-end"
    :menu-list="menuList"
    trigger="click"
  >
    <template #reference>
      <slot name="btn">
        <BtnElButton
          text
          size="small"
          title="菜单"
          v-bind="$attrs"
        >
          <i class="i-solar:add-circle-outline hover:i-solar:add-circle-bold" />
        </BtnElButton>
      </slot>
    </template>
  </MenuPopper>
</template>

<style lang="scss" scoped>
</style>
