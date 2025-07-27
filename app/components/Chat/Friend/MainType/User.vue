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
  deleteFriendConfirm(userId, store.getToken, undefined, (done?: isTrue) => {
    if (done === isTrue.TRUE) {
      ElMessage.success("删除好友成功！");
      chat.setTheFriendOpt(FriendOptType.Empty, {});
    }
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

// @unocss-include
</script>

<template>
  <div
    v-bind="$attrs"
    class="h-full w-full flex flex-1 flex-col gap-6 px-10 transition-300 sm:px-1/4 !pt-14vh sm:!pt-20vh"
  >
    <!-- 信息 -->
    <div flex gap-4 border-default-b pb-6 sm:gap-6>
      <CardElImage
        :src="BaseUrlImg + targetUserInfo.avatar" fit="cover"
        :preview-src-list="[BaseUrlImg + targetUserInfo.avatar]"
        preview-teleported
        loading="lazy"
        error-class="i-solar:user-bold-duotone p-5"
        class="h-4rem w-4rem flex-shrink-0 overflow-auto border-default card-default object-cover shadow-sm sm:(h-4.8rem w-4.8rem)"
      />
      <div flex flex-1 flex-col gap-1 py-1>
        <div w-full flex-row-bt-c>
          <div class="flex-1 truncate text-1.2rem">
            {{ targetUserInfo.nickname }}
          </div>
          <BtnElButton
            size="small"
            class="ml-a flex-shrink-0 text-mini tracking-0.2em hover:shadow"
            text
            bg
            icon-class="i-solar:user-outline mr-1"
            @click="navigateToUserInfoPage(userId)"
          >
            资料
          </BtnElButton>
        </div>
        <p mt-a truncate text-mini :title="userId">
          ID：{{ userId }}
        </p>
        <!-- <p truncate text-mini :title="targetUserInfo.email">
          邮箱：{{ (isFrend || isSelf) ? targetUserInfo.email : ' - ' }}
        </p> -->
      </div>
    </div>
    <!-- 详情 -->
    <div gap-6 border-default-b pb-6>
      <p truncate text-sm>
        <i mr-3 p-2 :class="targetUserInfo.gender === Gender.BOY ? 'i-tabler:gender-male text-blue' : targetUserInfo.gender === Gender.GIRL ? 'i-tabler:gender-female text-pink' : 'i-tabler:gender-transgender text-yellow'" />
        <span class="mr-2 border-default-r pr-2">
          {{ targetUserInfo.gender }}
        </span>
        <template v-if="targetUserInfo.birthday">
          <span class="mr-2 border-default-r pr-2">
            {{ getAgeText }}
          </span>
          <span class="mr-2 border-default-r pr-2">
            {{ targetUserInfo.birthday || ' - ' }}
          </span>
          <span>
            {{ getConstellation }}
          </span>
        </template>
      </p>
      <p mt-6 truncate text-sm>
        <i class="i-carbon:send mr-3 p-2" />
        签名：{{ targetUserInfo.slogan || ' - ' }}
      </p>
      <p mt-6 truncate text-sm>
        <i class="i-tabler:calendar mr-3 p-2" />
        距离生日还有：{{ getBirthdayCount || ' - ' }}天
      </p>
      <!-- <p mt-6 truncate text-sm>
        <i class="i-carbon:phone-incoming mr-3 p-2" />
      </p> -->
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
        @click="chat.toContactSendMsg('userId', userId)"
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

