<script lang="ts" setup>
import type { MenuItem } from "./Chat.vue";
import { NuxtLink } from "#components";

defineEmits<{
  (e: "close"): void
}>();
// 路由
const route = useRoute();
const user = useUserStore();
const ws = useWsStore();
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

const unWatchDebounced = watchDebounced(() => ws.wsMsgList.applyMsg.length, () => {
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
// @unocss-include
const menuList = computed<MenuItem[]>(() => [
  {
    title: "聊天",
    path: "/",
    icon: "i-ri:message-3-line",
    activeIcon: "i-ri:message-3-fill",
    tipValue: chat.unReadCount,
    isDot: false,
  },
  {
    title: "好友",
    path: "/friend",
    icon: "i-ri:contacts-line !w-5 !h-6",
    activeIcon: "i-ri:contacts-fill !w-5 !h-6",
    tipValue: applyUnRead.value,
    isDot: false,
  },
  {
    title: "AI",
    path: "/ai",
    icon: "i-ri:sparkling-2-line",
    activeIcon: "i-ri:sparkling-2-fill",
  },
  {
    title: "我",
    path: "/user",
    icon: "i-ri:user-line !w-5 !h-6",
    activeIcon: "i-ri:user-fill !w-5 !h-6",
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
    class="relative grid grid-cols-4 select-none justify-center bg-white shadow-md dark:bg-dark-8"
  >
    <component
      :is="p.children?.length ? 'div' : NuxtLink"
      v-for="p in menuList"
      :key="p.path"
      v-ripple="{ color: 'rgba(var(--el-color-primary-rgb), 0.1)', duration: 800 }"
      v-bind="!p.children?.length ? { 'to': p.path, 'prefetch': true, 'prefetch-on': { visibility: true } } : {}"
      :index="p.path"
      class="item"
      :draggable="false"
      :class="{ active: activeMenu === p.path }"
      @click.stop="() => {
        if (p.children?.length && p.path)
          activeMenu = p.path
      }"
    >
      <el-badge
        v-if="!p?.children?.length"
        :value="p?.tipValue || 0"
        :hidden="!p?.tipValue"
        :max="99"
        :is-dot="p.isDot"
        class="text-center"
      >
        <i class="icon" :class="route.path === p.path ? p.activeIcon : p.icon" />
        <span mt-2 block select-none text-center text-3>{{ p.title }}</span>
      </el-badge>
      <el-dropdown
        v-else
        placement="top"
        :offset="25"
        :show-arrow="false"
      >
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
          <i class="icon" :class="route.path === p.path ? p.activeIcon : p.icon" />
          <span mt-2 block select-none text-center text-3>{{ p.title }}</span>
        </el-badge>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-for="item in p.children"
              :key="item.path"
              class="dropdown-item"
              :class="{ active: activeMenu === item.path }"
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
              <div>
                <el-badge
                  :value="item.tipValue || 0"
                  :hidden="!item.tipValue"
                  :max="99"
                  :is-dot="item.isDot"
                >
                  <div class="flex-row-c-c gap-2 p-1">
                    <i class="inline-block p-2.6" :class="route.path === item.path ? item.activeIcon : item.icon" />
                    <span>{{ item.title }}</span>
                  </div>
                </el-badge>
              </div>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </component>
  </div>
</template>

<style lang="scss" scoped>
.dropdown-item {
  --at-apply: "flex items-center cursor-pointer rounded gap-3 !hover:bg-color-3";
  position: relative;
  overflow: hidden;

  &.active {
    --at-apply: "bg-color-3 w-full";
  }
}

.item {
  --at-apply: "flex-row-c-c flex-col cursor-pointer gap-2 rounded-2 py-4 transition-all-300";
  position: relative;
  overflow: hidden;

  .title {
    --at-apply: "h-1.5em overflow-hidden";
  }

  .icon {
    --at-apply: "transition-none w-6 h-6 block";
  }

  &.active {
    --at-apply: "text-theme-primary";
    filter: drop-shadow(0 0 8px var(--el-color-primary-light-5));
    transition-property: filter, color;
  }
}
</style>
