<script lang="ts" setup>
const isLoading = ref<boolean>(false);
const isReload = ref<boolean>(false);
const user = useUserStore();
const pageInfo = ref({
  cursor: null as null | string,
  isLast: false,
  size: 10,
  page: 0,
  total: -1,
});
const list = ref<ChatUserFriendApplyVO[]>([]);

onMounted(async () => {
  isReload.value = true;
  await loadData(() => {
    nextTick(() => {
      isReload.value = false;
    });
  });
});
// 加载数据
async function loadData(call?: () => void) {
  if (isLoading.value || pageInfo.value.isLast)
    return;

  pageInfo.value.page++;
  isLoading.value = true;
  const { data } = await getChatFriendApplyPage(pageInfo.value.page, pageInfo.value.size, user.getToken);
  if (data.records)
    list.value.push(...data.records);
  pageInfo.value.isLast = Boolean(data.isLast);
  pageInfo.value.page = data.current || 1;
  isLoading.value = false;
  call && call();
}

// 刷新数据
async function reload() {
  pageInfo.value = {
    cursor: null as null | string,
    isLast: false,
    size: 10,
    page: 0,
    total: -1,
  };
  list.value = [];
  await loadData();
}


// 会话store
const chat = useChatStore();
function onArgeeFriend(applyId: number) {
  ElMessageBox.confirm("是否同意好友申请？", {
    title: "新好友",
    type: "info",
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    lockScroll: false,
    center: true,
    callback: async (action: string) => {
      if (action === "confirm") {
        const res = await argeeFriendApply({ applyId }, user.getToken);
        if (res.code === StatusCode.SUCCESS) {
          const item = list.value.find(p => p.applyId === applyId);
          if (item) {
            item.status = ChatApplyStatusType.Argee;
            mitter.emit(MittEventType.FRIEND_CONTROLLER, { // 添加好友成功
              type: "add",
              payload: {
                userId: item?.userId,
              },
            });
          }
        }
      }
    },
  });
}

// 添加拒绝好友申请的处理函数
function onRejectFriend(applyId: number) {
  ElMessageBox.confirm("是否拒绝好友申请？", {
    title: "拒绝申请",
    type: "warning",
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    lockScroll: false,
    center: true,
    callback: async (action: string) => {
      if (action === "confirm") {
        const res = await rejectFriendApply({ applyId }, user.getToken);
        if (res.code === StatusCode.SUCCESS) {
          const item = list.value.find(p => p.applyId === applyId);
          if (item) {
            item.status = ChatApplyStatusType.Reject;
          }
        }
      }
    },
  });
}

const applyStatusTextMap = {
  [ChatApplyStatusType.Load]: "待处理",
  [ChatApplyStatusType.Argee]: "已同意",
  [ChatApplyStatusType.Reject]: "已拒绝",
};

const openItemId = ref<number>();


watch(() => chat.applyUnReadCount, (newVal, oldVal) => {
  if (newVal && newVal > 0) {
    reload();
  }
});

onBeforeUnmount(() => {
  chat.applyUnReadCount = 0;
});
</script>

<template>
  <div
    class="list w-full flex flex-col text-sm"
    @click="openItemId = undefined"
  >
    <!-- 骨架屏 -->
    <template v-if="isReload">
      <div v-for="p in 10" :key="p" class="item">
        <div class="h-2.4rem w-2.4rem flex-shrink-0 rounded bg-gray-1 object-cover dark:bg-dark-4" />
        <div>
          <div class="h-3 w-8em rounded bg-gray-1 dark:bg-dark-4" />
          <div class="mt-2 h-3 w-4em rounded bg-gray-1 dark:bg-dark-4" />
        </div>
        <div class="ml-a h-4 w-3em rounded bg-gray-1 dark:bg-dark-4" />
      </div>
    </template>
    <ListAutoIncre
      :immediate="false"
      :auto-stop="true"
      :no-more="pageInfo.isLast"
      @load="loadData"
    >
      <div
        v-for="p in list" :key="p.applyId"
        class="item"
      >
        <CardElImage
          class="avatar-icon flex-shrink-0 cursor-pointer"
          :src="BaseUrlImg + p.user?.avatar" fit="cover" @click="chat.setTheFriendOpt(FriendOptType.User, {
            id: p.userId,
          })"
        />
        <div class="flex flex-col truncate">
          <p truncate text-sm>
            {{ p.user?.nickName || "未填写" }}
          </p>
          <small mt-1 cursor-pointer text-mini>留言：{{ p.msg || "" }}&nbsp;
            <span v-if="p.createTime" class="text-mini">{{ formatContactDate(p.createTime) }}</span>
          </small>
        </div>
        <div class="ml-a flex-row-c-c flex-shrink-0">
          <template v-if="p.status === ChatApplyStatusType.Load">
            <el-button-group class="card-rounded-df bg-color-2 transition-200 hover:shadow">
              <BtnElButton size="small" @click="onArgeeFriend(p.applyId)">
                同意
              </BtnElButton>
              <BtnElButton size="small" style="padding: 0 0.3em;" @click.stop="openItemId = openItemId === p.applyId ? undefined : p.applyId">
                <el-popover
                  :visible="openItemId === p.applyId"
                  popper-class="!border-default !p-1 !min-w-fit"
                  width="fit-content"
                  transition="popper-fade"
                  :teleported="true"
                  append-to-body
                  placement="bottom"
                  trigger="focus"
                >
                  <template #reference>
                    <i
                      :class="openItemId === p.applyId ? 'i-solar:alt-arrow-up-line-duotone' : 'i-solar:alt-arrow-down-line-duotone'"
                      class="p-2"
                    />
                  </template>
                  <template #default>
                    <div
                      class="w-fit btn-primary-bg px-2.6 py-1 text-0.8rem"
                      @click="onRejectFriend(p.applyId)"
                    >
                      <i class="i-solar:user-block-outline mr-1 p-2" />
                      拒&nbsp;绝
                    </div>
                  </template>
                </el-popover>
              </BtnElButton>
            </el-button-group>
          </template>
          <small v-else>{{ applyStatusTextMap[p.status] }}</small>
        </div>
      </div>
      <template #done>
        <div class="py-1rem text-center text-mini">
          {{ list.length ? "没有更多了" : "快去认识其他人" }}
        </div>
      </template>
    </ListAutoIncre>
  </div>
</template>

<style lang="scss" scoped>
.avatar-icon {
  --at-apply: "h-2.4rem bg-color-2 overflow-hidden rounded-full w-2.4rem flex-row-c-c shadow-sm";
}
.item {
  --at-apply: "card-default flex items-center gap-4 p-4 cursor-pointer rounded-6px hover:!bg-op-60 transition-200 mb-4";
}
</style>
