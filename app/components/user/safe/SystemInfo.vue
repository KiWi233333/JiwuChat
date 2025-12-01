<script lang="ts" setup>
</script>

<template>
  <div class="group flex flex-col">
    <div my-4 text-sm>
      <i class="i-solar:accumulator-outline mr-2 p-2.5" />设备信息
    </div>
    <div
      rounde-4 flex-1 overflow-y-auto
    >
      <!-- 列表 -->
      <div
        class="relative grid grid-cols-1 items-start gap-2 pb-4rem lg:grid-cols-3 sm:grid-cols-2"
      >
        <CardBetteryInfo class="card-default" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.bg-btn {
  background-color: var(--el-color-danger);
  border-color: var(--el-color-danger);
}
</style>
