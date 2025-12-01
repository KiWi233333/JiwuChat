<script setup lang="ts">
/**
 * 群聊适配器
 */
const {
  data,
} = defineProps<{
  data: TheFriendOpt<ChatRoomGroupVO>
}>();
const isLoading = ref(false);
const isOnGroup = ref<boolean | undefined>(false);
const room = ref<Partial<ChatRoomInfoVO>>({});
const user = useUserStore();
const chat = useChatStore();
const setting = useSettingStore();
const isGroupOwner = computed(() => room.value.role === ChatRoomRoleEnum.OWNER);

// 加载房间数据
async function loadData(val: number) {
  if (isLoading.value)
    return;
  isOnGroup.value = false;
  isLoading.value = true;
  // 获取房间信息
  const res = await getRoomGroupInfo(val, user.getToken);
  if (res.code === StatusCode.SUCCESS)
    room.value = res.data;
  isLoading.value = false;
  // 确认是否为在群
  isOnGroup.value = true; // 假设用户已经在群中，根据实际情况进行判断
}

// 群聊申请
const roomId = computed(() => data.data.roomId);
watch(roomId, val => loadData(val), { immediate: true });

// 去发消息
async function toSend(roomId: number) {
  if (!isOnGroup.value)
    return;
  const res = await getChatContactInfo(roomId, user.getToken, RoomType.GROUP);
  if (!res)
    return;
  let contact: ChatContactDetailVO | undefined = res.data;
  if (res.code === StatusCode.DELETE_NOEXIST_ERR) { // 发送消息拉取会话
    ElMessage.closeAll("error");
    // 记录已删除，重新拉取会话
    const newRes = await restoreGroupContact(roomId, user.getToken);
    if (newRes.code !== StatusCode.SUCCESS) {
      return;
    }
    contact = newRes.data;
  }
  await chat.setContact(contact);
  if (setting.isMobileSize) {
    chat.isOpenContact = false;
  }
  await nextTick(() => {
    navigateTo({
      path: "/",
    });
  });
}
</script>

<template>
  <div
    v-show="!isLoading"
    class="h-full w-full flex-1 animate-[0.3s_fade-in] px-2 py-1px !card-bg-color"
    v-bind="$attrs"
  >
    <!-- 顶部 -->
    <div absolute left-0 top-0 h-4.2rem w-full flex items-center gap-2 px-5>
      <CardElImage
        :src="BaseUrlImg + data.data.avatar" fit="cover"
        class="h-2em w-2em flex-shrink-0 overflow-auto border-default card-default object-cover shadow-sm"
      />
      <strong text-0.9em font-500>{{ room.groupName }}</strong>
      <small op-60 el-color-info>在线：{{ room.onlineNum || "0" }}</small>
    </div>
    <!-- 群成员 -->
    <ChatRoomGroupGrid class="mx-a mt-24 max-h-50vh sm:w-2/3" :data="data.data" />
    <div class="mx-a my-6 w-4/5 border-default-b sm:(my-10 w-3/5)" />
    <!-- 按钮 -->
    <div flex-row-c-c gap-4>
      <BtnElButton
        key="delete"
        icon-class="i-solar:trash-bin-trash-outline p-2 mr-2"
        style="transition: .2s; max-width: 9em;text-align: center;letter-spacing: 1px;--el-color-primary: var(--el-color-danger);"
        plain
        class="mr-4 op-60 hover:op-100"
        @click="chat.exitGroupConfirm(chat.theRoomId, isGroupOwner, () => {
          chat.setTheFriendOpt(FriendOptType.Empty, {});
          chat.setDelGroupId(roomId); // 清除房间
        })"
      >
        {{ isGroupOwner ? "解散群聊" : "退出群聊" }}&ensp;
      </BtnElButton>
      <BtnElButton
        key="send"
        icon-class="i-solar:chat-line-bold p-2 mr-2"
        style="transition: .2s; max-width: 9em;text-align: center;letter-spacing: 1px;"
        type="primary"
        @click="toSend(roomId)"
      >
        发送消息&ensp;
      </BtnElButton>
    </div>
  </div>
</template>

<style lang="scss" scoped>
</style>
