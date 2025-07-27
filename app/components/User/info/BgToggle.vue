<script lang="ts" setup>
const bgList = ref<string[]>([
  "/image/user-bg/kiwi-bg-1.jpg",
  "/image/user-bg/kiwi-bg-2.jpg",
  "/image/user-bg/kiwi-bg-3.jpg",
  "/image/user-bg/kiwi-bg-4.jpg",
  "/image/user-bg/kiwi-bg-5.jpg",
]);
const bgUrl = useLocalStorage("jiwu_user_bg", "/image/user-bg/kiwi-bg-4.jpg");
</script>

<template>
  <div class="group top-bg relative select-none shadow-lg shadow-inset">
    <el-popover
      width="fit-content"
      placement="top"
      transition="popper-fade-up"
      title="切换壁纸"
      :teleported="true"
      trigger="click"
      class=""
    >
      <template #reference>
        <!-- 切换按钮 -->
        <el-button
          class="absolute bottom-2rem right-2rem z-999 opacity-0 group-hover:opacity-100"
          type="info"
          plain
          style="padding: 8px; background-color: rgba(97, 255, 163, 0.1); transition: 0.3s"
        >
          <i
            i-solar:pallete-2-bold h-1.6em w-1.6em
          />
        </el-button>
      </template>
      <template #default>
        <ClientOnly>
          <div class="img-list grid grid-cols-3 mt-4 w-94vw gap-4 sm:w-400px">
            <card-el-image
              v-for="(p, i) in bgList"
              :key="i"
              loading="lazy"
              alt="Design By Kiwi23333"
              :src="BaseUrlImg + p"
              object-cover
              class="h-5em cursor-pointer border-default rounded-4px object-cover transition-300 hover:scale-105"
              @click="bgUrl = p"
            />
          </div>
        </ClientOnly>
      </template>
    </el-popover>
    <card-el-image
      loading="lazy"
      :src="BaseUrlImg + bgUrl"
      object-cover
      class="h-300px w-1/1 object-cover"
    />
  </div>
</template>

<style scoped lang="scss"></style>
