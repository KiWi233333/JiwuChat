<script lang="ts" setup>
// store
const chat = useChatStore();
const setting = useSettingStore();
const user = useUserStore();

// data
const theContactClone = computed(() => {
  if (!chat.theContact)
    return null;
  return JSON.parse(JSON.stringify(chat.theContact));
});

const isPin = computed(() => !!chat.theContact?.pinTime);
const isPinLoading = ref(false);
async function changIsPin() {
  isPinLoading.value = true;
  try {
    const val = isPin.value ? isTrue.FALSE : isTrue.TRUE;
    await chat.setPinContact(chat.theRoomId!, val);
    return !!val;
  }
  finally {
    isPinLoading.value = false;
  }
}

const shieldStatus = computed(() => chat.theContact?.shieldStatus === isTrue.TRUE);
const shieldStatusLoading = ref(false);
async function changShieldStatus() {
  shieldStatusLoading.value = true;
  try {
    const val = chat.theContact?.shieldStatus === isTrue.TRUE ? isTrue.FALSE : isTrue.TRUE;
    await chat.setShieldContact(chat.theRoomId!, val);
    return !!val;
  }
  finally {
    shieldStatusLoading.value = false;
  }
}

// 判断是否为AI好友
const isAIFriend = computed(() => chat.theContact?.type === RoomType.AI_CHAT);

// 判断是否为好友
const isFriend = computed(() => chat.theContact?.type === RoomType.SELF);

// 添加好友信息相关数据
const targetUserInfo = ref<Partial<CommUserVO>>({});
const isLoading = ref(true);

// 年龄计算
const getAgeText = computed(() => calculateAge(targetUserInfo.value?.birthday));
const getConstellation = computed(() => computeConstellation(targetUserInfo.value?.birthday));
const getBirthdayCount = computed(() => calculateBirthdayCount(targetUserInfo.value?.birthday));

// 加载用户数据
async function loadUserData(uid: string) {
  if (!uid)
    return;
  isLoading.value = true;
  try {
    const res = await getCommUserInfoSe(uid, user.getToken);
    if (res.code === StatusCode.SUCCESS) {
      targetUserInfo.value = res.data;
      chat.updateContact(chat.theRoomId!, {
        name: res.data.nickname,
        avatar: res.data.avatar,
      });
    }
  }
  catch (e) {
    console.error(e);
  }
  finally {
    isLoading.value = false;
  }
}

// 监听联系人变化，加载用户信息
watch(() => chat.theContact?.targetUid, (val) => {
  if (val)
    loadUserData(val);
}, { immediate: true });

// 退出或删除好友
async function onExitOrDeleteFriend() {
  if (!chat.theContact)
    return;

  try {
    if (!chat.theContact.targetUid) {
      return ElMessage.warning("房间信息不完整，请重新加载！");
    }
    deleteFriendConfirm(chat.theContact.targetUid, user.getToken, undefined, (done?: isTrue) => {
      if (done === isTrue.TRUE) {
        ElMessage.success("删除好友成功！");
        chat.theContact.selfExist = isTrue.FALSE;
      }
    });
  }
  catch (error) {
    ElMessage.error("操作失败");
  }
}
</script>

<template>
  <el-scrollbar
    v-if="chat.isOpenGroupMember && (chat.theContact?.type === RoomType.SELF || chat.theContact?.type === RoomType.AI_CHAT)"
    v-bind="$attrs"
    class="group scroll-root relative"
    wrap-class="pb-8 sm:pb-4"
  >
    <!-- 移动端：分组列表样式（好友信息） -->
    <div
      class="group-section group-section-info w-full flex-1 select-none text-3.5 leading-1.8em"
    >
      <!-- 头像和基本信息 -->
      <div flex>
        <CommonElImage
          :src="BaseUrlImg + targetUserInfo.avatar"
          fit="cover"
          :preview-src-list="[BaseUrlImg + targetUserInfo.avatar]"
          preview-teleported
          loading="lazy"
          error-class="i-solar:user-bold-duotone p-3"
          class="mr-3 h-3rem w-3rem flex-shrink-0 overflow-auto border-default-2 card-default object-cover shadow-sm"
        />
        <div w-full flex flex-col justify-between text-sm>
          <div flex items-center>
            <span class="block max-w-10em flex-1 truncate sm:max-w-6em">
              {{ targetUserInfo.nickname || chat.theContact?.name || '未设置' }}
            </span>
            <i ml-a flex-shrink-0 p-2 :class="targetUserInfo.gender === Gender.BOY ? 'i-tabler:gender-male text-blue' : targetUserInfo.gender === Gender.GIRL ? 'i-tabler:gender-female text-pink' : 'i-tabler:gender-transgender text-yellow'" />
            <CommonElButton
              size="small"
              class="ml-2 flex-shrink-0 text-mini tracking-0.2em hover:shadow"
              text
              bg
              icon-class="i-solar:user-outline mr-1"
              @click="chat.theContact?.targetUid && navigateToUserDetail(chat.theContact.targetUid)"
            >
              资料
            </CommonElButton>
          </div>
          <p mt-a truncate text-mini>
            邮箱：<BtnCopyText v-if="targetUserInfo.email" icon="i-solar:copy-bold-duotone" :text="targetUserInfo.email" class="inline" />
            <span v-else>-</span>
          </p>
        </div>
      </div>
      <!-- 详细信息 -->
      <div class="mt-6 flex flex-col gap-3 text-mini sm:(mt-4 border-default-2-t py-2)">
        <p truncate>
          <template v-if="targetUserInfo.birthday">
            <span class="mr-2 border-default-2-r pr-2">
              {{ getAgeText }}
            </span>
            <span class="mr-2 border-default-2-r pr-2">
              {{ targetUserInfo.birthday || ' - ' }}
            </span>
            <span>
              {{ getConstellation }}
            </span>
          </template>
        </p>
        <p truncate>
          <i class="i-carbon:send mr-3 p-2" />
          签名：{{ targetUserInfo.signature || '-' }}
        </p>
        <p truncate>
          <i class="i-tabler:calendar mr-3 p-2" />
          距离生日还有：{{ getBirthdayCount || ' - ' }}天
        </p>
        <p truncate>
          <i class="i-carbon:user mr-3 p-2" />
          上次在线：{{ targetUserInfo.lastLoginTime ? formatContactDate(targetUserInfo.lastLoginTime) : ' - ' }}
        </p>
      </div>
    </div>

    <!-- 移动端：分组列表样式（会话设置） -->
    <div class="group-section group-section-settings sm:border-default-2-t">
      <div class="label-item select-none text-3.5">
        <div class="title mb-2 text-small">
          会话设置
        </div>
        <div class="setting-row min-h-fit flex flex-row-bt-c items-center rounded-lg transition-colors sm:min-h-0 active:bg-color-3 sm:py-0">
          <small class="text-0.8rem text-small">设为置顶</small>
          <el-switch
            :model-value="isPin"
            :size="setting.isMobileSize ? 'default' : 'small'"
            :loading="isPinLoading"
            class="group-switch"
            :before-change="changIsPin"
          />
        </div>
        <div class="setting-row min-h-fit flex flex-row-bt-c items-center rounded-lg transition-colors sm:min-h-0 active:bg-color-3 sm:py-0">
          <small class="text-0.8rem text-small">消息免打扰</small>
          <el-switch
            :model-value="shieldStatus"
            :loading="shieldStatusLoading"
            :size="setting.isMobileSize ? 'default' : 'small'"
            class="group-switch"
            :before-change="changShieldStatus"
          />
        </div>
      </div>
    </div>

    <!-- 退出/删除（移动端分组样式） -->
    <CommonElButton
      v-show="!chat.contactMap[chat.theRoomId!]?.hotFlag"
      icon-class="i-solar:logout-3-broken mr-2"
      :size="setting.isMobileSize ? 'large' : 'default'"
      type="danger"
      plain
      class="group-exit-btn mt-3 w-full border-none bg-color"
      @click="onExitOrDeleteFriend"
    >
      <span>
        {{ isAIFriend ? '移除 AI 机器人' : '删除好友' }}
      </span>
    </CommonElButton>
    <!-- 渐变色 -->
    <div class="shadow-linear pointer-events-none absolute bottom-0 left-0 z-1 block h-12 w-full select-none text-center" />
  </el-scrollbar>
</template>

<style lang="scss" scoped>
.group-section {
  --at-apply: "mt-3 rounded-xl bg-color px-4 py-3 shadow-sm sm:mt-0 sm:rounded-none sm:px-0 sm:py-0 sm:shadow-none sm:bg-transparent";
}
.group-section-info {
  --at-apply: "sm:pt-0";
}
.group-section-settings {
  --at-apply: "sm:pt-3";
}
.group-exit-btn {
  --at-apply: "transition-opacity active:opacity-80 sm:mt-6";
}
/* 输入框样式和通用 input 包装 */
.label-item {
  :deep(.el-input) {
    .el-input__wrapper {
      --at-apply: "bg-transparent shadow-none text-inherit p-0";
    }
    .el-input__inner {
      --at-apply: "text-inherit";
      caret-color: var(--el-color-info);
      cursor: pointer;
    }
  }
}
.shadow-linear {
  --at-apply: "cursor-default pointer-events-none";
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 1) 100%);
}
.dark .shadow-linear {
  background: linear-gradient(to bottom, rgba(31, 31, 31, 0) 0%, rgba(31, 31, 31, 1) 100%);
}
.scroll-root > :deep(.el-scrollbar__bar) {
  display: none !important;
  opacity: 0 !important;
}
</style>
