<script lang="ts" setup>
interface Props {
  type: "friend" | "group"
  immediate?: boolean
  autoStop?: boolean
}
//  { type: "friend"; data: ChatUserFriendVO } | { type: "group"; data: ChatRoomGroupVO };
// 根据type判断数据类型
type DataVO = ChatUserFriendVO | ChatRoomGroupVO;

const props = withDefaults(defineProps<Props>(), {
  immediate: true,
  autoStop: true,
});

const isLoading = ref<boolean>(false);
const lastLoadTime = ref<number>();
const chat = useChatStore();
const user = useUserStore();

const pageInfo = ref({
  cursor: undefined as undefined | string,
  isLast: false,
  size: 10,
});
const list = ref<DataVO[]>([]);
const isReload = ref(true);

// 加载数据
async function loadData() {
  if (isLoading.value || pageInfo.value.isLast)
    return;
  isLoading.value = true;
  try {
    const { data } = props.type === "friend"
      ? await getChatFriendPage(pageInfo.value.size, pageInfo.value.cursor || null, user.getToken)
      : await getChatGroupRoomPage(pageInfo.value.size, pageInfo.value.cursor || null, user.getToken);

    if (data?.list)
      list.value.push(...data.list as any[]);
    pageInfo.value.isLast = data.isLast;
    pageInfo.value.cursor = data.cursor || undefined;
  }
  catch (e) {
    console.error(e);
  }
  finally {
    isLoading.value = false;
  }
}

// 重新加载数据
async function reloadData() {
  pageInfo.value.cursor = undefined;
  pageInfo.value.isLast = false;
  lastLoadTime.value = Date.now();
  list.value = [];
  isReload.value = true;
  await loadData();
  isReload.value = false;
}

// 首次加载动画
const isFirstLoad = ref(false);
const isFriendPanel = computed(() => props.type === "friend");
// 页面是否有焦点
function checkIsFocus(p: DataVO) {
  return isFriendPanel.value ? chat.theFriendOpt?.data?.id === (p as ChatUserFriendVO).userId : chat.theFriendOpt?.data?.roomId === p.roomId;
}

onMounted(() => {
  reloadData();
  isFirstLoad.value = true;
});
onUnmounted(() => {
  isFirstLoad.value = false;
});
onDeactivated(() => {
  isFirstLoad.value = false;
});
// 页面激活 5分钟内不重新加载
onActivated(() => {
  if (lastLoadTime.value && Date.now() - lastLoadTime.value > 1000 * 60 * 5) { // 5分钟内不再加载
    reloadData();
  }
});


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
          <div class="nickname-skeleton h-4 w-8em rounded bg-gray-1 dark:bg-dark-4" />
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
            class="avatar-icon overflow-hidden rounded-6px"
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
.avatar-icon {
  --at-apply: "h-2.4rem card-rounded-df bg-color-2 w-2.4rem flex-row-c-c rounded-6px shadow-sm";
}
.item {
  --at-apply: "flex items-center gap-4 p-2 cursor-pointer rounded-6px mb-2 hover:(bg-menu-color)";
  &.focus {
    --at-apply: "!bg-menu-color";
  }
}

.ai-icon {
  --at-apply: "h-1.4em w-1.4em text-theme-primary dark:text-theme-info";
}
</style>
