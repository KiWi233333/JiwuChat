<script lang="ts" setup>
import { getLoginDeviceList, toUserOffline } from "@/composables/api/user/safe";

const [autoAnimateRef, enable] = useAutoAnimate({
  duration: 200,
});
const setting = useSettingStore();
onMounted(() => {
  enable(false);
});
const user = useUserStore();
const isLoading = ref<boolean>(false);

const deviceList = ref<DeviceInfo[]>([]);
// 信息
async function getDeviceList() {
  const res = await getLoginDeviceList(user.getToken);
  if (res.code === StatusCode.SUCCESS) {
    deviceList.value = res.data.sort((a, b) => a.isLocal);
  }
  return true;
}
getDeviceList();
// 刷新
async function reload() {
  if (isLoading.value)
    return;
  deviceList.value.splice(0);
  if (await getDeviceList()) {
    ElMessage.success("刷新成功🎉");
  }
  setTimeout(() => {
    enable(!setting.settingPage.isCloseAllTransition);
  }, 500);
}

// 用户下线
function exitLogin(ua?: string) {
  ElMessageBox.confirm("是否确认下线用户?", "确认选择", {
    cancelButtonText: "取消",
    lockScroll: false,
    center: true,
    confirmButtonText: "确认下线",
    confirmButtonClass: "el-button--danger",
  })
    .then(async (action: string) => {
      if (action === "confirm") {
        const arr = ua ? [ua] : (deviceList.value?.map(p => p.userAgentString) as string[]);
        const { code, message } = await toUserOffline(arr, user.getToken);
        if (code === StatusCode.SUCCESS) {
          if (deviceList.value) {
            for (let i = 0; i < deviceList.value.length; i++) {
              if (deviceList?.value?.[i]?.userAgentString === ua) {
                deviceList.value.splice(i, 1);
                break;
              }
            }
          }
          ElMessage.success("下线成功！");
        }
        else {
          ElMessage.error(message);
        }
      }
    })
    .catch(() => {});
}
// @unocss-include
</script>

<template>
  <div class="group h-full flex flex-col">
    <div my-4 shrink-0 text-sm>
      <i class="i-solar:devices-outline mr-2 p-2.5" />
      登录设备
      <i
        opacity-100
        transition-300 group-hover:opacity-100 md:opacity-0 class="i-solar:refresh-outline float-right cursor-pointer bg-[var(--el-color-info)] px-3 transition-300 hover:rotate-180"
        @click="reload"
      />
    </div>
    <el-scrollbar
      v-loading="isLoading"
      class="flex-1"
      max-height="100%"
      :element-loading-spinner="defaultLoadingIcon"
    >
      <!-- 列表 -->
      <div
        ref="autoAnimateRef"
        class="relative grid grid-cols-1 h-full items-start gap-2 pb-4rem lg:grid-cols-3 sm:grid-cols-2"
      >
        <UserSafeDeviceCard
          v-for="p in deviceList"
          :key="p.id"
          class="relative h-fit cursor-pointer card-default hover:(border-[var(--el-color-info)] border-solid shadow)"
          :data="p"
        >
          <div />
          <el-button
            v-if="!p.isLocal"
            size="small"
            type="danger"
            style="padding: 0 8px"
            class="absolute bottom-4 right-4"
            plain
            @click="exitLogin(p.userAgentString)"
          >
            下线
          </el-button>
        </UserSafeDeviceCard>
        <UserSafeDeviceCard
          v-for="p in deviceList"
          :key="p.id"
          class="relative h-fit cursor-pointer card-default hover:(border-[var(--el-color-info)] border-solid shadow)"
          :data="p"
        >
          <div />
          <el-button
            v-if="!p.isLocal"
            size="small"
            type="danger"
            style="padding: 0 8px"
            class="absolute bottom-4 right-4"
            plain
            @click="exitLogin(p.userAgentString)"
          >
            下线
          </el-button>
        </UserSafeDeviceCard>
        <UserSafeDeviceCard
          v-for="p in deviceList"
          :key="p.id"
          class="relative h-fit cursor-pointer card-default hover:(border-[var(--el-color-info)] border-solid shadow)"
          :data="p"
        >
          <div />
          <el-button
            v-if="!p.isLocal"
            size="small"
            type="danger"
            style="padding: 0 8px"
            class="absolute bottom-4 right-4"
            plain
            @click="exitLogin(p.userAgentString)"
          >
            下线
          </el-button>
        </UserSafeDeviceCard>
        <UserSafeDeviceCard
          v-for="p in deviceList"
          :key="p.id"
          class="relative h-fit cursor-pointer card-default hover:(border-[var(--el-color-info)] border-solid shadow)"
          :data="p"
        >
          <div />
          <el-button
            v-if="!p.isLocal"
            size="small"
            type="danger"
            style="padding: 0 8px"
            class="absolute bottom-4 right-4"
            plain
            @click="exitLogin(p.userAgentString)"
          >
            下线
          </el-button>
        </UserSafeDeviceCard>
        <UserSafeDeviceCard
          v-for="p in deviceList"
          :key="p.id"
          class="relative h-fit cursor-pointer card-default hover:(border-[var(--el-color-info)] border-solid shadow)"
          :data="p"
        >
          <div />
          <el-button
            v-if="!p.isLocal"
            size="small"
            type="danger"
            style="padding: 0 8px"
            class="absolute bottom-4 right-4"
            plain
            @click="exitLogin(p.userAgentString)"
          >
            下线
          </el-button>
        </UserSafeDeviceCard>
      </div>
    </el-scrollbar>
  </div>
</template>

<style scoped lang="scss">
.bg-btn {
  background-color: var(--el-color-danger);
  border-color: var(--el-color-danger);
}
</style>
