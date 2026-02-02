<script lang="ts" setup>
// 会话store
const user = useUserStore();
const store = useUserStore();
const chat = useChatStore();

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
            background: "var(--el-overlay-color, rgba(0, 0, 0, 0.1))",
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
  <div class="list-container">
    <!-- 骨架屏 -->
    <template v-if="isReload">
      <div v-for="p in 12" :key="p" class="card-item skeleton-card">
        <div class="skeleton-avatar" />
        <div class="skeleton-content">
          <div class="skeleton-line w-1/2" />
          <div class="skeleton-line mt-2 w-9/10" />
          <div class="skeleton-line mt-1 w-3/10" />
        </div>
      </div>
    </template>

    <!-- 列表内容 -->
    <div
      v-for="(p, index) in list"
      :key="p.userId"
      v-loading="isLoadRobot === p.userId"
      class="card-item group"
      :class="`card-style-${(index % 6) + 1}`"
      title="开始对话"
      @click.stop="onHandelRobot(p)"
    >
      <!-- 装饰背景 -->
      <div class="deco-bg" />

      <!-- 头像 -->
      <CommonElImage
        class="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full"
        :src="BaseUrlImg + p?.avatar"
        fit="cover"
        title="点击查看详情"
      />

      <!-- 内容 -->
      <div class="content">
        <div class="card-title">
          <CommonTextTip class="truncate" :content="p?.nickname || '未填写'" />
        </div>
        <p class="card-desc" :title="p.description || ''">
          {{ p.description || "暂无描述" }}
        </p>
      </div>
    </div>

    <!-- 底部提示 -->
    <div
      v-if="!isReload"
      class="col-span-full mt-4 text-center text-0.8rem text-small-50"
    >
      {{ list.length ? "没有更多了" : "快去添加你的专属AI吧" }}
    </div>
  </div>
</template>

<style lang="scss" scoped>
/* 使用 unocss 简化布局，只保留必要的自定义 */
.list-container {
  --at-apply: "grid gap-3 md:gap-6 pb-8";
  grid-template-columns: repeat(auto-fill, minmax(17.5rem, 1fr));
}

.card-item {
  --at-apply: "relative overflow-hidden transition-all duration-300 cursor-pointer card-bg-color rounded-xl flex items-center gap-4 p-4 hover:shadow";

  .content {
    --at-apply: "flex-1 z-2 h-full relative min-w-0";
  }

  .card-title {
    --at-apply: "text-sm font-600 mb-1 flex items-center justify-between text-color";
  }

  .card-desc {
    --at-apply: "leading-1.4em line-clamp-2 text-mini-50";
  }
}

/* 骨架屏样式 */
.skeleton-card {
  --at-apply: "h-22";

  .skeleton-avatar {
    --at-apply: "relative z-2 w-12 h-12 flex-shrink-0 rounded-1/2 bg-color-2";
  }
  .skeleton-content {
    --at-apply: "flex-1 z-2 relative min-w-0";
  }
  .skeleton-line {
    --at-apply: "bg-color-2 rounded h-3";
  }
}

/* loading-mask 圆角 */
:deep(.el-loading-mask) {
  --at-apply: "rounded-xl";
}
</style>
