<script lang="ts" setup>
const {
  isEdit,
} = defineProps<{
  isEdit: boolean;
}>();

const popoverVisible = ref(false);

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
  <div class="group top-bg relative select-none">
    <el-popover
      v-if="isEdit"
      v-model:visible="popoverVisible"
      width="fit-content"
      placement="top"
      :teleported="true"
      trigger="click"
    >
      <template #reference>
        <div
          class="absolute right-6 top-6 z-999 group-hover:opacity-100 sm:opacity-50"
        >
          <CommonIconTip
            class="text-5"
            icon="i-solar:pallete-2-bold"
            tip="切换壁纸"
            :background="false"
            :disabled-tooltip="popoverVisible"
          />
        </div>
      </template>
      <template #default>
        <span class="text-sm">
          <i class="i-solar:star-bold-duotone mr-1 p-2" />
          切换壁纸</span>
        <div
          class="img-list grid grid-cols-3 mt-2 w-90vw gap-4 sm:w-400px"
          @mouseleave="popoverVisible = false"
        >
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
      class="h-20rem w-full overflow-hidden object-cover !block"
    />
  </div>
</template>

<style scoped lang="scss"></style>
