<script lang="ts" setup>
const ws = useWsStore();
const user = useUserStore();
const online = useOnline();

const statusTextMap = {
  [WsStatusEnum.CONNECTION]: "连接中",
  [WsStatusEnum.OPEN]: "已连接",
  [WsStatusEnum.SAFE_CLOSE]: "已安全断开",
  [WsStatusEnum.CLOSE]: "已断开",
};
const getStatusText = computed(() => {
  if (!user.isLogin) {
    return "未登录";
  }
  return statusTextMap[ws.status] || "网络错误";
});
</script>

<template>
  <div
    data-fade
    style="--anima: latter-slice-bottom;"
  >
    <small truncate text-0.6rem tracking-0.1em el-color-danger>
      {{ getStatusText }}
      <span v-if="online" class="text-[var(--el-color-danger)]">(无网络)</span>
    </small>
    <div class="btns">
      <BtnElButton
        icon-class="i-solar:refresh-outline mr-1"
        class="hover:shadow-md"
        type="primary"
        round
        size="small"
        style="padding: 0 0.8em;height: 1.6em;line-height: 1.6em;"
        @click="ws.reload()"
      >
        重连
      </BtnElButton>
      <BtnElButton
        icon-class="i-solar:power-bold mr-1"
        class="hover:shadow-md"
        type="danger"
        round
        size="small"
        style="padding: 0 0.8em;height: 1.6em;line-height: 1.6em;margin:0;"
        @click="navigateTo('/login')"
      >
        登录
      </BtnElButton>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.offline {
  --at-apply: "fixed left-1/2 !-translate-x-1/2 z-9999 h-1.8em w-9em flex-row-c-c overflow-hidden rounded-8 px-1 text-center shadow-sm shadow-inset border-default card-bg-color sm:px-4";
  .btns {
    --at-apply: "absolute h-full w-full flex-row-bt-c scale-80 px-1 op-0 transition-all bg-color";
  }
}
</style>
