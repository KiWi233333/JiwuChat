<script lang="ts" setup>
import type { DeviceInfo } from "@/composables/api/user/safe";

const { data } = defineProps<{
  data: DeviceInfo
}>();
</script>

<template>
  <div class="item flex flex-col border-1px border-default-dashed p-4 leading-1.5em transition-all">
    <small class="mb-1 flex-row-bt-c font-600">
      {{ data?.ipInfo?.country && data?.ipInfo?.country !== "0" ? data?.ipInfo?.country : "未知" }}
      {{ data?.ipInfo?.province && data?.ipInfo?.province !== "0" ? data?.ipInfo?.province : "未知" }}
      {{ data?.ipInfo?.city && data?.ipInfo?.city !== "0" ? data?.ipInfo?.city : "未知" }}
      <el-tag
        v-if="data.isLocal"
        type="info"
        size="small"
        plain
      >
        本机
      </el-tag>
    </small>
    <small text-0.7em>IP：{{ data.ip }}</small>
    <small text-0.7em opacity-80>
      系统：{{ data.operatingSystem }}
    </small>
    <small text-0.7em opacity-80>
      浏览器：{{ data.browser }}
    </small>
    <!-- <small
      text-0.7em opacity-80
    >
      运营商：{{ data.operator }}
    </small> -->
    <div
      class="btns item-hover mt-1 flex-row-bt-c opacity-100 transition-300 md:opacity-0"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped lang="scss">
.item:hover  {
  .item-hover {
    opacity: 1;
  }
}
</style>
