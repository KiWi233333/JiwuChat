<script lang="ts" setup>
import type { ScrollbarDirection } from "element-plus";
import { ChatRoomRoleEnum, InvitePermissionEnum, InvitePermissionEnumMap } from "~/composables/api/chat/room";

type EditFormItems = "name" | "notice" | "";

// store
const chat = useChatStore();
const setting = useSettingStore();
const user = useUserStore();

// ref
const searchInputRef = useTemplateRef("searchInputRef");
const noticeInputRef = useTemplateRef("noticeInputRef");
const nameInputRef = useTemplateRef("nameInputRef");

// data
const editFormFieldRaw = ref<EditFormItems>("");
const editFormField = computed<EditFormItems>({
  get() {
    return editFormFieldRaw.value;
  },
  set(val) {
    editFormFieldRaw.value = val;
    nextTick(() => {
      if (val === "notice" && noticeInputRef.value)
        noticeInputRef?.value?.focus();
      else if (val === "name" && nameInputRef.value)
        nameInputRef?.value?.focus();
    });
  },
});

const {
  showSearch,
  isTheGroupOwner,
  isNotExistOrNorFriend,
  theContactClone,
  searchUserWord,
  imgList,
  isLord,
  memberList,
  inputOssFileUploadRef,
  isReload,
  isLoading,
  loadData,
  reload,
  onSubmitImages,
  toggleImage,
  submitUpdateRoom,
  onMemberContextMenu,
  onExitOrClearGroup,
} = useRoomGroupPopup({
  editFormField,
});

const isScrollTop = ref(false);
function handleEndReachedMember(direction: ScrollbarDirection) {
  if (direction === "bottom") {
    loadData();
    isScrollTop.value = false;
  }
  else if (direction === "top") {
    isScrollTop.value = true;
  }
}
// 处理成员点击事件
function handleMemberClick(event: MouseEvent, member: any, index: number) {
  // 移动端点击显示右键菜单
  if (setting.isMobileSize) {
    onMemberContextMenu(event, member);
  }
}

// 邀请进群（由 store 统一校验邀请权限并打开弹窗）
function handleAddMember() {
  chat.openInviteMemberForm(chat.theRoomId!, []);
}

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
</script>

<template>
  <el-scrollbar
    v-if="chat.isOpenGroupMember && chat.theContact.type === RoomType.GROUP"
    v-bind="$attrs"
    class="group scroll-root relative"
    wrap-class="pb-8 sm:pb-4"
  >
    <!-- 移动端：分组列表样式（群信息） -->
    <div
      class="group-section group-section-info w-full flex-1 select-none text-3.5 leading-1.8em !mt-0"
    >
      <div relative>
        群头像
        <CommonOssFileUpload
          ref="inputOssFileUploadRef"
          :is-animate="false"
          :show-edit="false"
          :disable="!isLord"
          :multiple="false"
          :limit="1"
          accept="image/png, image/jpeg, image/webp, image/svg+xml,image/bmp, image/tiff, image/heic, image/heif, image/jfif, image/pjpeg, image/pjp"
          input-class="w-3rem mt-1 h-3rem flex-shrink-0 card-default"
          :class="!isLord ? 'cursor-no-drop' : 'cursor-pointer'"
          :upload-quality="0.3"
          :model-value="imgList"
          @click="toggleImage"
          @error-msg="(msg:string) => {
            ElMessage.error(msg)
          }"
          @submit="onSubmitImages"
        />
      </div>
      <div mt-3 class="label-item">
        <span select-none>群聊名称</span>
        <i v-show="isLord && editFormField !== 'name'" i-solar:pen-2-bold ml-2 p-2 op-0 transition-opacity @click="editFormField = 'name'" />
        <div
          class="dark:op-70"
        >
          <el-input
            v-if="theContactClone"
            ref="nameInputRef"
            v-model.lazy="theContactClone.name"
            :disabled="!isLord || editFormField !== 'name'"
            type="text"
            :maxlength="30"
            style="width: fit-content;"
            placeholder="未填写"
            @keydown.enter="submitUpdateRoom('name', theContactClone.name)"
            @blur.stop="submitUpdateRoom('name', theContactClone.name)"
          />
        </div>
      </div>
      <div class="label-item">
        <div mt-3 select-none>
          群公告
          <i v-show="isLord && editFormField !== 'notice'" i-solar:pen-2-bold ml-2 p-2 op-0 transition-opacity @click="editFormField = 'notice'" />
        </div>
        <el-input
          v-if="editFormField === 'notice' && theContactClone?.roomGroup?.detail"
          ref="noticeInputRef"
          v-model="theContactClone.roomGroup.detail.notice"
          :disabled="!isLord || editFormField !== 'notice'"
          :rows="8"
          :maxlength="200"
          class="scroll-bar mt-2 border-none bg-transparent transition-200 card-rounded-df"
          type="textarea"
          style="resize:none;width: 100%;"
          placeholder="未填写"
          @keydown.enter.stop="submitUpdateRoom('notice', theContactClone?.roomGroup?.detail?.notice)"
          @blur="submitUpdateRoom('notice', theContactClone?.roomGroup?.detail?.notice)"
        />
        <el-scrollbar v-else max-height="8em" class="scroll-bar border-none bg-transparent text-small transition-200 card-rounded-df" @click.stop="isLord && (editFormField = 'notice')">
          <div class="notice">
            {{ theContactClone?.roomGroup?.detail?.notice || "暂无公告" }}
          </div>
        </el-scrollbar>
      </div>
    </div>

    <!-- 移动端：分组列表样式（群成员） -->
    <div class="group-section group-section-members sm:(border-default-2-t) !sm:mt-4">
      <div class="label-item select-none">
        <div class="flex items-center gap-2">
          <small>群成员</small>
          <CommonIconTip
            class="group-action-btn ml-a min-h-8 min-w-8 flex items-center justify-center rounded-lg transition-colors active:bg-color-3 hover:bg-color-2 active:opacity-80"
            icon="i-solar:add-circle-linear"
            tip="添加群成员"
            @click="handleAddMember"
          />
          <CommonIconTip
            class="group-action-btn min-h-8 min-w-8 flex items-center justify-center rounded-lg transition-colors active:bg-color-3 hover:bg-color-2 active:opacity-80"
            icon="i-solar:magnifer-linear"
            tip="搜索群成员"
            @click="() => {
              showSearch = !showSearch
              if (showSearch) {
                searchInputRef?.focus?.()
              }
            }"
          />
        </div>
      </div>
      <!-- 搜索群聊 -->
      <div
        class="header mt-3 h-10 transition-height"
        :class="{
          '!h-0 overflow-y-hidden': !showSearch,
        }"
      >
        <ElInput
          ref="searchInputRef"
          v-model.lazy="searchUserWord"
          name="search-content"
          type="text"
          size="small"
          class="el-borderless h-8"
          clearable
          autocomplete="off"
          :prefix-icon="ElIconSearch"
          minlength="2"
          maxlength="30"
          placeholder="搜索群成员"
          @blur.stop="() => searchUserWord === '' && (showSearch = false)"
        />
      </div>

      <!-- 群成员虚拟列表 -->
      <CommonListVirtualScrollList
        :items="memberList"
        item-height="2.75rem"
        height="15rem"
        :overscan="20"
        :get-item-key="item => `${chat.theRoomId!}_${item.userId}`"
        class-name="min-h-14rem card-rounded-df scroll-2 relative"
        active-class="active"
        enable-pull-to-refresh
        :pull-trigger-distance="30"
        :pull-distance="60"
        pull-refresh-text="下拉刷新"
        pull-release-text="释放刷新"
        pull-refreshing-text="正在刷新..."
        @refresh="reload"
        @end-reached="handleEndReachedMember"
      >
        <template #default="{ item: member }">
          <div
            :class="member.activeStatus === ChatOfflineType.ONLINE ? 'live' : 'op-60 filter-grayscale filter-grayscale-100'"
            class="user-card w-full flex-row-c-c gap-2"
            @click="handleMemberClick($event, member, 0)"
            @dblclick="onMemberContextMenu($event, member)"
            @contextmenu="onMemberContextMenu($event, member)"
          >
            <div class="relative flex-row-c-c" :title="member.nickName || '未知'">
              <CommonElImage
                :default-src="member.avatar"
                fit="cover"
                load-class="none"
                error-class="i-solar-user-line-duotone p-2 op-80"
                class="h-2rem w-2rem flex-shrink-0 overflow-auto border-default rounded-1/2 object-cover"
              />
              <span class="g-avatar" />
            </div>
            <small truncate>{{ member.nickName || "未填写" }}</small>
            <div class="tags ml-a block pl-1">
              <el-tag
                v-if="member.userId === user.userInfo.id"
                class="mr-1"
                style="font-size: 0.6em;border-radius: 2rem;"
                size="small"
                type="warning"
              >
                我
              </el-tag>
              <small
                v-if="member.roleType && member.roleType !== ChatRoomRoleEnum.MEMBER"
                class="role h-fit w-fit rounded-8 px-3 py-0.5 text-0.8rem leading-0.7rem"
                :class="chatRoomRoleClassMap[`${member.roleType}-border`]"
              >{{ chatRoomRoleTextMap[member.roleType] }}</small>
            </div>
          </div>
        </template>

        <template #empty>
          <div v-show="!isReload || !isLoading" class="flex-row-c-c flex-col py-6 text-mini">
            <i class="i-solar:users-group-two-rounded-line-duotone mb-2 p-3" />
            <span>暂无群成员</span>
          </div>
        </template>

        <template #end>
          <!-- loading -->
          <div v-show="isLoading && !isReload" class="flex-row-c-c py-4 text-mini">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 animate-spin select-none" viewBox="0 0 24 24"><g fill="none" fill-rule="evenodd"><path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.020-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" /><path fill="currentColor" d="M12 4.5a7.5 7.5 0 1 0 0 15a7.5 7.5 0 0 0 0-15M1.5 12C1.5 6.201 6.201 1.5 12 1.5S22.5 6.201 22.5 12S17.799 22.5 12 22.5S1.5 17.799 1.5 12" opacity=".1" /><path fill="currentColor" d="M12 4.5a7.46 7.46 0 0 0-5.187 2.083a1.5 1.5 0 0 1-2.075-2.166A10.46 10.46 0 0 1 12 1.5a1.5 1.5 0 0 1 0 3" /></g></svg>
            &nbsp;加载中...
          </div>
        </template>
      </CommonListVirtualScrollList>
    </div>

    <!-- 入群方式：所有人可见，默认禁用，仅群主可编辑 -->
    <div class="group-section group-section-invite sm:border-default-2-t">
      <div class="label-item select-none text-3.5">
        <div class="title mb-2 text-small">
          群聊设置
        </div>
        <div class="setting-row group min-h-fit flex flex-row-bt-c items-center gap-2 rounded-lg transition-colors sm:mt-2 sm:min-h-0 sm:py-0">
          <small class="text-0.8rem text-small">邀请权限</small>
          <CommonIconTip
            tip="群主可设置邀请权限"
            icon="i-solar:info-circle-linear text-small"
            class="ml-a text-mini op-0 sm:group-hover:op-100"
            :background="false"
          />
          <el-select
            :disabled="!isLord"
            :model-value="theContactClone?.roomGroup?.detail?.invitePermission ?? InvitePermissionEnum.ANY"
            class="el-borderless max-w-32"
            :size="setting.isMobileSize ? 'default' : 'small'"
            placeholder="选择入群方式"
            @change="(val: InvitePermissionEnum) => submitUpdateRoom('invitePermission', val)"
          >
            <el-option
              v-for="(label, key) in InvitePermissionEnumMap"
              :key="key"
              :label="label"
              :value="Number(key)"
            />
          </el-select>
        </div>
      </div>
    </div>

    <!-- 移动端：分组列表样式（会话设置） -->
    <div class="group-section group-section-settings sm:(border-default-2-t) !sm:mt-4">
      <div class="label-item select-none text-3.5">
        <div class="title mb-2 text-small">
          会话设置
        </div>
        <div class="setting-row min-h-fit flex flex-row-bt-c items-center rounded-lg transition-colors sm:mt-2 sm:min-h-0 active:bg-color-3 sm:py-0">
          <small class="text-0.8rem text-small">设为置顶</small>
          <el-switch
            :model-value="isPin"
            :size="setting.isMobileSize ? 'default' : 'small'"
            :loading="isPinLoading"
            class="group-switch"
            :before-change="changIsPin"
          />
        </div>
        <div class="setting-row min-h-fit flex flex-row-bt-c items-center rounded-lg transition-colors sm:mt-2 sm:min-h-0 active:bg-color-3 sm:py-0">
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

    <!-- 退出（移动端分组样式） -->
    <CommonElButton
      v-show="!chat.contactMap[chat.theRoomId!]?.hotFlag"
      icon-class="i-solar:logout-3-broken mr-2"
      :size="setting.isMobileSize ? 'large' : 'default'"
      plain
      type="danger"
      class="group-exit-btn mt-3 w-full border-none bg-color sm:(border-default-2 bg-color-3) !transition-200"
      @click="onExitOrClearGroup"
    >
      <span>
        {{ isNotExistOrNorFriend ? '不显示聊天' : isTheGroupOwner ? '解散群聊' : '退出群聊' }}
      </span>
    </CommonElButton>
    <!-- 渐变色 -->
    <div class="shadow-linear pointer-events-none absolute bottom-0 left-0 z-1 block h-12 w-full w-full select-none text-center" />
  </el-scrollbar>
</template>

<style lang="scss" scoped>
/* 仅移动端：分组列表卡片（微信/iOS 设置风格） */
.group-section {
  --at-apply: "mt-3 rounded-xl bg-color px-4 py-3 shadow-sm";
  @media (min-width: 640px) {
    margin-top: 0;
    border-radius: 0;
    padding: 0;
    box-shadow: none;
    background: transparent;
  }
}
.group-section-info {
  @media (min-width: 640px) {
    padding-top: 0;
  }
}
.group-section-members {
  @media (min-width: 640px) {
    padding-top: 0.75rem;
  }
}
.group-section-invite {
  @media (min-width: 640px) {
    padding-top: 0.75rem;
  }
}
.group-section-settings {
  @media (min-width: 640px) {
    padding-top: 0.75rem;
  }
}
.group-section-exit {
  @media (min-width: 640px) {
    padding-top: 1.5rem;
  }
}
.group-exit-btn {
  --at-apply: "transition-opacity active:opacity-80";
  @media (min-width: 640px) {
    margin-top: 1.5rem;
  }
}

.g-avatar {
  --at-apply: "border-default z-1 absolute bottom-0.2em right-0.2em rounded-full block w-2 h-2 ";
}
.user-card {
  --at-apply: "h-2.75rem flex-shrink-0 cursor-pointer flex-row-c-c p-1.5 relative gap-2 truncate card-rounded-df filter-grayscale w-full hover:(bg-color-2 op-100)";
  /* 移动端扩大可点击区域与点击态 */
  @media (max-width: 639px) {
    min-height: 2.75rem;
    padding: 0.5rem 0.75rem;
    transition:
      background-color 0.15s ease,
      opacity 0.15s ease;
    &:active {
      --at-apply: "bg-color-3";
      opacity: 0.9;
    }
  }
  .tags {
    :deep(.el-tag) {
      transition: none;
    }
  }
}

.is-grid {
  // grid-template-columns: repeat(auto-fit, minmax(3em, 1fr)); // 设置网格布局，并设置列数为自动适应，每个列的宽度为1fr（占据可用空间）
  .user-card {
    --at-apply: "sm:mx-0 mx-a";
    width: fit-content;
  }
}

.notice {
  // 允许换行符号
  white-space: pre-wrap;
}

.live {
  .g-avatar {
    background-color: var(--el-color-info);
  }
  filter: none;
}
:deep(.el-scrollbar__thumb) {
  opacity: 0.5;
}
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
  &:hover i {
    opacity: 1;
    cursor: pointer;
  }
}
:deep(.el-textarea) {
  .el-textarea__inner {
    color: inherit !important;
    caret-color: var(--el-color-info);
    box-shadow: none;
    padding: 0;
    background-color: transparent;
    cursor: pointer;
    resize: none;
  }
  &.is-disabled {
    box-shadow: none;
    resize: none;
  }
}
.shadow-linear {
  cursor: none;
  pointer-events: none;
  // 渐变色
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 1) 100%);
}
.dark .shadow-linear {
  background: linear-gradient(to bottom, rgba(31, 31, 31, 0) 0%, rgba(31, 31, 31, 1) 100%);
}
@media (max-width: 640px) {
  .shadow-linear {
    background: linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(242, 242, 242, 1) 100%) !important;
  }
  .dark .shadow-linear {
    background: linear-gradient(to bottom, rgba(31, 31, 31, 0) 0%, rgba(17, 17, 17, 1) 100%) !important;
  }
}

.header {
  :deep(.el-input) {
    .el-input__wrapper {
      --at-apply: "!shadow-none text-sm !outline-none input-bg-color";
    }
  }
  .icon {
    --at-apply: "h-2rem w-2rem flex-row-c-c btn-primary-bg  input-bg-color";
  }
}
.scroll-root > {
  :deep(.el-scrollbar__bar) {
    display: none !important;
    opacity: 0 !important;
  }
}
.scroll-2 {
  :deep(.el-scrollbar__bar) {
    opacity: 0.5;
  }
}
</style>
