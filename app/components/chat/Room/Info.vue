<script lang="ts" setup>
import { navigateToGroupDetail } from "~/composables/hooks/msg/useMsgForm";

const chat = useChatStore();
const setting = useSettingStore();
// 获取类型
const getType = computed(() => {
  let msg = "";
  switch (chat?.theContact?.type) {
    case RoomType.GROUP:
      msg = "群";
      break;
    case RoomType.SELFT:
      msg = "私";
      break;
    case RoomType.AICHAT:
      msg = "AI";
      break;
  }
  return msg;
});

// 点击更多
function onClickMore() {
  switch (chat.theContact.type) {
    case RoomType.SELFT:
    case RoomType.AICHAT:
    case RoomType.GROUP:
      chat.isOpenGroupMember = !chat.isOpenGroupMember;
      break;
      // case RoomType.SELFT:
      // case RoomType.AICHAT:
      // const friendId = chat?.theContact?.targetUid;
      // if (!friendId) {
      //   console.warn("friend userId is null");
      //   return;
      // }
      // chat.setTheFriendOpt(FriendOptType.User, {
      //   id: friendId,
      // });
      // navigateTo({
      //   path: "/friend",
      //   query: {
      //     dis: 1,
      //   },
      // });
      break;
  }
}

// 跳转到详情
function navigateToDetail(type?: RoomType) {
  if (type === undefined)
    return;
  switch (type) {
    case RoomType.SELFT:
    case RoomType.AICHAT:
      chat.theContact?.targetUid && navigateToUserDetail(chat.theContact?.targetUid);
      break;
    case RoomType.GROUP:
      chat.theContact?.roomId && navigateToGroupDetail(chat.theContact?.roomId);
      break;
  }
}
</script>

<template>
  <div :data-tauri-drag-region="setting.isDesktop" class="nav-padding-top-6 h-16 flex-row-bt-c rounded-0 pl-2 pr-4 sm:(h-20 pl-4)">
    <div :data-tauri-drag-region="setting.isDesktop" w-full flex items-center gap-3>
      <div
        class="flex cursor-pointer items-center gap-3"
        title="点击查看详情"
        @click="navigateToDetail(chat.theContact.type)"
      >
        <CardElImage
          loading="lazy"
          :error-class="contactTypeIconClassMap[chat?.theContact?.type || RoomType.SELFT]"
          :alt="chat.theContact.name"
          :default-src="chat?.theContact?.avatar"
          class="h-2rem w-2rem flex-shrink-0 border-default-2 card-default object-cover sm:(h-2.2rem w-2.2rem)"
        />
        <span truncate text-sm font-500>
          {{ chat.theContact.name }}
        </span>
        <el-tag effect="dark" size="small">
          {{ getType }}
        </el-tag>
      </div>
      <!-- <span v-if="chat.theContact.type === RoomType.AICHAT" class="border-(1px  solid) rounded px-2 py-1 text-0.65rem text-light">AI生成内容，仅供参考！</span> -->
      <i
        class="ml-a flex-row-c-c btn-primary grid-gap-2"
        transition="all  op-60 group-hover:op-100 300  cubic-bezier(0.61, 0.225, 0.195, 1.3)"
        i-solar:menu-dots-bold
        title="更多"
        p-2.2
        @click="onClickMore"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
// .right-item:nth-of-type(1){
//   --at-apply: "ml-a";
// }
</style>
