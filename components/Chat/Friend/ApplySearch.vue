<script lang="ts" setup>
const emit = defineEmits<{
  (e: "submit", data: ChatUserSeInfoVO): void
}>();
const chat = useChatStore();
// 搜索相关
const searchKeyWords = ref<string>("");
const isShowResult = ref<boolean>(false);
const searchPage = ref({
  total: 0,
  pages: 0,
  size: 0,
  current: 0,
});
const searchPageList = reactive<ChatUserSeInfoVO[]>([]);
// 分页器
const user = useUserStore();
const isLoading = ref<boolean>(false);
const page = ref<number>(0);
const size = ref<number>(10);
const noMore = computed(() => searchPage.value.total > 0 && searchPageList.length >= searchPage.value.total);
// 搜索历史 本地存储
const searchHistoryList = useStorageAsync<string[]>("jiwu_chat_friend_user", []);
const currentFocus = ref(-1); // 当前聚焦的索引
const isShowModel = ref(false);
const virtualListRef = useTemplateRef("virtualListRef");

/**
 * 搜索好友
 */
async function onSearch() {
  if (!searchKeyWords.value) {
    // 清空
    clearSearch();
    return;
  }
  if (currentFocus.value > -1 && searchPageList?.[currentFocus?.value]) { // 打开
    if (!searchPageList?.[currentFocus.value]) {
      return;
    }
    emit("submit", searchPageList[currentFocus.value] as ChatUserSeInfoVO);
    return;
  }
  reSearch();
  // 1、请求
  // 添加记录
  if (
    !searchHistoryList.value.includes(searchKeyWords.value)
    && searchHistoryList.value.length <= 6
  ) {
    searchHistoryList.value.unshift(searchKeyWords.value.trim());
  }
  await onLoadMore();
}

// 监听键盘事件
function handleKeydown(type: string) {
  switch (type) {
    case "arrow-down":
      currentFocus.value = Math.min(currentFocus.value + 1, searchPageList.length - 1);
      // 滚动到聚焦项
      nextTick(() => {
        virtualListRef.value?.scrollToItem(currentFocus.value);
      });
      break;
    case "arrow-up":
      currentFocus.value = Math.max(currentFocus.value - 1, 0);
      // 滚动到聚焦项
      nextTick(() => {
        virtualListRef.value?.scrollToItem(currentFocus.value);
      });
      break;
    default:
      break;
  }
}

async function onLoadMore() {
  try {
    if (noMore.value || isLoading.value || !searchKeyWords.value?.trim())
      return;
    isLoading.value = true;
    page.value++;
    const res = await getUserSeListByPage(page.value, size.value, {
      keyWord: searchKeyWords.value,
    }, user.getToken);
    // 展示结果
    searchPage.value = {
      total: res.data.total,
      pages: res.data.pages,
      size: res.data.size,
      current: res.data.current,
    };
    searchPageList.push(...res.data.records);
  }
  catch (e) {
    console.error(e);
  }
  finally {
    isLoading.value = false;
    isShowResult.value = true;
  }
}

/**
 * 清除
 */
function clearSearch() {
  isShowResult.value = false;
  searchKeyWords.value = "";
  searchPageList.splice(0);
  searchPage.value = {
    total: 0,
    pages: 0,
    size: 0,
    current: 0,
  };
  // 重置虚拟列表滚动位置
  resetVirtualListScroll();
}

function reSearch() {
  searchPageList.splice(0);
  searchPage.value = {
    total: 0,
    pages: 0,
    size: 0,
    current: 0,
  };
  currentFocus.value = -1;
  page.value = 0;
  // 重置虚拟列表滚动位置
  resetVirtualListScroll();
}
/**
 * 关闭历史标签
 * @param tag
 */
function handleClose(tag: string) {
  searchHistoryList.value.splice(searchHistoryList.value.indexOf(tag), 1);
}
/**
 * 点击历史标签
 */
function clickTag(val: string, i: number) {
  searchKeyWords.value = val;
  searchHistoryList.value.splice(i, 1);
  onSearch();
}
const showSearchHistory = ref(false);
onDeactivated(() => {
  isShowModel.value = false;
});

/**
 * 虚拟列表滚动到底部时触发加载更多
 */
function onEndReached() {
  if (!noMore.value && !isLoading.value) {
    onLoadMore();
  }
}

/**
 * 性能优化：重置列表滚动位置
 */
function resetVirtualListScroll() {
  nextTick(() => {
    virtualListRef.value?.scrollToTop();
  });
}
</script>

<template>
  <div class="nav-padding-top-2 h-full w-full flex flex-col" relative>
    <div
      class="search-input flex-row-c-c"
    >
      <el-input
        :id="applyUserSearchInputDomId"
        v-model.trim="searchKeyWords"
        class="mr-2 text-0.8rem"
        style="height: 2rem;"
        type="text"
        clearable
        autocomplete="off"
        :prefix-icon="ElIconSearch"
        minlength="2"
        maxlength="30"
        :on-search="onSearch"
        placeholder="搜索好友 🔮"
        @focus="isShowModel = true"
        @keyup.esc.stop="(isShowModel = false) && clearSearch() "
        @keyup.enter.stop="onSearch"
        @keydown.arrow-down.stop="handleKeydown('arrow-down')"
        @keydown.arrow-up.stop="handleKeydown('arrow-up')"
      />
      <BtnElButton
        type="primary"
        class="w-5rem text-sm shadow"
        style="position: relative; transition: 0.2s; height: 2rem;font-size: 0.8em;"
        :disabled="isLoading"
        icon-class="i-solar:magnifer-outline mr-1"
        @focus="isShowModel = true"
        @click.self="onSearch"
      >
        搜&nbsp;索
      </BtnElButton>
    </div>
    <Transition enter-active-class="animate-(fade-in duration-200)" leave-active-class="animate-(fade-out duration-200)">
      <div v-if="isShowModel" class="absolute left-0 top-2.5rem z-1 h89vh w-full flex-1 bg-color">
        <!-- 搜索历史记录 -->
        <div
          v-show="searchPage.current === 0"
          class="tags overflow-hidden transition-max-height"
          :class="showSearchHistory ? 'max-h-15em' : 'max-h-4em '"
        >
          <div my-3 text-mini>
            历史记录：
            <i
              i-solar:close-circle-line-duotone class="float-right btn-primary p-2.8" @click="() => {
                isShowModel = false;
                clearSearch();
              }"
            />
            <i
              i-solar:round-alt-arrow-down-line-duotone
              title="查看更多"
              class="float-right mr-1 btn-primary p-2.8"
              :class="{ 'rotate-180': showSearchHistory }"
              @click="showSearchHistory = !showSearchHistory"
            />
          </div>
          <el-tag
            v-for="(p, i) in searchHistoryList"
            :key="p"
            closable
            size="small"
            type="primary"
            style="padding: 0.3em 0.6em;border:none; font-size: 0.8em;transition: none;"
            class="mr-1 mt-1 cursor-pointer"
            @close="handleClose(p)"
            @click="clickTag(p, i)"
          >
            {{ p }}
          </el-tag>
        </div>
        <!-- 标题 -->
        <div
          v-show="!isShowResult"
          class="mt-3 flex-row-bt-c pl-1 pr-2"
        >
          <span v-show="searchPageList.length > 0" class="text-0.8rem">
            {{ ` 找到 ${searchPage.total} 个匹配好友` }}
            <i
              i-solar:close-circle-line-duotone class="float-right btn-primary p-2.8" @click="(isShowModel = false) && clearSearch()"
            />
          </span>
        </div>
        <div
          v-show="isShowResult && searchPage.current && searchPageList.length > 0"
        >
          <ListVirtualScrollList
            ref="virtualListRef"
            :items="searchPageList"
            item-height="4rem"
            max-height="calc(100vh - 15rem)"
            :selected-index="currentFocus"
            wrap-class="py-2 flex-1 overflow-hidden"
            enable-pull-to-refresh
            :overscan="20"
            :pull-trigger-distance="30"
            :pull-distance="60"
            @end-reached="onEndReached"
          >
            <template #default="{ item, isActive }">
              <div
                class="relative mb-2 flex cursor-pointer items-center truncate card-default card-bg-color p-2 transition-300 transition-all hover:(bg-color-2 shadow-sm)"
                :class="{
                  selected: chat.theFriendOpt.type === FriendOptType.User && chat.theFriendOpt.data?.id === item?.id,
                  focused: isActive,
                }"
                tabindex="0"
                @click="emit('submit', item)"
              >
                <CardElImage
                  :src="BaseUrlImg + item.avatar"
                  fit="cover"
                  error-class="i-solar:user-bold-duotone"
                  class="mr-2 h-10 w-10 border-default card-default rounded-full object-cover"
                />
                <small>{{ item.nickname || item.username }}</small>
              </div>
            </template>
            <template #end>
              <div v-if="!noMore && searchPageList.length > 0" class="py-2 text-center">
                <div v-if="isLoading" class="text-mini">
                  加载中...
                </div>
                <div v-else class="text-mini">
                  滚动加载更多
                </div>
              </div>
              <div v-if="noMore && searchPageList.length > 0" class="py-2 text-center">
                <p class="text-mini">
                  暂无更多
                </p>
              </div>
            </template>
          </ListVirtualScrollList>
        </div>
        <ElEmpty
          v-show="!searchPage.total && !isLoading"
          data-fades
          min-h-50vh
          :image-size="80"
          :description="searchPageList.length <= 0 && searchPage.current > 0 ? '没有找到好友' : '好友查找'"
        >
          <template #image>
            <i i-solar:users-group-two-rounded-bold-duotone p-2rem op-40 />
          </template>
        </ElEmpty>
      </div>
    </Transition>
  </div>
</template>

<!-- 样式scss -->
<style scoped lang="scss">
.v-input {
  :deep(.el-button) {
    font-size: 0.8rem;
    padding: 0 2rem;
    margin-right: 0;
    letter-spacing: 0.2em;
  }
  :deep(.el-input__wrapper) {
    transition: $transition-delay;
    --at-apply: "tracking-0.2em";
    &.is-focus {
      backdrop-filter: blur(20px);
    }
  }
}

// 弹出框
.popover {
  display: flex;
  flex-direction: column;
  align-items: center;

  &hover {
    width: 100%;
  }

  :deep(.el-popover__title) {
    width: 100%;
    text-align: center !important;
  }
}

.tags .el-tags .el-tag__content {
  :deep(.el-close) {
    opacity: 0;
  }

  :deep(.el-close):hover {
    opacity: 1;
  }
}

.focused {
  --at-apply: "card-bg-color-2";
}
.selected {
  --at-apply: "!bg-color-3";
}

.search-input {
  :deep(.el-input) {
    .el-input__wrapper {
      box-shadow: none !important;
      outline: none !important;
      --at-apply: "!input-bg-color";
    }
  }

}
</style>
