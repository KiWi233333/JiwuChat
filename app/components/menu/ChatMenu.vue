<script lang="ts" setup>
import { NuxtLink } from "#components";

defineEmits<{
  (e: "close"): void
}>();
// 路由
const route = useRoute();
const user = useUserStore();
const ws = useWsStore();
const setting = useSettingStore();
const chat = useChatStore();

/**
 * 获取好友申请数量 (未读)
 */
async function getApplyCount() {
  if (!user.getTokenFn())
    return;
  const res = await getApplyUnRead(user.getToken);
  if (res.code === StatusCode.SUCCESS) {
    chat.applyUnReadCount = res.data.unReadCount;
  }
}
watch(() => route.path, (newVal, oldVal) => {
  if (newVal === "/friend" || oldVal === "/friend") {
    getApplyCount();
  }
});
watch(() => ws.wsMsgList.applyMsg.length, (newVal, oldVal) => {
  getApplyCount();
});
onMounted(() => {
  getApplyCount();
});
onActivated(() => {
  getApplyCount();
});
onDeactivated(() => {
  getApplyCount();
});

const { open: openExtendMenu } = useOpenExtendWind();
// @unocss-include
const menuList = computed<MenuItem[]>(() => ([
  {
    title: "聊天",
    path: "/",
    icon: "i-solar:chat-line-broken",
    activeIcon: "i-solar:chat-line-bold",
    tipValue: chat.unReadCount,
  },
  {
    title: "好友",
    path: "/friend",
    icon: "i-solar:users-group-rounded-line-duotone",
    activeIcon: "i-solar:users-group-rounded-bold",
    tipValue: chat.applyUnReadCount,
  },
  {
    title: "AI客服",
    path: "/ai",
    icon: "i-ri:robot-2-line",
    activeIcon: "i-ri:robot-2-bold",
  },
  ...(setting.selectExtendMenuList || []).map(p => ({
    title: p.title,
    icon: p.icon,
    activeIcon: p.activeIcon,
    loading: p.loading,
    onClick: () => openExtendMenu(p),
  }) as MenuItem),
  {
    title: "扩展",
    icon: " i-solar:widget-line-duotone hover:(i-solar:widget-bold) ",
    activeIcon: "i-solar:widget-bold",
    onClick: () => chat.showExtension = true,
  },
  {
    title: "API 开发",
    path: "/api/key", // 密钥管理
    icon: "i-solar:code-square-outline",
    activeIcon: "i-solar:code-square-bold",
    class: "absolute bottom-28 diabled-bg",
  },
  {
    title: "账号",
    path: "/user/safe",
    icon: "i-solar:devices-outline",
    activeIcon: "i-solar:devices-bold",
    class: "absolute bottom-15 diabled-bg",
  },
  // {
  //   title: "设置",
  //   path: "/setting",
  //   icon: "i-solar:settings-linear hover:animate-spin block",
  //   activeIcon: "i-solar:settings-bold hover:animate-spin block",
  //   class: "absolute bottom-2 diabled-bg",
  //   tipValue: +setting.appUploader.isUpload,
  //   isDot: true,
  // },
]));

export interface MenuItem {
  title: string
  path?: string
  icon: string
  activeIcon: string
  tipValue?: any
  isDot?: boolean
  class?: string
  children?: MenuItem[]
  onClick?: (e: MouseEvent) => void
}
</script>

<template>
  <div
    class="relative z-998 h-full flex flex-col border-default-r bg-color-2"
  >
    <!-- 顶部 -->
    <div class="nav-padding-top-6 mx-a h-20 w-fit flex-row-c-c flex-shrink-0 border-default-b">
      <UserInfoPopper
        :data="user.userInfo"
        :is-edit="true"
      />
    </div>
    <!-- 菜单 -->
    <el-scrollbar height="100%" class="relative flex-1" :view-class="`flex flex-col gap-3 p-2 ${setting.osType === 'macos' ? 'px-2.8' : ''}`">
      <component
        :is="p.path ? NuxtLink : 'div'"
        v-for="p in menuList"
        :key="p.path"
        v-loading="(p as any).loading" :to="p.path"
        :index="p.path"
        :element-loading-spinner="defaultLoadingIcon"
        element-loading-custom-class="text-.4em"
        :class="{
          action: route.path === p.path,
          [`${p.class}`]: p.class,
        }"
        :title="p.title"
        class="group item"
        @click="(e: MouseEvent) => {
          if (p.onClick) {
            e.stopPropagation();
            p.onClick(e);
          }
        }"
      >
        <el-badge :value="p.tipValue" :hidden="!p?.tipValue" :is-dot="!!p?.isDot" :offset="[-2, -2]" :max="99">
          <i class="icon p-2.6" :class="route.path === p.path ? p.activeIcon : p.icon" />
        </el-badge>
      </component>
      <!-- 设置 -->
      <div
        title="设置"
        class="group item absolute bottom-2 !bg-transparent"
      >
        <el-badge :value="+setting.appUploader.isUpload" :hidden="!setting.appUploader.isUpload" :is-dot="true" :offset="[-2, -2]" :max="99">
          <MenuMore>
            <i class="icon i-solar:hamburger-menu-outline p-3" />
          </MenuMore>
        </el-badge>
      </div>
    </el-scrollbar>
    <div
      v-if="setting.isChatFold"
      class="absolute left-0 top-0 block h-100dvh w-100vw overflow-hidden bg-[#8181811a] -z-1 md:hidden"
      style="background-color: #2222223a;"
      @click="setting.isChatFold = false"
    />
  </div>
</template>

<style lang="scss" scoped>
.icon-tip {
  position: absolute;
  right: 0;
  top: 0;
}
.item {
  --at-apply: "card-rounded-df hover:(bg-gray-3 bg-op-30 dark:(bg-dark-3 bg-op-30) text-color-theme-primary) h-10 w-10 flex-row-c-c cursor-pointer transition-200";

  .icon {
    --at-apply: "dark:op-80";
  }
  &:hover {
    .icon {
      --at-apply: "op-100";
    }
  }
  &.action {
    --at-apply: "text-theme-primary bg-gray-4 bg-op-20 dark:(bg-dark-3 bg-op-20)";
    .icon {
      --at-apply: "text-theme-primary op-100 block";
      filter: drop-shadow(0 0 8px var(--el-color-primary));
    }
  }
  :deep(.el-badge) {
    .el-badge__content {
      font-size: 0.6em !important;
    }
  }
}
:deep(.el-scrollbar) {
  .el-scrollbar__thumb {
    --at-apply: "bg-color-3";
  }
}
</style>
