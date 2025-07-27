<script lang="ts" setup>
const noticeList = ref<NoticeInfo[]>([
  {
    title: "版本1.0.1：优化了夜间切换动画、首屏加载速度等",
    url: "https://github.com/KiWi233333/front-jiwuquan-mall-pc",
    date: "2023.12.13 15:00",
  },
]);
interface NoticeInfo {
  title: string
  url?: string
  date?: string | Date
  body?: string
}
</script>

<template>
  <el-popover trigger="hover" width="300px" v-bind="$attrs">
    <template #reference>
      <el-badge
        :value="noticeList.length > 0 ? noticeList.length : ''"
        class="group mx-2 cursor-pointer"
      >
        <i
          class="block transition-100 group-hover:(i-solar:bell-bold animate-swing bg-[var(--el-color-warning)])"
          i-solar:bell-outline block h-1.2em w-1.2em px-0.7em
        />
      </el-badge>
    </template>
    <template #default>
      <div class="top mb-2 flex gap-2 border-0 border-default border-b-1 pb-2">
        <i
          i-solar:bell-outline block h-1.2em w-1.2em px-0.7em
        /> <span>消息通知</span>
      </div>
      <el-scrollbar height="300px">
        <div
          v-for="(p, i) in noticeList" :key="i"
          class="border-default card-default p-3 leading-1.5em"
        >
          <NuxtLink
            class="text-overflow-3"
            :to="p.url" target="_blank"
            :disabled="!p.url"
          >
            {{ p.title }}
          </NuxtLink>
          <span>{{ p.date }}</span>
        </div>

        <small
          v-show="!noticeList.length"
          text-center
          class="w-1/1"
        >
          暂无消息
        </small>
      </el-scrollbar>
    </template>
  </el-popover>
</template>

