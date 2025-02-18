<script setup lang="ts">
/**
 * 用户适配器
 */
const {
  data: panelData,
} = defineProps<{
  data: TheFriendOpt<UserType>
}>();
interface UserType {
  id: string
}
const store = useUserStore();
const setting = useSettingStore();
const isLoading = ref(true);
const isFrend = ref<boolean | undefined>(false);
const userId = computed(() => panelData.data.id);
const isSelf = computed(() => userId.value === store.userId);
const targetUserInfo = ref<Partial<CommUserVO>>({});
// 年龄
const getAgeText = computed(() => calculateAge(targetUserInfo.value?.birthday));
const getConstellation = computed(() => computeConstellation(targetUserInfo.value?.birthday));
const getBirthdayCount = computed(() => calculateBirthdayCount(targetUserInfo.value?.birthday));

// 加载用户数据
async function loadData(val: string) {
  isFrend.value = false;
  isLoading.value = true;
  try {
    // 确认是否为好友
    await isChatFriend({ uidList: [val] }, store.getToken).then((res) => {
      const data = res.data.checkedList.find((p: FriendCheck) => p.uid === val);
      isFrend.value = data && data.isFriend === isTrue.TRUE;
    });
    if (!val)
      return targetUserInfo.value = {};
    const res = await getCommUserInfoSe(val, store.getToken);
    if (res.code === StatusCode.SUCCESS)
      targetUserInfo.value = res.data;
    isLoading.value = false;
  }
  catch (e) {
    isLoading.value = false;
  }
}
const chat = useChatStore();
const userStore = useUserStore();

// 删除好友
function deleteFriend(userId: string) {
  ElMessageBox.confirm("是否删除该好友，对应聊天会话也会被删除？", {
    title: "删除提示",
    type: "warning",
    customClass: "text-center",
    confirmButtonText: "删除",
    confirmButtonClass: "el-button--danger",
    center: true,
    cancelButtonText: "取消",
    lockScroll: false,
    callback: async (action: string) => {
      if (action === "confirm") {
        const res = await deleteFriendById(userId, store.getToken);
        if (res.code === StatusCode.SUCCESS) {
          chat.setTheFriendOpt(FriendOptType.Empty, {});
          chat.setDelUserId(userId);// 删除的好友 好友列表也前端移除
          chat.setIsAddNewFriend(true);// 设置未非好友
          const contactInfoRes = await getSelfContactInfoByFriendUid(userId, store.getToken);
          if (contactInfoRes && contactInfoRes.code !== StatusCode.SUCCESS) {
            return ElMessage.closeAll("error");
          }
          else {
            chat.removeContact(contactInfoRes.data.roomId); // 清除对应会话
          }
        }
        chat.setIsAddNewFriend(true);
      }
    },
  });
};

// 好友申请
const isShowApply = ref(false);
function handleApplyFriend(userId: string) {
  isShowApply.value = true;
}
// 执行最后一次
watch(userId, (val: string) => {
  loadData(val);
}, { immediate: true });

// 去发消息
async function toSend(uid: string) {
  if (!isFrend.value)
    return;
  const res = await getSelfContactInfoByFriendUid(uid, store.getToken);
  if (!res)
    return;
  let contact: ChatContactDetailVO | undefined = res.data;
  if (res.code === StatusCode.DELETE_NOEXIST_ERR) { // 发送消息拉取会话
    ElMessage.closeAll("error");
    // 记录已删除，重新拉取会话
    const newRes = await restoreSelfContact(uid, store.getToken);
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
// @unocss-include
</script>

<template>
  <div
    v-bind="$attrs"
    :class="{
      'op-100': !isLoading,
      'op-0': isLoading,
    }"
    class="h-full w-full flex flex-1 flex-col gap-6 px-10 pt-14vh transition-300 bg-color sm:px-1/4"
  >
    <!-- 信息 -->
    <div flex gap-4 pb-6 sm:gap-6 border-default-b>
      <CardElImage
        :src="BaseUrlImg + targetUserInfo.avatar" fit="cover"
        :preview-src-list="[BaseUrlImg + targetUserInfo.avatar]"
        preview-teleported
        loading="lazy"
        class="h-4rem w-4rem flex-shrink-0 overflow-auto object-cover shadow-sm sm:(h-4.8rem w-4.8rem) border-default card-default"
      />
      <div flex flex-col gap-1 py-1>
        <strong truncate text-1.4rem>{{ targetUserInfo.nickname }}</strong>
        <p mt-a truncate text-mini :title="userId">
          ID：{{ userId }}
        </p>
        <p truncate text-mini :title="targetUserInfo.email">
          邮箱：{{ (isFrend || isSelf) ? targetUserInfo.email : ' - ' }}
        </p>
      </div>
    </div>
    <!-- 详情 -->
    <div gap-6 pb-6 border-default-b>
      <p truncate text-sm>
        <i mr-3 p-2 :class="targetUserInfo.gender === Gender.BOY ? 'i-tabler:gender-male text-blue' : targetUserInfo.gender === Gender.GIRL ? 'i-tabler:gender-female text-pink' : 'i-tabler:gender-transgender text-yellow'" />
        <span class="mr-2 pr-2 border-default-r">
          {{ targetUserInfo.gender }}
        </span>
        <template v-if="targetUserInfo.birthday">
          <span class="mr-2 pr-2 border-default-r">
            {{ getAgeText }}
          </span>
          <span class="mr-2 pr-2 border-default-r">
            {{ targetUserInfo.birthday || ' - ' }}
          </span>
          <span>
            {{ getConstellation }}
          </span>
        </template>
      </p>
      <p mt-6 truncate text-sm>
        <i class="i-carbon:send mr-3 p-2" />
        签名：-
      </p>
      <p mt-6 truncate text-sm>
        <i class="i-tabler:calendar mr-3 p-2" />
        距离生日还有：{{ getBirthdayCount || ' - ' }}天
      </p>
      <p v-if="isFrend" mt-6 truncate text-sm>
        <i class="i-carbon:phone-incoming mr-3 p-2" />
        手机号：-
      </p>
      <p mt-6 truncate text-small>
        <i class="i-carbon:user mr-3 p-2" />
        上次在线：
        {{ targetUserInfo.lastLoginTime || ' - ' }}
      </p>
    </div>
    <!-- 按钮 -->
    <div v-show="!isLoading" class="mx-a">
      <BtnElButton
        v-if="isFrend"
        key="delete"
        icon-class="i-solar:trash-bin-trash-outline p-2 mr-2"
        style="transition: .2s; max-width: 9em;text-align: center;letter-spacing: 1px;--el-color-primary: var(--el-color-danger);"
        plain
        class="mr-4 op-60 hover:op-100"
        @click="deleteFriend(userId)"
      >
        删除好友&ensp;
      </BtnElButton>
      <BtnElButton
        v-if="isFrend"
        key="send"
        icon-class="i-solar:chat-line-bold p-2 mr-2"
        style="transition: .2s; max-width: 9em;text-align: center;letter-spacing: 1px;"
        type="primary"
        @click="toSend(userId)"
      >
        发送消息&ensp;
      </BtnElButton>
      <BtnElButton
        v-else-if="userId !== userStore.userInfo.id"
        key="add"
        icon-class="i-solar:user-plus-bold p-2 mr-2"
        type="primary"
        @click="handleApplyFriend(userId)"
      >
        添加好友&ensp;
      </BtnElButton>
    </div>
    <!-- 好友申请 -->
    <ChatFriendApplyDialog v-model:show="isShowApply" :user-id="userId" @submit="chat.setTheFriendOpt(FriendOptType.Empty, {})" />
  </div>
</template>

<style lang="scss" scoped>
</style>

