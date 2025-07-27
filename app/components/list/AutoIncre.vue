<script lang="ts" setup>
const {
  noMore = false,
  immediate = true,
  loading = false,
  autoStop = true,
  delay = 1000,
  thresholdHeight = 160,
  appendLoadingClass = "mx-a mt-a text-1.8rem",
  loadingClass = "mx-a my-0.4rem h-1rem w-1rem animate-[spin_2s_infinite_linear] rounded-6px bg-[var(--el-color-primary)]",
  // 下拉刷新默认值
  enablePullToRefresh = false,
  pullDistance: pullDistanceMax = 90,
  pullTriggerDistance = 60,
  pullRefreshText = "下拉刷新",
  pullReleaseText = "释放更新",
  pullRefreshingText = "更新中...",
  damping = 0.6,
  refreshTimeout = 2000,
  disableWhenLoading = true,
  isScrollTop = false,
  onRefresh,
} = defineProps<{
  noMore?: boolean
  immediate?: boolean
  delay?: number
  loading?: boolean
  loadingClass?: LoadingClassEnum | string
  appendLoadingClass?: string
  autoStop?: boolean
  thresholdHeight?: number
  // 下拉刷新相关属性
  isScrollTop?: boolean
  enablePullToRefresh?: boolean
  pullDistance?: number
  pullTriggerDistance?: number
  pullRefreshText?: string
  pullReleaseText?: string
  pullRefreshingText?: string
  onRefresh?: () => Promise<any>
  damping?: number
  refreshTimeout?: number
  disableWhenLoading?: boolean
}>();

const emit = defineEmits<{
  (e: "load"): any
}>();
enum LoadingClassEnum {
  "load-empty-circle",
  "load-chaotic-orbit",
  "load-db-rule",
}

// 停止加载
const loadMoreRef = useTemplateRef("loadMoreRef");
const isIntersecting = ref(false);
// 定时器
const timer = shallowRef<any>();
let refreshTimeoutTimer: number | null = null;

// 刷新
const { stop, isSupported } = useIntersectionObserver(
  loadMoreRef,
  (arr) => {
    const obj = arr[arr.length - 1];
    isIntersecting.value = !!obj?.isIntersecting;
    if (!isIntersecting.value) {
      clearInterval(timer.value);
    }
  },
  {
    threshold: 0,
  },
);

function callBack() {
  if (noMore && autoStop) {
    clearInterval(timer.value);
    stop && stop();
  }
  else {
    emit("load");
  }
}

watch(isIntersecting, (val) => {
  if (val) {
    callBack();
    timer.value = setInterval(callBack, delay);
  }
  else {
    clearInterval(timer.value);
  }
}, {
  immediate: true,
});

if (immediate) {
  nextTick(() => {
    clearInterval(timer.value);
    callBack();
    timer.value = setInterval(callBack, delay);
  });
}

// 展示加载
const showLoad = computed(() => !noMore);

// 是否没有更多
watch(() => noMore, (val) => {
  if (val && autoStop)
    stop && stop();
});

// 下拉刷新相关
const pullContainerRef = useTemplateRef("pullContainerRef");
const startY = ref(0);
const _pullDistance = ref(0);
const isPulling = ref(false);
const isRefreshing = ref(false);
const refreshText = ref(pullRefreshText);

// 内部loading状态
const isLoading = computed(() => loading || isRefreshing.value);

// 检查当前是否可以下拉刷新
function canPullToRefresh() {
  if (!enablePullToRefresh)
    return false;
  if (isRefreshing.value)
    return false;
  if (disableWhenLoading && loading)
    return false;
  return isScrollTop;
}

// 使用被动事件监听选项优化触摸事件性能
const passiveOptions = { passive: false };

// 触摸开始事件
function handleTouchStart(e: TouchEvent) {
  if (!canPullToRefresh())
    return;

  // 重置状态
  startY.value = e.touches?.[0]?.pageY || 0;
  isPulling.value = true;
  refreshText.value = pullRefreshText;
}

// 触摸移动事件
function handleTouchMove(e: TouchEvent) {
  if (!isPulling.value || isRefreshing.value)
    return;

  const currentY = e.touches?.[0]?.pageY || 0;
  const deltaY = currentY - startY.value;

  // 应用阻尼效果，使下拉体验更自然
  _pullDistance.value = deltaY > 0
    ? Math.min(pullDistanceMax, deltaY * damping)
    : 0;

  if (_pullDistance.value <= 0) {
    resetPullState();
    return;
  }

  // 防止页面滚动
  if (isPulling.value && _pullDistance.value > 0) {
    e.preventDefault();
  }

  refreshText.value = _pullDistance.value > pullTriggerDistance
    ? pullReleaseText
    : pullRefreshText;
}

// 触发刷新 只判断一次
const triggerRefresh = (() => {
  if (onRefresh && typeof onRefresh === "function") {
    return () => {
      isRefreshing.value = true;
      refreshText.value = pullRefreshingText;
      // 执行刷新回调
      onRefresh!().then(() => {
        finishRefresh();
      }).catch(() => {
        finishRefresh();
      });
      // 设置超时保护，防止刷新一直不结束
      refreshTimeoutTimer = window.setTimeout(() => {
        finishRefresh();
      }, refreshTimeout);
    };
  }
  return () => {
    isRefreshing.value = true;
    refreshText.value = pullRefreshingText;
    // 执行刷新回调
    if (onRefresh && typeof onRefresh === "function") {
      // @ts-expect-error
      onRefresh()?.then(() => {
        finishRefresh();
      }).catch(() => {
        finishRefresh();
      });
    }
    // 设置超时保护，防止刷新一直不结束
    refreshTimeoutTimer = window.setTimeout(() => {
      finishRefresh();
    }, refreshTimeout);
  };
})();

// 触摸结束事件
function handleTouchEnd() {
  if (!isPulling.value || isRefreshing.value)
    return;

  if (_pullDistance.value > pullTriggerDistance) {
    triggerRefresh();
  }
  else {
    resetPullState();
  }
}

// 重置下拉状态
function resetPullState() {
  _pullDistance.value = 0;
  isPulling.value = false;
}


// 完成刷新
function finishRefresh() {
  if (refreshTimeoutTimer) {
    clearTimeout(refreshTimeoutTimer);
    refreshTimeoutTimer = null;
  }

  _pullDistance.value = 0;
  isRefreshing.value = false;
  isPulling.value = false;
}

// 添加和删除事件监听器
onMounted(() => {
  if (enablePullToRefresh && pullContainerRef.value) {
    pullContainerRef.value.addEventListener("touchstart", handleTouchStart, passiveOptions);
    pullContainerRef.value.addEventListener("touchmove", handleTouchMove, passiveOptions);
    pullContainerRef.value.addEventListener("touchend", handleTouchEnd, passiveOptions);
  }
});

onUnmounted(() => {
  clearInterval(timer.value);
  if (refreshTimeoutTimer) {
    clearTimeout(refreshTimeoutTimer);
  }
  stop && stop();
  timer.value = null;

  // 清理事件监听器
  if (pullContainerRef.value) {
    pullContainerRef.value.removeEventListener("touchstart", handleTouchStart);
    pullContainerRef.value.removeEventListener("touchmove", handleTouchMove);
    pullContainerRef.value.removeEventListener("touchend", handleTouchEnd);
  }
});

// 暴露组件方法
defineExpose({
  stop,
  loadMoreRef,
  finishRefresh,
  pullContainerRef,
});
</script>

<template>
  <!-- 下拉刷新容器 -->
  <div
    v-if="enablePullToRefresh"
    ref="pullContainerRef"
    class="relative"
    :style="{
      transform: `translateY(${_pullDistance}px)`,
      transition: isRefreshing || !isPulling ? 'transform 0.3s cubic-bezier(0.23, 1, 0.32, 1)' : 'none',
      willChange: isPulling ? 'transform' : 'auto',
    }"
  >
    <!-- 下拉提示区域 -->
    <div
      v-show="isPulling || isRefreshing"
      class="absolute left-0 top-0 w-full flex-row-c-c transform py-2 text-center text-mini -translate-y-full"
      :style="{
        opacity: Math.min(1, _pullDistance / pullTriggerDistance),
        transform: `translateY(-${_pullDistance / 1.5}px) scale(${Math.min(1, pullDistanceMax / pullTriggerDistance + 0.2)})`,
      }"
    >
      <slot name="pull-text" :text="refreshText" :state="isRefreshing" :distance="_pullDistance">
        <div class="flex items-center justify-center">
          <svg
            v-if="isRefreshing"
            xmlns="http://www.w3.org/2000/svg" class="mr-1 h-5 w-5 animate-spin select-none" viewBox="0 0 24 24"
          ><g fill="none" fill-rule="evenodd"><path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" /><path fill="currentColor" d="M12 4.5a7.5 7.5 0 1 0 0 15a7.5 7.5 0 0 0 0-15M1.5 12C1.5 6.201 6.201 1.5 12 1.5S22.5 6.201 22.5 12S17.799 22.5 12 22.5S1.5 17.799 1.5 12" opacity=".1" /><path fill="currentColor" d="M12 4.5a7.46 7.46 0 0 0-5.187 2.083a1.5 1.5 0 0 1-2.075-2.166A10.46 10.46 0 0 1 12 1.5a1.5 1.5 0 0 1 0 3" /></g></svg>
          <svg
            v-else
            class="mr-1 h-5 w-5 transform transition-transform"
            :style="{ transform: `rotate(${Math.min(180, (_pullDistance / pullTriggerDistance) * 180)}deg)` }"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          ><path fill="currentColor" d="M12 4a1 1 0 0 1 .707.293l4 4a1 1 0 0 1-1.414 1.414L13 7.414V15a1 1 0 1 1-2 0V7.414L8.707 9.707a1 1 0 0 1-1.414-1.414l4-4A1 1 0 0 1 12 4M6 20a1 1 0 1 0 0-2a1 1 0 0 0 0 2m6 0a1 1 0 1 0 0-2a1 1 0 0 0 0 2m6 0a1 1 0 1 0 0-2a1 1 0 0 0 0 2" /></svg>
          {{ refreshText }}
        </div>
      </slot>
    </div>
    <slot name="default" />
    <!-- 加载更多区域 -->
    <div>
      <!-- 加载 -->
      <div
        v-if="showLoad"
        relative
        pt-6
      >
        <div
          ref="loadMoreRef"
          key="loadMoreRef"
          class="absolute top-0 z-1 w-full"
          :style="{ height: `${thresholdHeight}px` }"
        >
          <slot name="load">
            <div
              key="load"
              :class="`${loadingClass} ${appendLoadingClass}`"
            />
          </slot>
        </div>
      </div>
      <!-- 完成 -->
      <div v-else>
        <slot name="done">
          <div v-if="!noMore && !loading" key="done" mim-h-4 w-full text-center text-mini @click="!isSupported && $emit('load')">
            <!-- 暂无更多 -->
          </div>
        </slot>
      </div>
    </div>
  </div>

  <!-- 不启用下拉刷新时的原始内容 -->
  <template v-else>
    <slot name="default" />
    <!-- 加载 -->
    <div
      v-if="showLoad"
      relative
      pt-6
    >
      <div
        ref="loadMoreRef"
        key="loadMoreRef"
        class="absolute bottom-0 z-1 w-full flex flex-col"
        :style="{ height: `${thresholdHeight}px` }"
      >
        <slot name="load">
          <div
            key="load"
            :class="`${loadingClass} ${appendLoadingClass}`"
          />
        </slot>
      </div>
    </div>
    <!-- 完成 -->
    <template v-else>
      <slot name="done">
        <div v-if="!noMore && !loading" key="done" mim-h-4 w-full text-center text-mini @click="!isSupported && $emit('load')">
          <!-- 暂无更多 -->
        </div>
      </slot>
    </template>
  </template>
</template>
