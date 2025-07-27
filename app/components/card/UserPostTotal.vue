<script lang="ts" setup>
const {
  dto,
  gridClass = "grid grid-cols-4 grid-gap-4",
  cardClass = "",
} = defineProps<{
  user?: Partial<(UserInfoVO | PostUserSeVO)>
  dto: PostTotalDTO
  gridClass?: string
  cardClass?: string
}>();


const store = useUserStore();
const dataList = ref<{
  label: string
  value: number
}[]>([
  {
    label: "帖子",
    value: 0,
  },
  {
    label: "评论",
    value: 0,
  },
  {
    label: "收藏",
    value: 0,
  },
  {
    label: "点赞",
    value: 0,
  },
]);
async function loadData() {
  if (dto?.userId) {
    const res = await getPostTotal({
      userId: dto?.userId,
    }, store.getToken);

    if (res.code === StatusCode.SUCCESS) {
      dataList.value[0] && (dataList.value[0].value = res.data.postCount);
      dataList.value[1] && (dataList.value[1].value = res.data.postCommentCount);
      dataList.value[2] && (dataList.value[2].value = res.data.postCollectCount);
      dataList.value[3] && (dataList.value[3].value = res.data.postLikeCount);
    }
  }
}
loadData();
</script>

<template>
  <div class="flex flex-col gap-3 card-default rounded-4px">
    <div
      :to="{
        path: `/user/info`,
        query: {
          id: dto?.userId,
        },
      }" class="flex flex-col"
    >
      <CardElImage
        loading="lazy"
        transition-200
        hover:transform-scale-110
        class="mx-a h-5rem w-5rem rounded-1/2"
        :src="BaseUrlImg + user?.avatar"
        :alt="user?.nickname"
        fit="cover"
      />
      <h4 mt-4 text-center>
        {{ user?.nickname }}
      </h4>
    </div>
    <div :class="gridClass">
      <!-- 卡片 -->
      <div
        v-for="(p, i) in dataList"
        :key="i"
        class="w-full p-2 text-center leading-1.8em transition-200 hover-scale-110"
        :class="cardClass"
      >
        <div class="title text-1em">
          {{ p.label }}
        </div>
        <span class="text-1em">
          {{ p.value }}
        </span>
      </div>
    </div>
  </div>
</template>
