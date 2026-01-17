<script lang="ts" setup>
import { useGroupList } from "./hook";

interface Props {
  type: "friend" | "group"
  immediate?: boolean
  autoStop?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  immediate: true,
  autoStop: true,
});

const {
  isLoading,
  lastLoadTime,
  chat,
  pageInfo,
  list,
  isReload,
  loadData,
  reloadData,
  isFirstLoad,
  isFriendPanel,
  checkIsFocus,
} = useGroupList(props.type);

/**
 * 好友相关监听
 */
if (props.type === "friend") {
  // 监听好友删除
  mitter.on(MittEventType.FRIEND_CONTROLLER, ({ type, payload }) => {
    if (type === "delete") {
      list.value = list.value.filter(p => (p as ChatUserFriendVO).userId !== payload.userId) as ChatUserFriendVO[];
    }
    else if (type === "add") { // 新增好友
      reloadData();
    }
  });
}
else if (props.type === "group") { // 群组相关监听
  mitter.on(MittEventType.GROUP_CONTRONLLER, ({ type, payload }) => {
    if (type === "delete") {
      list.value = list.value.filter(p => (p as ChatRoomGroupVO).roomId !== payload.roomId) as ChatUserFriendVO[];
    }
    else if (type === "add") { // 新增群组
      reloadData();
    }
  });
}
</script>

<template>
  <div>
    <ListAutoIncre
      :immediate="immediate"
      :auto-stop="autoStop"
      :no-more="pageInfo.isLast"
      loading-class="op-0"
      @load="loadData"
    >
      <!-- 骨架屏 -->
      <div v-if="isReload">
        <div v-for="p in 9" :key="p" class="item">
          <div class="h-2.4rem w-2.4rem flex-shrink-0 rounded-2 bg-gray-1 object-cover dark:bg-dark-4" />
          <div class="nickname-skeleton h-4 w-8em bg-gray-1 rounded dark:bg-dark-4" />
        </div>
      </div>
      <template v-else>
        <div
          v-for="p in list"
          :key="p.id"
          class="item"
          :class="{ focus: checkIsFocus(p) }"
          @click="chat.setTheFriendOpt(
            isFriendPanel ? FriendOptType.User : FriendOptType.Group,
            isFriendPanel ? { ...p, id: (p as ChatUserFriendVO).userId } : p,
          )"
        >
          <CardAvatar
            class="h-2.4rem w-2.4rem flex-row-c-c overflow-hidden bg-color-2 shadow-sm card-rounded-df"
            :src="BaseUrlImg + p.avatar"
            load-class="none-sky"
            fit="cover"
          />
          <span>{{ isFriendPanel ? (p as ChatUserFriendVO).nickName : (p as ChatRoomGroupVO).name || '未填写' }}</span>
          <i v-if="(p as ChatUserFriendVO).type === UserType.ROBOT" i-ri:robot-2-line class="ai-icon" />
        </div>
      </template>
    </ListAutoIncre>
  </div>
</template>

<style lang="scss" scoped>
.item {
  --at-apply: "flex items-center gap-4 p-2 cursor-pointer  rounded mb-2 hover:(bg-menu-color)";
  &.focus {
    --at-apply: "!bg-menu-color";
  }
}

.ai-icon {
  --at-apply: "h-1.4em w-1.4em text-theme-primary dark:text-theme-info";
}
</style>
