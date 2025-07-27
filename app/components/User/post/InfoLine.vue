<script lang="ts" setup>
import type { PostInfoVO } from "@/composables/api/community/post";
import { getPostStatusList } from "@/composables/api/community/post";

const { data } = defineProps<{
  data: PostInfoVO
  userId: string
}>();
defineEmits<{
  (e: "delete", id: string): void
}>();

const user = useUserStore();

const getImages = computed(() => {
  const arr = [];
  arr.push(BaseUrlImg + data.cover);
  if (data.images)
    arr.push(...data.images.split(",").filter(item => item)?.map(p => BaseUrlImg + p));
  return arr;
});

// 展开评论
const Host = `${location.protocol}/${location?.host}`;

const postStatusList = getPostStatusList;
const getStatus = computed(() => {
  return postStatusList.find(item => item.value === data.status);
});
/**
 * 前往详情页
 */
function toEditView() {
  navigateTo({
    path: "/community/post/new",
    query: {
      id: data.id,
    },
  });
}
</script>

<template>
  <div class="group grid grid-gap-2 leading-1.4em">
    <section>
      <!-- 主体 -->
      <NuxtLink
        tag="div"
        class="flex-row-bt-c"
        :to="`/community/post/new?id=${data.id}`"
      >
        <!-- 标题 -->
        <h3 font-500 class="block w-2rem flex-1 truncate md:w-full">
          <!-- 精华 -->
          <el-tag
            v-if="data.isEssence"
            class="mr-2 font-600 shadow"
            round
            style="padding:  0.2rem 0.4rem;" type="warning" effect="dark"
          >
            <i i-solar:crown-star-bold mr-1 p-0.5em />
            精华
          </el-tag>
          {{ data.title }}
        </h3>
        <!-- 更新、状态 -->
        <div class="right">
          <small hidden transition-200 transition-opacity md:inline group-hover:opacity-70 md:opacity-0>最后更新于：{{ data?.updateTime }}</small>
          <UserPostStatusTag :status="data.status">
            <template #pre>
              <el-countdown
                v-if="data.status === PostStatus.DELETED || data.status === PostStatus.ADMIN_DELETED"
                class="mb-0.5 mr-2"
                style="color: #fff;"
                format="DD天HH时"
                :value="new Date(data.updateTime).getTime() + 10 * 24 * 3600 * 1000 "
              />
            </template>
          </UserPostStatusTag>
        </div>
      </NuxtLink>
      <!-- 图片集合 -->
      <div class="transition-[all_0.2s] mt-4 flex flex-wrap gap-4">
        <CardElImage
          v-for="(img, i) in getImages"
          :key="i"
          fit="cover"
          class="h-8rem max-w-14rem card-default object-cover"
          loading="lazy"
          preview-teleported
          :src="img"
          :initial-index="i"
          :preview-src-list="getImages"
        />
      </div>
      <!-- tags -->
      <div
        v-if="data?.tags?.trim()" class="grid mt-4 w-full flex grid-gap-2 truncate opacity-70"
      >
        <CommTagList
          :tags="data.tags"
          effect="light"
        />
      </div>
      <!-- 底部 -->
      <div class="mt-4 flex-row-bt-c">
        <!-- 分享统计 -->
        <div
          class="flex items-center gap-4"
        >
          <!-- 评论 -->
          <span
            class="tip-group tip-group link-text"
          >
            <i
              class="i-solar:chat-dots-outline mr-1 p-0.5em"
            />
            <small>{{ `${data.comments > 99 ? '99+' : data.comments}` }} 条评论</small>
          </span>
          <!-- 点赞 -->
          <span class="link-text">
            <i
              class="i-solar:like-outline mr-1 p-0.5em"
            />
            <small>{{ `${data.likes > 99 ? '99+' : data.likes}` }} 个点赞</small>
          </span>
          <span v-copying.toast="`${Host}/community/post/detail/${data.id}`" class="link-text">
            <i
              class="i-solar:share-outline mr-1 p-0.5em"
            />
            <small>分享</small>
          </span>
        </div>
        <!-- 编辑 -->
        <div v-if="data.status !== PostStatus.DELETED && data.status !== PostStatus.ADMIN_DELETED" flex transition-200 transition-opacity group-hover:op-100 md:op-0>
          <BtnElButton
            type="danger"
            plain
            class="ml-a opacity-100 group-hover:opacity-100 md:opacity-0"
            icon-class="i-solar:trash-bin-trash-broken   block  mr-1"
            :transition-icon="true"
            size="small"
            @click.stop="user.getTokenFn() && toEditView()"
          >
            移入回收站
          </BtnElButton>
          <BtnElButton
            type="info"
            plain
            class="group-hover:opacity-100 md:opacity-0"
            icon-class="i-tabler:edit mr-2"
            :transition-icon="true"
            size="small"
            @click.stop="user.getTokenFn() && toEditView()"
          >
            编辑
          </BtnElButton>
        </div>
        <!-- 彻底删除 -->
        <div v-else-if="data.status === PostStatus.DELETED">
          <BtnElButton
            type="danger"
            plain
            class="ml-a opacity-100 group-hover:opacity-100 md:opacity-0"
            icon-class="i-solar:trash-bin-trash-broken   block  mr-1"
            :transition-icon="true"
            size="small"
            @click.stop="$emit('delete', data.id)"
          >
            彻底删除
          </BtnElButton>
        </div>
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.link-text {
  --at-apply: 'opacity-80 text-0.9rem hover:(text-[var(--el-color-info)] opacity-100) cursor-pointer transition-200 ';
}

.tip-group {
  &:hover {
    .toggle-tip {
      display: none;
    }

    .data {
      display: inline-block;
    }
  }
}

:deep(.el-statistic){
  span {
    font-size: 0.6em;
  }
  .el-statistic__content {
    color: inherit;
  }
}
</style>
