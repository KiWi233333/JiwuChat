
<script lang="ts" setup>
// 会话store
const user = useUserStore();
const store = useUserStore();
const chat = useChatStore();
const setting = useSettingStore();

// 机器人列表
const isReload = ref<boolean>(false);
const list = ref<RobotUserVO[]>([]);
const isLoading = ref<boolean>(false);
const isLoadRobot = ref<string>("");

// 加载数据
async function loadData(call?: () => void) {
  if (isLoading.value)
    return;
  isLoading.value = true;
  const { data } = await getAiRobotList(user.getToken, isTrue.TRUE);
  if (data)
    list.value.push(...data);
  isLoading.value = false;
  call && call();
}

// 添加机器人
async function onHandelRobot(robot: RobotUserVO) {
  const { userId } = robot;
  if (robot.isFriend === isTrue.TRUE) {
    isLoadRobot.value = userId;
    await chat.toContactSendMsg("userId", userId);
    return;
  }
  ElMessageBox.confirm("是否添加该 AI ？", {
    title: "操作提示",
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    lockScroll: false,
    center: true,
    callback: async (action: string) => {
      if (action === "confirm") {
        // 确认是否为好友
        isChatFriend({ uidList: [userId] }, user.getToken).then(async (fRes) => {
          if (fRes.code !== StatusCode.SUCCESS)
            return ElMessage.error(fRes.msg || "申请失败，请稍后再试！");
          const user = fRes.data.checkedList.find((p: FriendCheck) => p.uid === userId);
          if (user && user.isFriend)
            return ElMessage.warning("申请失败，该机器人已添加过！");
          // 开启申请
          const res = await addFriendApply({
            msg: `我是 ${store?.userInfo?.nickname}`,
            targetUid: userId,
          }, store.getToken);
          if (res.code !== StatusCode.SUCCESS)
            return;
          const item = list.value.find(p => p.userId === userId);
          if (item) {
            item.isFriend = isTrue.TRUE;
          }
          // ElMessage.success("添加成功，快去对话吧！");
          const load = ElLoading.service({
            lock: true,
            text: "添加成功，正在前往对话中...",
            background: "rgba(0, 0, 0, 0.1)",
          });
          setTimeout(() => {
            onHandelRobot(robot);
            load.close();
          }, 1000);
        }).catch(() => {
          isLoadRobot.value = "";
        });
      }
    },
  });
}

// 初始化
onMounted(async () => {
  isReload.value = true;
  await loadData(() => {
    nextTick(() => {
      isReload.value = false;
    });
  });
});
onDeactivated(() => {
  isLoadRobot.value = "";
});
</script>

<template>
  <div class="list">
    <!-- 骨架屏 -->
    <template v-if="isReload">
      <div v-for="p in 6" :key="p" class="item">
        <div class="h-3rem w-3rem flex-row-c-c flex-shrink-0 cursor-pointer rounded-1/2 card-bg-color-2 sm:(h-3.5rem w-3.5rem)" />
        <div>
          <div class="h-3 w-8em bg-gray-1 dark:bg-dark-4" />
          <div class="mt-2 h-3 w-12em rounded bg-gray-1 dark:bg-dark-4" />
        </div>
        <div class="ml-a h-4 w-3em rounded bg-gray-1 dark:bg-dark-4" />
      </div>
    </template>
    <div
      v-for="p in list" :key="p.userId"
      class="item"
      title="开始对话"
      @click.stop="onHandelRobot(p)"
    >
      <CardElImage
        v-loading="isLoadRobot === p.userId"
        class="avatar-icon" :src="BaseUrlImg + p?.avatar"
        fit="cover"
        title="点击查看详情"
      />
      <div>
        <p truncate text-sm>
          {{ p?.nickname || "未填写" }}
        </p>
        <p class="text-overflow-2 mt-1 max-h-4em text-mini" :title="p.description || ''">
          {{ p.description || "" }}
        </p>
      </div>
    </div>
    <div
      v-if="!isReload"
      class="grid-col-[1/-1] text-center text-mini"
    >
      {{ list.length ? "没有更多了" : "快去添加你的专属AI吧" }}
    </div>
  </div>
</template>

<style lang="scss" scoped>
.list {
  --at-apply: "grid cols-1 flex-col gap-3 text-sm";
}
@media (min-width: 640px) {
  .list {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }
}
.item {
  --at-apply: "card-default flex items-center gap-4 p-3 sm:p-4 cursor-pointer rounded-2 border-(1px solid transparent) hover:(shadow-sm border-default) transition-200";

  .avatar-icon {
    --at-apply: "border-default shadow-sm cursor-pointer flex-shrink-0 h-3rem w-3rem sm:(w-3.5rem h-3.5rem) card-bg-color-2  rounded-1/2 flex-row-c-c  ";
  }
}
:deep(.el-loading-mask) {
  border-radius: 50%;
}
</style>
