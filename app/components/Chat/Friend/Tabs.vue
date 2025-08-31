<script lang="ts" setup>
const chat = useChatStore();
const ws = useWsStore();
function toggleView(type: FriendOptType, data: any = {}) {
  chat.setTheFriendOpt(type, data);
  // 消费消息
  ws.wsMsgList.applyMsg.splice(0);
}
const route = useRoute();
const activeNames = useLocalStorage(`${route.fullPath}_activeNames`, {
  arr: ["2"],
});
</script>

<template>
  <div
    class="border-0 transition-200 transition-width"
    v-bind="$attrs"
  >
    <slot name="top">
      <div class="card-item border-0 border-default-b border-b-1px py-3">
        <div class="hover:bg-transparent">
          <ChatFriendApplySearch
            @submit="(val: any) => chat.setTheFriendOpt(FriendOptType.User, val)"
          />
        </div>
      </div>
    </slot>
    <el-scrollbar height="calc(100% - 3.8rem)" wrap-class="pb-10" class="scrollbar">
      <div class="card-item border-default-2-b">
        <small pb-2 pt-4 op-90>新的朋友</small>
        <div
          class="item"
          :class="{ focus: chat.theFriendOpt.type === FriendOptType.NewFriend }"
          @click="toggleView(FriendOptType.NewFriend)"
        >
          <el-badge :value="chat.applyUnReadCount" :hidden="!chat.applyUnReadCount" :max="99">
            <div class="avatar-icon bg-theme-warning">
              <i i-solar:user-plus-bold bg-light p-3 />
            </div>
          </el-badge>
          <small>新的朋友</small>
        </div>
      </div>
      <div class="card-item">
        <small pb-2 pt-4 op-90>AI 机器人</small>
        <div class="item" :class="{ focus: chat.theFriendOpt.type === FriendOptType.AiRobot }" @click="toggleView(FriendOptType.AiRobot)">
          <div class="avatar-icon bg-theme-primary">
            <i i-ri:robot-2-line class="ai-icon" />
          </div>
          <small>探索机器人</small>
        </div>
      </div>
      <el-collapse v-model="activeNames.arr">
        <!-- 群聊 -->
        <el-collapse-item name="group" title="群聊">
          <Transition enter-active-class="animate-(fade-in duration-200) z-0" leave-active-class="animate-fade-out !z-0" mode="in-out">
            <ChatFriendGroupList v-if="activeNames.arr.includes('group')" type="group" />
          </Transition>
        </el-collapse-item>
        <!-- 好友 -->
        <el-collapse-item name="friend" title="好友">
          <Transition enter-active-class="animate-(fade-in duration-200) z-0" leave-active-class="animate-fade-out !z-0" mode="in-out">
            <ChatFriendGroupList v-if="activeNames.arr.includes('friend')" type="friend" />
          </Transition>
        </el-collapse-item>
      </el-collapse>
    </el-scrollbar>
  </div>
</template>

<style lang="scss" scoped>
.avatar-icon {
  --at-apply: "h-2.4rem  flex-row-c-c rounded-6px w-2.4rem shadow-sm border-default";
}
.card-item {
  --at-apply: "flex flex-col";

  .ai-icon {
    --at-apply: "mx-0.5em pt-2px h-1.4em w-1.4em text-light";
  }
  .item {
    --at-apply: "tracking-1px flex items-center gap-4 p-2 cursor-pointer rounded-6px mb-2 hover:(bg-menu-color) ";
    &.focus {
      --at-apply: "!bg-menu-color";
    }
  }
}
:deep(.el-scrollbar) {
  .el-scrollbar__bar.is-vertical {
    display: none;
  }
}
:deep(.el-collapse) {
  --at-apply: "border-default-t";

  .el-collapse-item__header {
    --at-apply: "h-3em";
  }
  .el-collapse-item__header:not(.is-active) {
    --at-apply: "border-default-b";
  }
  .el-collapse-item__content {
    padding: 0;
  }
  .el-collapse-item__wrap {
    --at-apply: "border-default-b";
  }
}
</style>
