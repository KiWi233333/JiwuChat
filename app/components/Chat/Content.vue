<script lang="ts" setup>
import { ChatRoomGroupPopup, ChatRoomSelfPopup } from "#components";


defineProps<{
  roomId?: string
}>();

const chat = useChatStore();
const setting = useSettingStore();
const msgFormRef = useTemplateRef<any>("msgFormRef");

watch(
  () => chat.theRoomId,
  () => chat.isOpenGroupMember = false,
);
</script>

<template>
  <div id="chat-content" class="content flex-1">
    <div class="relative h-full flex flex-1 flex-col transition-200" :class="{ 'scale-94 op-50 transform-origin-lc': chat.isOpenGroupMember && setting.isMobileSize }">
      <!-- 房间信息 -->
      <ChatRoomInfo class="relative z-10 border-default-3-b shadow-sm" />
      <!-- 消息列表 -->
      <ChatMessageList @click="msgFormRef?.onClickOutside()" />
      <!-- 发送 -->
      <ChatMsgFormV2 ref="msgFormRef" class="border-default-2-t" />
    </div>
    <!-- 在线人数 -->
    <Transition name="fade-lr" mode="out-in">
      <div v-if="chat.isOpenGroupMember" class="member-popup">
        <div class="model" @click="chat.isOpenGroupMember = false" />
        <component :is="chat.theContact.type === RoomType.GROUP ? ChatRoomGroupPopup : ChatRoomSelfPopup" class="member" />
      </div>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
.content {
  --at-apply: "bg-color-2 relative w-full flex flex-col";

  .member-popup {
    --at-apply: "absolute left-0 top-0 z-998 h-full w-full pt-0 sm:pt-20";

    .model {
      --at-apply: "absolute top-0 h-full w-full";
    }
    .member {
      --at-apply: "ml-a h-full  max-w-full flex flex-1 flex-col gap-2 border-l-0 p-4 shadow-lg sm:(max-w-18rem shadow-none) !sm:border-default-2-l bg-color";
    }
  }

  :deep(.el-scrollbar) {
    .el-scrollbar__bar {
      opacity: 0.6;
      .el-scrollbar__thumb:active,
      .el-scrollbar__thumb:hover {
        opacity: 1;
      }
    }
  }
}
</style>


