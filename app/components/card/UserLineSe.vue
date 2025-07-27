<script lang="ts" setup>
const user = useUserStore();
</script>

<template>
  <div>
    <div v-if="user.userInfo?.id">
      <el-popover
        placement="bottom"
        transition="popper-fade"
        :width="60"
      >
        <template #reference>
          <img
            loading="lazy"
            class="h-2em w-2em rounded-6em"
            :src="
              user.userInfo.avatar ? BaseUrlImg + user.userInfo.avatar : `${BaseUrlImg}default.png`
            "
            :alt="user.userInfo.nickname"
          >
        </template>
        <div class="grid grid-cols-1 w-full text-center">
          <NuxtLink
            to="/"
            class="cursor-pointer rounded-6px py-2"
          >
            回到主页
          </NuxtLink>
          <span
            class="cursor-pointer rounded-6px py-2"
            @click="user.exitLogin"
          >
            退出登录
          </span>
        </div>
      </el-popover>
    </div>
  </div>
</template>

<style scoped lang="scss"></style>
