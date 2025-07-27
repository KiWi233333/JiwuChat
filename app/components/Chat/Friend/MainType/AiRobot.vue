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
      <i i-ri:robot-2-line class="mx-2 h-6 w-6 text-color" />
      <strong text-0.9em font-500>
        AI 机器人
      </strong>
    </div>
    <el-scrollbar
      wrap-class="w-full flex-1 h-full px-6 sm:px-8 flex justify-center"
      view-class="w-full flex-1 h-full"
      class="w-full flex-1"
    >
      <h3 mb-8 mt-2 hidden text-center text-1.2em tracking-0.1em sm:mb-8 sm:block>
        AI点亮日常，智趣触手可及
      </h3>
      <ChatFriendRobotList />
    </el-scrollbar>
  </div>
</template>

<style lang="scss" scoped>
</style>

