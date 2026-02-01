<script lang="ts" setup>
import type { MenuItemConfig } from "~/components/common/MenuItemCard.vue";
import { appName } from "@/constants";

const store = useUserStore();
const chat = useChatStore();
const setting = useSettingStore();
const route = useRoute();

const user = ref<Partial<UserInfoVO>>();
const isLoading = ref(true);
const isShowApply = ref(false);
const isFriend = ref(false);
const isSelf = ref(false);

const otherUserId = route.query?.id?.toString() || "";
const scrollbarRef = useTemplateRef("scrollbarRef");

async function init() {
  if (otherUserId && otherUserId !== store.userInfo?.id) {
    isSelf.value = false;
    const res = await getCommUserInfoSe(otherUserId, store.getToken);
    if (res.code === StatusCode.SUCCESS) {
      user.value = { id: otherUserId, ...res.data } as UserInfoVO;
    }
    await checkFriend(otherUserId);
  }
  else {
    isSelf.value = true;
    user.value = store.userInfo;
  }
  isLoading.value = false;
}

onActivated(() => {
  scrollbarRef.value?.setScrollTop(0);
});

async function checkFriend(val: string) {
  isFriend.value = false;
  try {
    const res = await isChatFriend({ uidList: [val] }, store.getToken);
    const data = res.data.checkedList.find((p: FriendCheck) => p.uid === val);
    isFriend.value = !!(data && data.isFriend === isTrue.TRUE);
  }
  catch {}
}

function handleApplyFriend() {
  isShowApply.value = true;
}

function deleteFriend() {
  deleteFriendConfirm(otherUserId, store.getToken, undefined, (done?: isTrue) => {
    if (done === isTrue.TRUE) {
      ElMessage.success("删除好友成功！");
      chat.setTheFriendOpt(FriendOptType.Empty, {});
    }
  });
}

// 设置菜单项配置
// @unocss-include
const settingMenuItems = computed<MenuItemConfig[]>(() => [
  {
    icon: "i-solar:user-id-bold-duotone text-mini op-50",
    title: "账号管理",
    path: "/user/safe",
    badge: {
      isDot: true,
      hidden: false,
    },
  },
  {
    icon: "i-solar:key-minimalistic-square-3-bold text-mini op-50",
    title: "API Key",
    path: "/api/key",
  },
  {
    icon: "i-solar:settings-minimalistic-bold text-mini op-50",
    title: "通用设置",
    path: "/setting",
    badge: {
      value: +setting.appUploader.isUpload,
      isDot: true,
      hidden: !setting.appUploader.isUpload,
    },
  },
]);

init();

useHead({
  title: () => `${isSelf.value ? "个人信息" : user?.value?.nickname} - 个人中心 - ${appName}`,
  meta: [
    {
      name: "description",
      content: () => `个人信息 - 个人中心 - ${appName}`,
    },
  ],
});
definePageMeta({
  key: route => route.fullPath,
});
</script>

<template>
  <el-scrollbar ref="scrollbarRef" class="h-full w-full flex flex-1 flex-col bg-color-2 sm:bg-color">
    <!-- 壁纸 -->
    <UserInfoBgToggle class="fixed left-0 top-0 z-0 w-full" :is-edit="isSelf" />
    <!-- 用户信息面板 -->
    <UserInfoPanel
      :data="user"
      :is-edit="isSelf"
      class="p-3 -mt-12 sm:p-4"
    />

    <!-- 设置区域 (仅自己可见) -->
    <div v-if="isSelf && setting.isMobileSize" class="mx-3 border-default-2 border-op-08 rounded-xl bg-color px-4 shadow-sm sm:mx-4">
      <CommonMenuItemList
        size="medium"
        :items="settingMenuItems"
        variant="list"
      />
    </div>

    <!-- 按钮 -->
    <div
      v-show="!isLoading && otherUserId"
      class="absolute bottom-0 left-0 w-full flex rounded-t-xl bg-color bg-op-90 p-4 backdrop-blur-8 sm:(static justify-center)"
    >
      <CommonElButton
        v-if="isFriend"
        key="delete"
        icon-class="i-solar:trash-bin-trash-outline p-2 mr-2"
        style="transition: .2s;text-align: center;letter-spacing: 1px;--el-color-primary: var(--el-color-danger);"
        plain
        size="large"
        class="flex-1 bg-color-2 sm:(w-8rem flex-none)"
        @click="deleteFriend"
      >
        删除好友&ensp;
      </CommonElButton>
      <CommonElButton
        v-if="isFriend"
        key="send"
        icon-class="i-solar:chat-line-bold p-2 mr-2"
        style="transition: .2s;text-align: center;letter-spacing: 1px;"
        type="primary"
        size="large"
        class="flex-1 sm:(w-8rem flex-none)"
        @click="chat.toContactSendMsg('userId', otherUserId)"
      >
        发送消息&ensp;
      </CommonElButton>
      <CommonElButton
        v-else-if="otherUserId !== store.userInfo.id"
        key="add"
        icon-class="i-solar:user-plus-bold p-2 mr-2"
        type="primary"
        size="large"
        class="flex-1 sm:(w-8rem flex-none)"
        @click="handleApplyFriend"
      >
        添加好友&ensp;
      </CommonElButton>
    </div>
    <!-- 好友申请 -->
    <ChatFriendApplyDialog v-model:show="isShowApply" :user-id="otherUserId" @submit="chat.setTheFriendOpt(FriendOptType.Empty, {})" />
  </el-scrollbar>
</template>

<style scoped lang="scss">
:deep(.el-scrollbar__thumb) {
  display: none;
}
</style>
