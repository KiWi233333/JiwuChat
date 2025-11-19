<script lang="ts" setup>
import type { ChatRoomAdminAddDTO } from "~/composables/api/chat/room";
import ContextMenu from "@imengyu/vue3-context-menu";
import { useAsyncCopyText } from "~/composables/utils";
import { mitter, MittEventType } from "~/composables/utils/useMitt";

const { data } = defineProps<{ data: ChatRoomGroupVO }>();
const ws = useWsStore();
const user = useUserStore();
const setting = useSettingStore();
const chat = useChatStore();

// 组件内变量
const isReload = ref(false); // 是否正在重新加载
const isLoading = ref(false); // 是否正在加载
const pageInfo = ref<PageInfo>({
  size: 15,
  cursor: undefined,
  isLast: false,
});
const memberList = ref<ChatMemberVO[]>([]);
const memberFilterList = computed(() => memberList.value.sort((a, b) => b.activeStatus - a.activeStatus));
const { list: vMemberList, scrollTo, containerProps, wrapperProps } = useVirtualList(
  memberFilterList,
  {
    itemWidth: 42,
    overscan: 10,
  },
);

// 加载数据
async function loadData() {
  if (isLoading.value || pageInfo.value.isLast) {
    return;
  }
  isLoading.value = true;
  const res = await getRoomGroupUserPage(
    data.roomId,
    pageInfo.value.size,
    pageInfo.value.cursor,
    user.getToken,
  );
  if (res.code === StatusCode.SUCCESS) {
    pageInfo.value.isLast = res.data.isLast;
    pageInfo.value.cursor = res.data.cursor || undefined;
    if (res.data.list) {
      memberList.value.push(...res.data.list);
    }
  }
  isLoading.value = false;
}

// 重新加载数据
async function reload() {
  memberList.value = [];
  pageInfo.value.cursor = undefined;
  pageInfo.value.isLast = false;
  isReload.value = true;
  scrollTo(0);
  await loadData();
  isReload.value = false;
}

// 添加好友
const theUser = ref<ChatMemberVO | undefined>(undefined);

// 权限相关
const getTheRoleType = computed(() => data?.role);
const isTheGroupOwner = computed(() => data?.role === ChatRoomRoleEnum.OWNER);
const isTheGroupPermission = computed(() => data?.role === ChatRoomRoleEnum.OWNER || data?.role === ChatRoomRoleEnum.ADMIN);

// 右键菜单
function onContextMenu(e: MouseEvent, item: ChatMemberVO) {
  e.preventDefault();
  const isSelf = user.userInfo.id === item.userId;
  ContextMenu.showContextMenu({
    x: e.x,
    y: e.y,
    theme: setting.contextMenuTheme,
    items: [
      {
        label: "@ 他",
        hidden: isSelf,
        onClick: () => navigateToUserDetail(item.userId),
      },
      {
        icon: "btn-info i-solar:user-bold ",
        label: "联系他",
        hidden: isSelf,
        onClick: () => navigateToUserDetail(item.userId),
      },
      {
        label: "添加好友",
        icon: "i-carbon:add-large btn-info",
        hidden: isSelf,
        onClick: () => {
          isChatFriend({ uidList: [item.userId] }, user.getToken).then((res) => {
            if (res.code !== StatusCode.SUCCESS) {
              return ElMessage.error(res.msg || "申请失败，请稍后再试！");
            }
            const userFriend = res.data.checkedList.find((p: FriendCheck) => p.uid === item.userId);
            if (userFriend && userFriend.isFriend) {
              return ElMessage.warning("申请失败，和对方已是好友！");
            }
            theUser.value = item;
            // 触发全局事件
            mitter.emit(MittEventType.FRIEND_APPLY_DIALOG, {
              show: true,
              userId: item.userId,
            });
          }).catch(() => {
            ElMessage.error("操作失败，请稍后再试！");
          });
        },
      },
      {
        label: "管理员",
        icon: "i-solar:shield-user-bold-duotone btn-warning",
        hidden: isSelf || !isTheGroupOwner.value,
        children: [
          {
            label: "添加",
            hidden: item.roleType === ChatRoomRoleEnum.ADMIN,
            icon: "i-carbon:add-large btn-info",
            onClick: () => {
              toggleAdminRole({
                userId: item.userId,
                roomId: data.roomId,
              }, ChatRoomRoleEnum.ADMIN);
            },
          },
          {
            label: "移除",
            hidden: !item.roleType || item.roleType !== ChatRoomRoleEnum.ADMIN,
            onClick: () => {
              toggleAdminRole({
                userId: item.userId,
                roomId: data.roomId,
              }, ChatRoomRoleEnum.MEMBER);
            },
          },
        ],
      },
      {
        label: "其他",
        children: [
          {
            label: "分享",
            icon: "i-solar:share-line-duotone",
            onClick: async () => {
              const res = await useAsyncCopyText(`${window.location.origin}/user?id=${item.userId}`);
              if (res) {
                ElMessage.success("成功复制至剪贴板！");
              }
            },
          },
        ],
      },
      {
        label: "踢出群聊",
        icon: "i-solar:logout-3-broken",
        divided: "up",
        hidden: isSelf || !isTheGroupPermission.value,
        onClick: () => {
          ElMessageBox.confirm("是否将该用户踢出群聊？", {
            title: "提示",
            center: true,
            confirmButtonText: "踢出",
            cancelButtonText: "取消",
            confirmButtonClass: "btn-error",
            lockScroll: false,
            callback: async (action: string) => {
              if (action === "confirm") {
                const res = await exitRoomGroupByUid(data.roomId, item.userId, user.getToken);
                if (res.code === StatusCode.SUCCESS) {
                  memberList.value = memberList.value.filter(e => e.userId !== item.userId);
                }
              }
            },
          });
        },
      },
    ],
  });
}

// 切换管理员角色
function toggleAdminRole(dto: ChatRoomAdminAddDTO, type: ChatRoomRoleEnum) {
  const isAdmin = type === ChatRoomRoleEnum.ADMIN;
  ElMessageBox.confirm(`是否将该用户${isAdmin ? "设为" : "取消"}管理员？`, {
    title: "提示",
    center: true,
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    lockScroll: false,
    callback: async (action: string) => {
      if (action === "confirm") {
        const fn = isAdmin ? addChatRoomAdmin : delChatRoomAdmin;
        const res = await fn(dto, user.getToken);
        if (res.code === StatusCode.SUCCESS) {
          ElNotification.success("操作成功！");
          for (const p of memberList.value) {
            if (p.userId === dto.userId) {
              p.roleType = type;
              break;
            }
          }
        }
        else {
          ElMessage.error(res.msg || "操作失败，请稍后再试！");
        }
      }
    },
  });
}

// 监听 roomId 变化，自动加载数据
watch(() => data.roomId, (newRoomId) => {
  if (!newRoomId) {
    return;
  }
  reload();
}, {
  immediate: true,
});

// 上下线消息更新
watchThrottled(() => ws.wsMsgList.onlineNotice, (list) => {
  if (list.length) {
    for (const p of list) {
      if (!p.changeList)
        return;
      for (const item of memberList.value) {
        for (const k of p.changeList) {
          if (k.userId === item.userId) {
            item.activeStatus = k.activeStatus;
            break;
          }
        }
      }
    }
  }
}, {
  deep: true,
  immediate: true,
});

// 邀请进群
function onInviteMember() {
  chat.inviteMemberForm = {
    show: true,
    roomId: data.roomId,
    uidList: [],
  };
}
</script>

<template>
  <!-- <i class="block h-1.8em w-1.8em rounded-2rem sm:(h-1.6em w-1.6em) btn-info border-default" i-carbon:add-large @click="onAdd" /> -->
  <div class="relative">
    <div v-if="!isReload" class="h-42px w-500px overflow-hidden" v-bind="wrapperProps">
      <div class="w-500px flex items-center overflow-x-auto" v-bind="containerProps">
        <div
          v-for="p in vMemberList"
          :key="`${data.roomId}_${p.data.userId}`"
          class="item"
          :class="p.data.activeStatus === ChatOfflineType.ONLINE ? 'live' : 'op-50 filter-grayscale filter-grayscale-100 '"
          :title="p.data.nickName"
          @contextmenu="($event) => onContextMenu($event, p.data)"
          @click="chat.setTheFriendOpt(FriendOptType.User, {
            id: p.data.userId,
          })"
        >
          <CardElImage
            :default-src="p.data.avatar"
            fit="cover"
            error-class="i-solar-user-line-duotone"
            class="avatar"
          />
          <span class="g-avatar" />
        </div>
      </div>
      <div class="right" @click="onInviteMember">
        <i class="i-carbon:add p-3" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.item {
  --at-apply: "cursor-pointer transition-none  active:(scale-90 transition-150) hover:(transition-150) h-42px w-42px py-3px pr-6px  flex-shrink-0";
  .avatar {
    --at-apply: "flex-shrink-0 rounded-1/2 shadow-md bg-color-2 block w-38px h-38px rounded-1/2";
  }
  .g-avatar {
    --at-apply: "border-default z-1 block w-0.6em h-0.6em rounded-full absolute right-0.2em bottom-0.2em";
  }
  &.live {
    --at-apply: "relative filter-none";
    .g-avatar {
      background-color: var(--el-color-info);
    }
  }
}
.right {
  --at-apply: "absolute z-1 border-default !border-r-0 shadow flex-row-c-c card-default rounded-[25px_0_0_25px] -right-2 top-3px  cursor-pointer transition-right hover:right-0 h-38px w-38px p-3px flex-shrink-0";
}
:deep(.el-scrollbar__thumb) {
  display: none;
}
</style>
