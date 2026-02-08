<script lang="ts" setup>
const emit = defineEmits<{
  (e: "submit", data: ChatUserSeInfoVO): void
}>();

const chat = useChatStore();
const setting = useSettingStore();
const user = useUserStore();

const searchKeyWords = ref<string>("");
const isShowResult = ref(false);
const isLoading = ref(false);
const currentFocus = ref(-1);
const isShowModel = ref(false);
const showSearchHistory = ref(false);

const searchPage = ref({ total: 0, pages: 0, size: 0, current: 0 });
const searchPageList = ref<ChatUserSeInfoVO[]>([]);
const page = ref(0);
const size = ref(20);

const searchHistoryList = useStorageAsync<string[]>("jiwu_chat_friend_user", []);
const noMore = computed(() => searchPage.value.total > 0 && searchPageList.value.length >= searchPage.value.total);

const virtualListRef = useTemplateRef("virtualListRef");

/**
 * 重置搜索相关状态
 */
function resetSearchState() {
  searchPageList.value.splice(0);
  searchPage.value = { total: 0, pages: 0, size: 0, current: 0 };
  page.value = 0;
  currentFocus.value = -1;
  resetVirtualListScroll();
}

/**
 * 执行搜索
 */
async function onSearch() {
  // 如果有聚焦项，直接提交
  if (currentFocus.value > -1 && searchPageList.value[currentFocus.value]) {
    emit("submit", searchPageList.value[currentFocus.value] as ChatUserSeInfoVO);
    return;
  }
  const keyword = searchKeyWords.value.trim();
  if (!keyword) {
    clearSearch();
    return;
  }
  // 新搜索
  resetSearchState();
  addToHistory(keyword);
  isShowModel.value = true;
  await loadMoreResults();
}

/**
 * 加载更多搜索结果
 */
async function loadMoreResults() {
  if (noMore.value || isLoading.value || !searchKeyWords.value.trim())
    return;
  isLoading.value = true;
  try {
    page.value++;
    const res = await getUserSeListByPage(page.value, size.value, {
      keyWord: searchKeyWords.value,
    }, user.getToken);
    Object.assign(searchPage.value, {
      total: res.data.total,
      pages: res.data.pages,
      size: res.data.size,
      current: res.data.current,
    });
    searchPageList.value.push(...res.data.records);
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
 * 添加关键词到历史
 */
function addToHistory(keyword: string) {
  if (!searchHistoryList.value.includes(keyword)) {
    searchHistoryList.value.unshift(keyword);
    if (searchHistoryList.value.length > 6) {
      searchHistoryList.value.pop();
    }
  }
}

/**
 * 清空搜索
 */
function clearSearch() {
  isShowResult.value = false;
  searchKeyWords.value = "";
  resetSearchState();
}

function handleEsc() {
  // 小标是否显示,显示则先清除
  if (currentFocus.value > -1) {
    currentFocus.value = -1;
    return;
  }
  isShowModel.value = false;
  clearSearch();
}

/**
 * 键盘上下键聚焦
 */
function handleKeydown(type: string) {
  if (type === "arrow-down") {
    currentFocus.value = Math.min(currentFocus.value + 1, searchPageList.value.length - 1);
  }
  else if (type === "arrow-up") {
    currentFocus.value = Math.max(currentFocus.value - 1, 0);
  }
  nextTick(() => {
    virtualListRef.value?.scrollToItem(currentFocus.value);
  });
}

/**
 * 虚拟列表滚动到底部加载更多
 */
function onEndReached() {
  if (!noMore.value && !isLoading.value) {
    loadMoreResults();
  }
}

/**
 * 重置虚拟列表滚动
 */
function resetVirtualListScroll() {
  nextTick(() => {
    virtualListRef.value?.scrollToTop();
  });
}

/**
 * 关闭历史标签
 */
function handleClose(tag: string) {
  const idx = searchHistoryList.value.indexOf(tag);
  if (idx > -1)
    searchHistoryList.value.splice(idx, 1);
}

/**
 * 点击历史标签
 */
function clickTag(val: string, i: number) {
  searchKeyWords.value = val;
  searchHistoryList.value.splice(i, 1);
  onSearch();
}

function removeHistoryAccount(val: string, i: number) {
  searchHistoryList.value.splice(i, 1);
}

onDeactivated(() => {
  isShowModel.value = false;
});
</script>

<template>
  <div class="relative w-full">
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
        @clear="(isShowModel = false) && clearSearch()"
        @keyup.esc.stop.prevent="handleEsc()"
        @keyup.enter.stop="onSearch()"
        @keydown.arrow-down.stop="handleKeydown('arrow-down')"
        @keydown.arrow-up.stop="handleKeydown('arrow-up')"
      />
      <CommonElButton
        type="primary"
        class="w-5rem pr-4 text-sm shadow"
        style="position: relative; transition: 0.2s; height: 2rem;font-size: 0.8em;"
        :disabled="isLoading"
        icon-class="i-solar:magnifer-outline mr-1"
        @focus="isShowModel = true"
        @click.self="onSearch"
      >
        搜&nbsp;索
      </CommonElButton>
    </div>
    <Transition enter-active-class="animate-(fade-in duration-100)" leave-active-class="animate-(fade-out duration-100)">
      <div v-if="isShowModel" class="absolute left-0 top-8 z-1 w-full bg-color">
        <!-- 搜索历史记录 -->
        <div
          v-show="!searchPage.current && !isLoading"
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
          <span
            v-for="(p, i) in searchHistoryList"
            :key="p"
            closable
            size="small"
            type="primary"
            class="mb-1 mr-1 inline-block cursor-pointer bg-color-2 px-2 py-1 text-xs shadow-sm rounded hover:shadow"
            @close="handleClose(p)"
            @click="clickTag(p, i)"
          >
            {{ p }}
            <i title="删除" class="i-carbon:close ml-1 btn-danger p-2" @click.stop.capture="removeHistoryAccount(p, i)" />
          </span>
        </div>
        <!-- 历史记录 -->
        <div
          v-show="searchPageList.length > 0"
          class="mt-3 flex-row-bt-c border-default-t pl-1 pr-2 pt-2"
        >
          <span class="text-0.8rem">
            {{ ` 找到 ${searchPage.total} 个匹配好友` }}
          </span>
          <i
            i-solar:close-circle-line-duotone class="float-right btn-primary p-2.8" @click="(isShowModel = false) && clearSearch()"
          />
        </div>
        <!-- 列表 -->
        <div class="flex-1">
          <CommonListVirtualScrollList
            v-if="isShowResult && searchPage.current && searchPageList.length > 0"
            ref="virtualListRef"
            :items="searchPageList"
            item-height="4rem"
            height="calc(100dvh - 4rem)"
            :selected-index="currentFocus"
            class="relative flex-1 pt-2"
            wrap-class="py-2 pb-20 flex-1 overflow-hidden"
            enable-pull-to-refresh
            :overscan="20"
            :pull-trigger-distance="30"
            :pull-distance="60"
            @end-reached="onEndReached"
          >
            <template #default="{ item, isActive }">
              <div
                class="relative mb-2 flex cursor-pointer items-center truncate card-bg-color card-default p-2 transition-300 transition-all hover:(bg-color-2 shadow-sm)"
                :class="{
                  selected: chat.theFriendOpt.type === FriendOptType.User && chat.theFriendOpt.data?.id === item?.id,
                  focused: isActive,
                }"
                tabindex="0"
                @click="emit('submit', item)"
              >
                <CommonElImage
                  :src="BaseUrlImg + item.avatar"
                  fit="cover"
                  error-class="i-solar:user-bold-duotone"
                  class="mr-2 h-10 w-10 border-default rounded-full card-default object-cover"
                />
                <small>{{ item.nickname || item.username }}</small>
              </div>
            </template>
            <template #end>
              <div v-if="!noMore && searchPageList.length > 0" class="py-2 text-center">
                <div v-if="isLoading" class="text-mini">
                  加载中...
                </div>
              </div>
              <div v-if="noMore && searchPageList.length > 0" class="py-2 text-center">
                <p class="text-mini">
                  暂无更多
                </p>
              </div>
            </template>
          </CommonListVirtualScrollList>
          <ElEmpty
            v-if="!searchPage.total"
            class="h-100dvh min-h-0 flex flex-1 flex-col items-center justify-center"
            :image-size="80"
            :description="searchPageList.length <= 0 && searchPage.current > 0 ? '没有找到好友' : '好友查找'"
          >
            <template #image>
              <i data-fade i-solar:users-group-two-rounded-bold-duotone p-2rem op-40 />
            </template>
          </ElEmpty>
        </div>
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
