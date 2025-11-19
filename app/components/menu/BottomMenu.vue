<script lang="ts" setup>
import type { MenuItem } from "./ChatMenu.vue";
import { useOpenExtendWind } from "@/composables/tauri/extension";

defineEmits<{
  (e: "close"): void
}>();
// 路由
const route = useRoute();
const user = useUserStore();
const ws = useWsStore();
const setting = useSettingStore();
const chat = useChatStore();
const applyUnRead = ref(0);
/**
 * 获取好友申请数量 (未读)
 */
async function getApplyCount() {
  if (!user.getTokenFn())
    return;
  const res = await getApplyUnRead(user.getToken);
  if (res.code === StatusCode.SUCCESS) {
    applyUnRead.value = res.data.unReadCount;
  }
}
watch(() => route.path, (newVal, oldVal) => {
  if (newVal === "/friend" || oldVal === "/friend") {
    getApplyCount();
  }
});

const unWatchDebounced = watchDebounced(() => ws.wsMsgList.applyMsg.length, (newVal, oldVal) => {
  getApplyCount();
}, {
  debounce: 300,
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
onBeforeUnmount(() => {
  unWatchDebounced();
});
const { open: openExtendMenu, openItem } = useOpenExtendWind();
// @unocss-include
const menuList = computed<MenuItem[]>(() => [
  {
    title: "聊天",
    path: "/",
    icon: "i-solar:chat-line-broken",
    activeIcon: "i-solar:chat-line-bold",
    tipValue: chat.unReadCount,
    isDot: false,
  },
  {
    title: "好友",
    path: "/friend",
    icon: "i-solar:users-group-rounded-line-duotone",
    activeIcon: "i-solar:users-group-rounded-bold",
    tipValue: applyUnRead.value,
    isDot: false,
  },
  {
    title: "AI",
    path: "/ai",
    icon: "i-solar:ghost-outline",
    activeIcon: "i-solar:ghost-bold",
  },
  {
    title: "个人",
    path: "/user",
    icon: "i-solar:user-outline",
    activeIcon: "i-solar:user-bold",
  },
  {
    title: "更多",
    path: "/more",
    icon: "i-solar-layers-broken ",
    activeIcon: "i-solar-layers-bold ",
    tipValue: +setting.appUploader.isUpload,
    children: [
      // ...(setting.selectExtendMenuList || []).map(p => ({
      //   title: p.title,
      //   icon: p.icon,
      //   activeIcon: p.activeIcon,
      //   loading: p.loading,
      //   onClick: () => openExtendMenu(p),
      // }) as MenuItem),
      // {
      //   title: "扩展",
      //   icon: " i-solar:widget-line-duotone hover:(i-solar:widget-bold-duotone ) ",
      //   activeIcon: "i-solar:widget-bold-duotone",
      //   onClick: () => chat.showExtension = true,
      // },
      {
        title: "账 号",
        path: "/user/safe",
        icon: "i-solar:devices-outline",
        activeIcon: "i-solar:devices-bold",
        isDot: true,
      },
      {
        title: "API Key",
        path: "/api/key",
        icon: "i-solar:code-square-outline",
        activeIcon: "i-solar:code-square-bold",
      },
      {
        title: "设 置",
        path: "/setting",
        icon: "i-solar:settings-linear hover:animate-spin",
        activeIcon: "i-solar:settings-bold hover:animate-spin",
        tipValue: +setting.appUploader.isUpload,
        isDot: true,
      },

    ],
  },
]);

const activeMenu = computed({
  get: () => route.path,
  set: async (val) => {
    if (val === "/more")
      return;
    await navigateTo(val);
  },
});
</script>

<template>
  <div
    class="relative z-998 grid grid-cols-5 select-none justify-center bg-white shadow-md dark:bg-dark-8"
  >
    <div
      v-for="p in menuList" :key="p.path" :index="p.path" class="item"
      :class="{ active: activeMenu === p.path }"
      @click.stop="() => {
        if (p.path)
          activeMenu = p.path
      }"
    >
      <el-badge
        v-if="!p?.children?.length"
        :value="p?.tipValue || 0"
        :hidden="!p?.tipValue"
        :max="99"
        :is-dot="p.isDot"
      >
        <i class="icon p-3" :class="route.path === p.path ? p.activeIcon : p.icon" />
        <span mt-2 block select-none text-center text-3>{{ p.title }}</span>
      </el-badge>
      <el-popover
        v-else
        :width="30"
        :offset="25"
        trigger="click"
      >
        <template #reference>
          <el-badge
            :value="p.tipValue"
            :hidden="!p.tipValue"
            :max="99"
            :offset="[-15, 2]"
            class="h-full w-full flex-row-c-c flex-col"
            :is-dot="p.isDot"
            @click.stop="(e: MouseEvent) => {
              if (p.onClick) {
                e.stopPropagation();
                p.onClick(e);
              }
            }"
          >
            <i class="p-3" :class="route.path === p.path ? p.activeIcon : p.icon" />
            <span mt-2 block select-none text-center text-3>{{ p.title }}</span>
          </el-badge>
        </template>
        <template #default>
          <ul class="grid cols-1 gap-3">
            <el-badge
              v-for="item in p.children"
              :key="item.path" :value="item.tipValue || 0" :hidden="!item.tipValue" :max="99" :is-dot="item.isDot" class="popper-item" :index="p.path" :class="{ active: activeMenu === item.path }"
              @click.stop="(e: MouseEvent) => {
                if (item.path) {
                  activeMenu = item.path
                }
                if (item.onClick) {
                  e.stopPropagation();
                  item.onClick(e);
                }
              }"
            >
              <i class="inline-block p-3" :class="route.path === item.path ? item.activeIcon : item.icon" />
              <span>{{ item.title }}</span>
            </el-badge>
          </ul>
        </template>
      </el-popover>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.popper-item {
  --at-apply: "flex items-center cursor-pointer rounded gap-3 px-3 py-1";
  &.active {
    --at-apply: "bg-color-3 w-full";
  }
}
.item {
  --at-apply: "flex-row-c-c flex-col cursor-pointer gap-2 rounded-2 py-4 transition-all-300";
}

.item {
  .title {
    --at-apply: "h-1.5em overflow-hidden";
  }

  .icon {
    --at-apply: "transition-none";
  }

  &.active {
    --at-apply: "text-theme-primary";
    filter: drop-shadow(0 0 8px var(--el-color-primary-light-5));
    transition-property: filter, color;

    .icon {
      --at-apply: "p-3.6";
    }
  }
}
</style>
