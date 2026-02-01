<script lang="ts" setup>
import type { MenuItemConfig } from "~/components/common/MenuItemCard.vue";
import { appName } from "@/constants";

const {
  id: otherUserId,
} = defineProps<{
  id?: string;
}>();

const store = useUserStore();
const chat = useChatStore();
const setting = useSettingStore();
const route = useRoute();

const user = ref<Partial<UserInfoVO>>();
const isLoading = ref(true);
const isShowApply = ref(false);
const isFriend = ref(false);
const isSelf = ref(false);


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
  if (!otherUserId)
    return;
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
    badge: { isDot: true, hidden: false },
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
  <el-scrollbar class="h-full w-full flex flex-1 flex-col bg-color-2 sm:bg-color" wrap-class="pb-30">
    <!-- 背景图 (固定在顶部) -->
    <UserInfoBgToggle class="fixed left-0 top-0 z-0 w-full" :is-edit="isSelf" />

    <!-- 内容区域 (相对定位以在背景图上方滚动) -->
    <div class="relative z-1 px-2 -mt-12 sm:px-4">
      <!-- 用户主面板 -->
      <UserInfoPanel
        :data="user"
        :is-edit="isSelf"
        class="mx-auto max-w-2xl"
      />

      <!-- 移动端额外设置 -->
      <div v-if="isSelf && setting.isMobileSize" class="mt-3 rounded-xl bg-color px-4 shadow-sm sm:(border-default-2 border-op-04)">
        <CommonMenuItemList
          size="medium"
          :items="settingMenuItems"
          variant="list"
        />
      </div>
    </div>

    <!-- 底部操作按钮 (仅在查看他人时显示) -->
    <div
      v-if="!isLoading && otherUserId && otherUserId !== store.userInfo?.id"
      data-fade
      class="fixed bottom-0 left-0 z-10 mx-auto max-w-2xl w-full flex gap-3 rounded-t-xl bg-color bg-op-90 p-4 shadow-lg backdrop-blur-8 sm:(static mt-6 justify-center bg-transparent shadow-none)"
    >
      <template v-if="isFriend">
        <CommonElButton
          icon-class="i-solar:trash-bin-trash-outline p-2 mr-1"
          style="--el-color-primary: var(--el-color-danger);"
          plain
          :size="setting.isMobileSize ? 'large' : 'default'"
          class="flex-1 bg-color-2 sm:(w-36 flex-none)"
          @click="deleteFriend"
        >
          删除好友
        </CommonElButton>
        <CommonElButton
          icon-class="i-solar:chat-line-bold p-2 mr-1"
          type="primary"
          :size="setting.isMobileSize ? 'large' : 'default'"
          class="flex-1 sm:(w-36 flex-none)"
          @click="chat.toContactSendMsg('userId', otherUserId)"
        >
          发送消息
        </CommonElButton>
      </template>
      <CommonElButton
        v-else
        icon-class="i-solar:user-plus-bold p-2 mr-1"
        type="primary"
        :size="setting.isMobileSize ? 'large' : 'default'"
        class="flex-1 sm:(w-36 flex-none)"
        @click="handleApplyFriend"
      >
        添加好友
      </CommonElButton>
    </div>

    <!-- 好友申请弹窗 -->
    <ChatFriendApplyDialog
      v-model:show="isShowApply"
      :user-id="otherUserId"
      @submit="chat.setTheFriendOpt(FriendOptType.Empty, {})"
    />
  </el-scrollbar>
</template>

<style scoped lang="scss">
:deep(.el-scrollbar__thumb) {
  display: none;
}
</style>
