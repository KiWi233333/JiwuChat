<script lang="ts" setup>
import type { PostInfoVO, PostStatus, SelectCommPostDTO } from "@/composables/api/community/post";
import { hardDelCommPost } from "@/composables/api/community/post";

// props
interface Props {
  dto?: SelectCommPostDTO
  limit?: number
  class?: string
  immediate?: boolean
  status?: PostStatus
  isAutoStop?: boolean
}

const {
  dto = {},
  limit = 10,
  status,
  immediate = true,
  isAutoStop = false,
} = defineProps<Props>();
const user = useUserStore();
const isLoading = ref<boolean>(false);
// 帖子列表
const postList = ref<PostInfoVO[]>([]);
// 分页器
const page = ref<number>(0);
const size = ref<number>(limit);
// 查询页信息
const pageInfo = reactive({
  total: -1,
  pages: -1,
  current: -1,
});
// 暂无
const isNot = computed<boolean>(() => {
  return pageInfo?.total === 0 && pageInfo.pages === 0;
});
// 无更多
const isNoMore = computed<boolean>(() => {
  return pageInfo.pages > 0 && (page.value >= pageInfo.pages || (limit !== undefined && limit <= postList.value.length));
});

async function loadPageData() {
  // 没有更多
  if (isLoading.value || isNoMore.value || isNot.value)
    return;
  if (limit !== undefined && postList.value.length >= limit) {
    isLoading.value = false;
    return;
  }
  isLoading.value = true;
  page.value++;
  const res = await getPostPageSelf(page.value, size.value, {
    ...dto,
    status: dto?.status && +dto?.status < 0 ? undefined : dto.status,
  }, user.getToken);
  // 展示结果
  if (res?.code !== StatusCode.SUCCESS)
    return;
  pageInfo.total = res?.data.total;
  pageInfo.current = res?.data.current;
  pageInfo.pages = res?.data.pages;
  if (res?.data.records && res?.data.records.length)
    postList.value.push(...res?.data.records);
  else
    postList.value.splice(0);

  setTimeout(() => {
    isLoading.value = false;
  }, 300);
}
function clearResult() {
  postList.value.splice(0);
  pageInfo.total = -1;
  pageInfo.pages = -1;
  pageInfo.current = -1;
  page.value = 0;
}
// 条件筛选
const timer = ref();
watch(
  () => dto,
  async (newVal, oldVal) => {
    if (timer.value || (newVal.status !== status))
      return;
    clearResult();
    await loadPageData();
    timer.value = setTimeout(() => {
      clearTimeout(timer.value);
      timer.value = null;
    }, 300);
  },
  {
    immediate: true,
    deep: true,
  },
);

function onDelete(id: string) {
  ElMessageBox.confirm("是否彻底删除本条帖子?", {
    confirmButtonText: "确认",
    cancelButtonText: "取消",
    type: "warning",
    lockScroll: false,
    callback: async (action: string) => {
      if (action !== "confirm")
        return;
      isLoading.value = true;
      const res = await hardDelCommPost(id, user.getToken);
      if (res.code === StatusCode.SUCCESS) {
        ElNotification.success({
          title: "删除提示",
          message: "删除帖子成功！",
        });
        postList.value = postList.value.filter(item => item.id !== id);
      }
      else {
        ElNotification.error({
          title: "删除失败",
          message: res.message || "删除失败，请稍后再试！",
        });
      }
      isLoading.value = false;
    },
  });
}

defineExpose({
  clearResult, // 清除
  loadPageData,
  postList,
  pageInfo,
});
</script>

<template>
  <div v-loading="isLoading">
    <ClientOnly>
      <ListAutoIncre
        loading-class="mx-a my-0.6em h-1.4rem w-1.4rem animate-[spin_2s_infinite_linear] rounded-6px bg-[var(--el-color-info)]"
        :immediate="immediate"
        :no-more="isNoMore || isNot"
        :auto-stop="isAutoStop"
        @load="loadPageData"
      >
        <transition-group
          name="fade-bt-list"
          tag="div"
          class="grid grid-gap-6"
        >
          <div
            v-for="p in postList"
            :key="p.id"
          >
            <!-- 帖子卡片 -->
            <UserPostInfoLine
              class="card-default p-4 transition-300 transition-shadow md:p-6 hover:shadow"
              :data="p"
              :user-id="p?.userId"
              @delete="onDelete"
            />
          </div>
        </transition-group>
        <template #done>
          <p
            v-show="isNoMore || isNot"
            class="w-full py-8"
            text-center text-mini tracking-1
          >
            {{ isNoMore ? "暂无更多帖子" : "暂无帖子" }}
          </p>
        </template>
      </ListAutoIncre>
    </ClientOnly>
  </div>
</template>

<style scoped lang="scss">
:deep(.el-loading-mask) {
  background-color: transparent;
}
</style>
