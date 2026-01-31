<script lang="ts" setup>
import { LogicalSize } from "@tauri-apps/api/dpi";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

const unReadContactList = ref<ChatContactDetailVO[]>([]);
const channel = new BroadcastChannel("main_channel");
const applyUnReadCount = ref(0);
const unreadCount = computed(() => unReadContactList.value?.reduce((acc, cur) => acc + cur.unreadCount, 0) || 0 + applyUnReadCount.value);
const showScrollbar = computed(() => unReadContactList.value.length > 0 || applyUnReadCount.value > 0);
const appWindow = WebviewWindow.getCurrent();
// 监听消息
async function handleReadMessage(p: ChatContactDetailVO) {
  // 标记已读
  channel.postMessage({ type: "readContact", data: JSON.parse(JSON.stringify(p)) });
  unReadContactList.value = unReadContactList.value.filter(item => item.roomId !== p.roomId);
}

// 全部已读
async function readAllContact() {
  channel.postMessage({ type: "readAllContact" });
  unReadContactList.value = [];
}

// 处理好友申请点击事件
async function handleFriendApply() {
  // 发送消息到主窗口，打开好友申请页面
  channel.postMessage({ type: "openFriendApply" });
  // 隐藏当前窗口
  appWindow.hide();
}

const user = useUserStore();
const ws = useWsStore();
const applyUnReadCountKey = computed(() => `applyUnReadCount_${user.userId}`);
onMounted(() => {
  // 监听locakStorage
  window.addEventListener("storage", (e) => {
    if (e.key === "unReadContactList")
      unReadContactList.value = JSON.parse(e.newValue || "[]");
    if (e.key === applyUnReadCountKey.value)
      applyUnReadCount.value = Number.parseInt(e.newValue || "0");
  });
  // 主动获取
  try {
    unReadContactList.value = JSON.parse(localStorage.getItem("unReadContactList") || "[]");
    // 获取好友申请未读数
    applyUnReadCount.value = Number.parseInt(localStorage.getItem(applyUnReadCountKey.value) || "0") || ws.wsMsgList.applyMsg.length;
    // 设置窗口大小 防止记忆窗口
    appWindow.setSize(new LogicalSize(240.0, 300.0));
  }
  catch (error) {
    console.warn(error);
  }
});


// 显示窗口
async function handleMouseEnter() {
  await appWindow.setFocus();
}
// 隐藏窗口
function handleMouseLeave() {
  appWindow.hide();
}

onBeforeUnmount(() => {
  channel.close();
  window.removeEventListener("storage", () => {});
});

definePageMeta({
  key: route => route.fullPath,
});
</script>

<template>
  <div class="h-100vh overflow-hidden text-0.8rem" @mouseleave="handleMouseLeave" @mouseenter="handleMouseEnter">
    <NuxtLayout>
      <main class="h-100vh flex flex-col justify-between gap-3 truncate p-3">
        <div class="border-0 border-default border-b-1px pb-2">
          新消息 ({{ unreadCount }})
        </div>
        <el-scrollbar
          v-if="showScrollbar"
          height="70vh"
          wrap-class="pb-4"
        >
          <!-- 好友申请 -->
          <div
            v-if="applyUnReadCount > 0"
            title="查看好友申请"
            class="group w-full flex cursor-pointer gap-2 bg-white p-2 shadow-sm transition-all rounded !items-center dark:bg-dark-7 hover:(bg-theme-primary text-light shadow-lg)"
            @click="handleFriendApply"
          >
            <div class="h-8 w-8 flex-row-c-c rounded-1 bg-theme-warning">
              <i i-solar:user-plus-bold bg-light p-2 />
            </div>
            <div class="flex flex-1 flex-col justify-between gap-1 truncate px-1">
              <p class="truncate">
                新的好友申请
              </p>
              <p flex-row-bt-c gap-2 truncate op-60>
                <small truncate>
                  您有新的好友申请待处理
                </small>
              </p>
            </div>
            <el-badge :value="applyUnReadCount" class="ml-1" />
          </div>
          <!-- 消息 -->
          <div
            v-for="p in unReadContactList"
            :key="p.roomId"
            title="读消息"
            class="group w-full flex cursor-pointer gap-2 bg-white p-2 shadow-sm transition-all rounded !items-center dark:bg-dark-7 hover:(bg-theme-primary text-light shadow-lg)"
            @click="handleReadMessage(p)"
          >
            <CommonElImage :src="BaseUrlImg + p.avatar" fit="cover" class="h-8 w-8 rounded-1 card-default object-cover" />
            <div class="flex flex-1 flex-col justify-between gap-1 truncate px-1">
              <p class="truncate">
                {{ p.name }}
              </p>
              <p flex-row-bt-c gap-2 truncate op-60>
                <small truncate>
                  {{ p.text || "暂无消息" }}
                </small>
              </p>
            </div>
            <el-badge :value="p.unreadCount" class="ml-1" />
          </div>
        </el-scrollbar>

        <small v-if="unReadContactList.length || applyUnReadCount > 0" class="btn-info border-0 border-default border-t-1px pt-2 text-right" @click="readAllContact()">
          忽略全部
        </small>
        <!-- 没有消息 -->
        <div v-else class="flex-row-c-c flex-1 flex-col text-center op-70">
          <i i-solar:chat-dots-line-duotone class="mb-2 h-6 w-6" />
          <small class="text-sm">
            暂无新消息
          </small>
        </div>
      </main>
    </NuxtLayout>
  </div>
</template>

<style scoped lang="scss">
.mains {
  --at-apply: "grid grid-cols-1 pl-2rem pr-4rem sm:(grid-cols-[2fr_1fr] px-4rem)";
}
</style>
