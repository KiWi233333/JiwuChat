<script setup lang="ts">
import { dayjs } from "element-plus";

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

const getCreateTime = computed(() => room.value.createTime ? dayjs(room.value.createTime).format("YYYY年MM月DD日") : "未知");
const getRoleText = computed(() => room.value.role !== undefined ? chatRoomRoleTextMap[room.value.role] : "成员");
</script>

<template>
  <div
    v-bind="$attrs"
    class="h-full w-full flex flex-1 flex-col gap-6 px-10 transition-300 sm:px-1/4 !pt-14vh sm:!pt-20vh"
  >
    <!-- 顶部信息 -->
    <div flex gap-4 border-default-b pb-6 sm:gap-6>
      <CardElImage
        error-class="i-solar:users-group-rounded-bold-duotone p-5"
        :src="BaseUrlImg + data.data.avatar" fit="cover"
        :preview-src-list="[BaseUrlImg + data.data.avatar]"
        preview-teleported
        loading="lazy"
        class="h-4rem w-4rem flex-shrink-0 overflow-auto border-default card-default object-cover shadow-sm sm:(h-4.8rem w-4.8rem)"
      />
      <div flex flex-col gap-1 py-1>
        <strong h-1.2em truncate text-1.2rem leading-1em>{{ room.groupName }}</strong>
        <p mt-a truncate text-xs text-color>
          成员：
          <span class="content" :title="getCreateTime">
            <span class="text-theme-info">{{ room.onlineNum || 0 }}</span> / {{ room.hotFlag === isTrue.TRUE ? '∞' : (room.allUserNum || 0) }}
          </span>
        </p>
        <p truncate text-mini>
          群号：
          <BtnCopyText icon="i-solar:copy-bold-duotone" :text="room.roomId" class="inline">
            {{ room.roomId }}
          </BtnCopyText>
        </p>
      </div>
    </div>
    <!-- 群详情 -->
    <div gap-6 truncate border-default-b pb-6>
      <!-- <p class="line">
        <i class="i-solar:pen-2-linear icon" />
        备注：
        <span text-mini :class="{ 'op-60': !room.remark }">{{ room.remark || '设置群聊备注' }}</span>
      </p> -->
      <p class="line">
        <i class="icon i-solar:user-check-linear" />
        职责：
        <span class="content" :title="getRoleText">
          {{ getRoleText }}
        </span>
      </p>
      <p class="line">
        <i class="icon i-carbon:bullhorn" />
        群公告：
        <span class="content" :title="room.detail?.notice || '-'">
          {{ room.detail?.notice || '暂无公告' }}
        </span>
        <i i-solar:alt-arrow-right-linear p-2 />
      </p>
      <p class="line">
        <i class="icon i-solar:calendar-line-duotone" />
        创建于：
        <span class="content" :title="getCreateTime">
          {{ getCreateTime }}
        </span>
      </p>
      <p class="line">
        <i class="icon i-solar:users-group-two-rounded-line-duotone" />
        群成员：<span v-if="room.hotFlag !== isTrue.TRUE">( {{ room.allUserNum || 0 }}人 )</span>
        <span class="ml-a btn-primary text-xs" @click="chat.setTheFriendOpt(FriendOptType.GROUP_MEMBER, data.data)">查看全员</span>
      </p>
      <div class="h-8">
        <ChatRoomGroupLine :data="data.data" />
      </div>
    </div>
    <!-- 按钮操作 -->
    <div v-show="!isLoading" class="mx-a">
      <BtnElButton
        key="delete"
        icon-class="i-solar:trash-bin-trash-outline p-2 mr-2"
        style="transition: .2s; max-width: 9em;text-align: center;letter-spacing: 1px;--el-color-primary: var(--el-color-danger);"
        plain
        class="mr-4 op-60 hover:op-100"
        @click="chat.exitGroupConfirm(chat.theRoomId, isGroupOwner, () => {
          chat.setTheFriendOpt(FriendOptType.Empty, {});
          chat.setDelGroupId(roomId);
        })"
      >
        {{ isGroupOwner ? "解散群聊" : "退出群聊" }}&ensp;
      </BtnElButton>
      <BtnElButton
        key="send"
        icon-class="i-solar:chat-line-bold p-2 mr-2"
        style="transition: .2s; max-width: 9em;text-align: center;letter-spacing: 1px;"
        type="primary"
        @click="chat.toContactSendMsg('roomId', roomId)"
      >
        发送消息&ensp;
      </BtnElButton>
    </div>
  </div>
</template>

<style lang="scss" scoped>
/* 保持与私聊页面一致的样式 */
.border-default-b {
  border-bottom: 1px solid var(--el-border-color);
}
.text-mini {
  font-size: 0.8rem;
  opacity: 0.8;
}

.line {
  --at-apply: "mb-6 flex text-sm items-center";
  .icon {
    --at-apply: "shrink-0 mr-3 p-2.2"
  }
  .content {
    --at-apply: "cursor-pointer text-small max-w-20em truncate ml-a"
  }
  .arrow {
    --at-apply: "shrink-0 cursor-pointer";
  }
}
</style>
