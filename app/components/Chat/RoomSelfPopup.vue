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
    const val = isPin.value ? isTrue.FALESE : isTrue.TRUE;
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
    const val = chat.theContact?.shieldStatus === isTrue.TRUE ? isTrue.FALESE : isTrue.TRUE;
    await chat.setShieldContact(chat.theRoomId!, val);
    return !!val;
  }
  finally {
    shieldStatusLoading.value = false;
  }
}

// 判断是否为AI好友
const isAIFriend = computed(() => chat.theContact?.type === RoomType.AICHAT);

// 判断是否为好友
const isFriend = computed(() => chat.theContact?.type === RoomType.SELFT);

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
        chat.theContact.selfExist = isTrue.FALESE;
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
    v-if="chat.isOpenGroupMember && (chat.theContact?.type === RoomType.SELFT || chat.theContact?.type === RoomType.AICHAT)"
    v-bind="$attrs"
    class="group scroll relative"
    wrap-class="pb-10"
  >
    <div class="w-full flex-1 select-none text-3.5 leading-1.8em">
      <!-- 头像和基本信息 -->
      <div flex>
        <CardElImage
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
            <BtnElButton
              size="small"
              class="ml-2 flex-shrink-0 text-mini tracking-0.2em hover:shadow"
              text
              bg
              icon-class="i-solar:user-outline mr-1"
              @click="chat.theContact.targetUid && navigateToUserDetail(chat.theContact.targetUid)"
            >
              资料
            </BtnElButton>
          </div>
          <p mt-a truncate text-mini>
            邮箱：<BtnCopyText v-if="targetUserInfo.email" icon="i-solar:copy-bold-duotone" :text="targetUserInfo.email" class="inline" />
            <span v-else>-</span>
          </p>
        </div>
      </div>
      <!-- 详细信息 -->
      <div class="my-5 flex flex-col gap-3 border-default-2 border-x-0 py-5 text-mini">
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
      <div class="label-item select-none">
        会话设置
        <div mt-2 flex-row-bt-c>
          <small text-0.8rem text-small>设为置顶</small>
          <el-switch
            :model-value="isPin"
            size="small"
            :loading="isPinLoading"
            :before-change="changIsPin"
          />
        </div>
        <div mt-2 flex-row-bt-c>
          <small text-0.8rem text-small>消息免打扰</small>
          <el-switch
            :model-value="shieldStatus"
            :loading="shieldStatusLoading"
            size="small"
            :before-change="changShieldStatus"
          />
        </div>
      </div>
      <!-- 退出/删除按钮 -->
      <btn-el-button
        v-show="!chat.contactMap[chat.theRoomId!]?.hotFlag"
        icon-class="i-solar:logout-3-broken mr-2"
        type="danger"
        plain
        class="mt-6 w-full"
        @click="onExitOrDeleteFriend"
      >
        <span>
          {{ isAIFriend ? '移除 AI 机器人' : '删除好友' }}
        </span>
      </btn-el-button>
      <!-- 渐变色 不可触发点击 鼠标穿越 -->
      <div class="shadow-linear pointer-events-none absolute bottom-0 left-0 z-1 block h-20 w-full w-full select-none text-center" />
    </div>
  </el-scrollbar>
</template>

<style lang="scss" scoped>
.label-item {
  :deep(.el-input) {
    .el-input__wrapper {
      background: transparent;
      box-shadow: none;
      color: inherit !important;
      padding: 0;
    }
    .el-input__inner {
      color: inherit !important;
      caret-color: var(--el-color-info);
      cursor: pointer;
    }
  }
}

.shadow-linear {
  // 渐变色
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 1) 100%);
}
.dark .shadow-linear {
  background: linear-gradient(to bottom, rgba(31, 31, 31, 0) 0%, rgba(31, 31, 31, 1) 100%);
}

.scroll {
  :deep(.el-scrollbar__thumb) {
    display: none;
  }
}
</style>
