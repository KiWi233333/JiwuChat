<script lang="ts" setup>
const {
  isEdit,
} = defineProps<{
  isEdit: boolean;
}>();

const bgList = ref<string[]>([
  "/image/user-bg/kiwi-bg-1.jpg",
  "/image/user-bg/kiwi-bg-2.jpg",
  "/image/user-bg/kiwi-bg-3.jpg",
  "/image/user-bg/kiwi-bg-4.jpg",
  "/image/user-bg/kiwi-bg-5.jpg",
]);

const user = useUserStore();
const bgUrl = useLocalStorage(`${user.userId}-user-bg`, "/image/user-bg/kiwi-bg-4.jpg");
</script>

<template>
  <div class="group top-bg relative select-none shadow-lg shadow-inset">
    <el-popover
      width="fit-content"
      placement="top"
      :teleported="true"
      trigger="click"
    >
      <template #reference>
        <!-- 切换按钮 -->
        <el-button
          v-if="isEdit"
          class="absolute right-4 top-4 z-999 group-hover:opacity-100 sm:opacity-50"
          plain
          circle
          round
        >
          <i
            i-solar:pallete-2-bold h-1.6em w-1.6em
          />
        </el-button>
      </template>
      <template #default>
        <span class="text-sm">
          <i class="i-solar:star-bold-duotone mr-1 p-2" />
          切换壁纸</span>
        <div class="img-list grid grid-cols-3 mt-2 w-90vw gap-4 sm:w-400px">
          <CommonElImage
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
      </template>
    </el-popover>
    <CommonElImage
      loading="lazy"
      :src="BaseUrlImg + bgUrl"
      object-cover
      class="h-300px w-1/1 object-cover"
    />
  </div>
</template>

<style scoped lang="scss"></style>
