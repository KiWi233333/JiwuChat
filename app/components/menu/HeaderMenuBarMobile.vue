<script lang="ts" setup>
import { appName } from "@/constants/index";

const {
  navClass = "z-999 h-3.5rem relative left-0 top-0 flex-row-bt-c select-none gap-4 rounded-b-0 px-3 border-default-b bg-color",
} = defineProps<{
  navClass?: string
}>();

const setting = useSettingStore();
const chat = useChatStore();
const route = useRoute();

async function toggleContactSearch() {
  setting.isOpenContactSearch = !setting.isOpenContactSearch;
  if (!setting.isOpenContactSearch)
    return;
  await nextTick();
  const el = document.querySelector("#search-contact") as any;
  if (el)
    el?.focus();
}

const hiddenCountTip = computed(() => chat.isOpenContact || !chat.unReadCount);

async function toggleContactOpen() {
  if (route.path !== "/") {
    await navigateTo("/");
    return false;
  }
  if (chat.isOpenGroupMember) {
    chat.isOpenGroupMember = false;
    return false;
  }
  if (!chat.isOpenContact) {
    chat.isOpenContact = true;
    return false;
  }
}

const getAppTitle = computed(() => {
  if (route.path === "/")
    return appName;
  else if (route.path === "/friend")
    return "联系人";
  else if (route.path === "/ai")
    return "AI";
  else if (route.path === "/user")
    return "";
  else if (route.path === "/user/safe")
    return "账号与安全";
  else if (route.path === "/setting")
    return "设置";
});
</script>

<template>
  <menu class="group min-h-6" :class="navClass">
    <!-- 菜单栏 -->
    <slot name="left">
      <div
        class="relative z-1000 mr-a btn-primary"
        :class="!chat.isOpenContact ? 'flex-row-c-c animate-zoom-in animate-duration-200' : 'hidden '"
        @click="toggleContactOpen"
      >
        <i i-solar-alt-arrow-left-line-duotone p-3 />
        <small v-show="!hiddenCountTip" class="unread-count-badge font-500">
          {{ chat.unReadCount > 99 ? '99+' : chat.unReadCount }}
        </small>
      </div>
    </slot>
    <!-- 拖拽区域 -->
    <div class="absolute left-0 top-0 z-0 h-full w-full flex-row-c-c" :data-tauri-drag-region="setting.isDesktop">
      <slot name="drag-content" />
    </div>
    <slot name="center" :app-title="getAppTitle" />
    <!-- 会话搜索框 -->
    <slot name="search-contact">
      <i
        v-if="$route.path === '/' && chat.isOpenContact"
        class="i-solar:magnifer-outline ml-a btn-primary"
        title="搜索会话"
        @click="toggleContactSearch"
      />
    </slot>
    <!-- 菜单栏右侧 -->
    <slot name="right">
      <div class="right relative z-1 flex items-center gap-1">
        <!-- 下载（部分端） -->
        <BtnDownload v-if="!setting.isWeb" icon-class="block mx-1 w-5 h-5" />
        <!-- 折叠菜单 -->
        <MenuDots>
          <template #btn>
            <div
              text
              class="mx-1 w-2em flex-row-c-c btn-primary"
              size="small"
              title="菜单"
            >
              <i class="i-solar:add-circle-linear p-2.6" />
            </div>
          </template>
        </MenuDots>
      </div>
    </slot>
  </menu>
</template>

<style lang="scss" scoped>
.unread-count-badge {
  --at-apply: "bg-color-2 shadow-sm !text-gray  shadow-inset text-0.7rem h-fit py-0.2em rounded-2em px-2";
}
@media screen and (max-width: 768px) {
  .menus {
    :deep(.el-button) {
      background-color: transparent !important;
    }
  }
}
</style>
