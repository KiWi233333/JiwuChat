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
const settingMenuItems = computed<MenuItemConfig[]>(() => [
  {
    icon: "i-solar:devices-outline",
    title: "账 号",
    path: "/user/safe",
    badge: {
      isDot: true,
      hidden: false,
    },
  },
  {
    icon: "i-solar:code-square-outline",
    title: "API Key",
    path: "/api/key",
  },
  {
    icon: "i-solar:settings-linear",
    title: "设 置",
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
    <UserInfoBgToggle class="fixed left-0 top-0 z-0 w-full" />
    <!-- 用户信息面板 -->
    <UserInfoPanel
      :data="user"
      data-fade
      :is-edit="isSelf"
    />

    <!-- 设置区域 (仅自己可见) -->
    <div v-if="isSelf" class="bg-color pb-20">
      <CommonMenuItemList
        size="small"
        :items="settingMenuItems"
        variant="card"
      />
    </div>

    <!-- 按钮 -->
    <div v-show="!isLoading && otherUserId" class="w-full flex-row-c-c bg-color p-0 py-8 sm:(static max-w-30rem py-4)">
      <BtnElButton
        v-if="isFriend"
        key="delete"
        icon-class="i-solar:trash-bin-trash-outline p-2 mr-2"
        style="transition: .2s; max-width: 9em;text-align: center;letter-spacing: 1px;--el-color-primary: var(--el-color-danger);"
        plain
        class="mr-4 bg-color-2"
        @click="deleteFriend"
      >
        删除好友&ensp;
      </BtnElButton>
      <BtnElButton
        v-if="isFriend"
        key="send"
        icon-class="i-solar:chat-line-bold p-2 mr-2"
        style="transition: .2s; max-width: 9em;text-align: center;letter-spacing: 1px;"
        type="primary"
        @click="chat.toContactSendMsg('userId', otherUserId)"
      >
        发送消息&ensp;
      </BtnElButton>
      <BtnElButton
        v-else-if="otherUserId !== store.userInfo.id"
        key="add"
        icon-class="i-solar:user-plus-bold p-2 mr-2"
        type="primary"
        @click="handleApplyFriend"
      >
        添加好友&ensp;
      </BtnElButton>
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
