<script lang="ts" setup>
/**
 * 消息适配器
 */
defineProps<{
  data: TheFriendOpt
}>();
</script>

<template>
  <div class="relative flex flex-col">
    <div class="h-4.2rem flex items-center rounded-0 px-6 md:p-4">
      <i i-solar:user-plus-bold ml-2 mr-2 p-3 text-color />
      <strong text-0.9em font-500>
        新的朋友
      </strong>
      <!-- TODO 申请记录 -->
      <!-- <div class="i-solar:sort-by-time-bold ml-2 p-3 btn-info" title="申请记录"/> -->
      <slot name="control" />
    </div>
    <el-scrollbar wrap-class="w-full flex-1 h-full">
      <ChatFriendApplyList class="mx-a p-2rem lg:px-1/5" />
    </el-scrollbar>
  </div>
</template>

