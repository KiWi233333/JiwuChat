<script setup lang="ts" generic="T = any">
import type { ScrollbarDirection } from "element-plus";
import { createReusableTemplate } from "@vueuse/core";

// 虚拟列表项接口
interface VirtualListItem<T> {
  index: number
  data: T
  top: number
}

// 可见范围接口
interface VisibleRange {
  startIndex: number
  endIndex: number
  visibleCount: number
}

// 滚动事件接口
interface ScrollEvent {
  scrollTop: number
  scrollLeft: number
}

// 接口定义
interface Props<T = any> {
  items?: T[]
  itemHeight?: number | string
  height?: string
  maxHeight?: string
  wrapClass?: any
  className?: any
  itemClass?: any
  activeClass?: string
  selectedIndex?: number
  overscan?: number
  getItemKey?: (item: T, index: number) => string | number // 下拉刷新相关属性
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
}

interface Emits<T = any> {
  (e: "itemClick", item: T, index: number): void
  (e: "itemHover", item: T, index: number): void
  (e: "update:selectedIndex", index: number): void
  (e: "scroll", event: ScrollEvent): void
  (e: "endReached", direction: ScrollbarDirection): void
  (e: "refresh"): Promise<any>
}

// Props 解构
const {
  itemHeight = "",
  maxHeight = "",
  wrapClass = "",
  className = "",
  itemClass = "",
  activeClass = "active",
  selectedIndex = -1,
  overscan = 10,
  items = [] as T[],
  getItemKey = (item: T, index: number) => (item as any).id || (item as any).userId || index,
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
  onRefresh,
} = defineProps<Props<T>>();
const emit = defineEmits<Emits<T>>();
const setting = useSettingStore();
const baseFontSize = computed(() => setting.settingPage.fontSize.value);

const scrollbarRef = useTemplateRef("scrollbarRef");
const pullContainerRef = ref<HTMLElement>();

// 下拉刷新相关状态
const startY = ref(0);
const _pullDistance = ref(0);
const isPulling = ref(false);
const isRefreshing = ref(false);
const refreshText = ref(pullRefreshText);
let refreshTimeoutTimer: number | null = null;

// 使用被动事件监听选项优化触摸事件性能
const passiveOptions = { passive: false };
// 工具函数：解析高度字符串
function parseHeight(height: string | number): number {
  if (typeof height === "number") {
    return height;
  }

  if (height.endsWith("rem")) {
    const remValue = Number.parseFloat(height);
    const fontSize = Number(baseFontSize.value) || 16; // 确保是数字类型，默认16px
    return remValue * fontSize;
  }
  if (height.endsWith("px")) {
    return Number.parseFloat(height);
  }
  if (height.endsWith("vh")) {
    return (Number.parseFloat(height) * window.innerHeight) / 100;
  }
  const numValue = Number.parseFloat(height);
  return Number.isNaN(numValue) ? 250 : numValue;
}
// 创建虚拟列表逻辑
function useVirtualList() {
  const containerHeight = ref(250);
  const scrollTop = ref(0);

  // 解析后的 itemHeight 值 - 响应 baseFontSize 变化
  const parsedItemHeight = computed(() => parseHeight(itemHeight));
  // 监听 maxHeight 变化
  watch(() => maxHeight, (newHeight) => {
    containerHeight.value = parseHeight(newHeight);
  }, { immediate: true });

  // 监听 baseFontSize 变化，重新计算滚动位置
  watch(() => baseFontSize.value, () => {
    const currentVisibleIndex = Math.floor(scrollTop.value / parsedItemHeight.value);
    nextTick(() => {
      scrollToItem(currentVisibleIndex);
    });
  });
  // 计算起始索引 - 参考代码简化版
  const startIndex = computed(() => {
    return Math.floor(scrollTop.value / parsedItemHeight.value);
  });

  // 计算结束索引 - 参考代码逻辑
  const endIndex = computed(() => {
    const visibleCount = Math.ceil(containerHeight.value / parsedItemHeight.value);
    return Math.min(startIndex.value + visibleCount + overscan, items.length);
  });
  // 计算可见项目列表 - 参考代码逻辑，添加前置缓冲
  const visibleItems = computed<VirtualListItem<T>[]>(() => {
    const result: VirtualListItem<T>[] = [];
    const start = Math.max(0, startIndex.value - Math.floor(overscan / 2));

    for (let i = start; i < endIndex.value; i++) {
      const item = items[i];
      if (item !== undefined) {
        result.push({
          index: i,
          data: item,
          top: i * parsedItemHeight.value,
        });
      }
    }
    return result;
  });

  // 计算总高度
  const totalHeight = computed(() => {
    return items.length * parsedItemHeight.value;
  });

  // 滚动事件处理
  function onScroll(event: ScrollEvent) {
    scrollTop.value = event.scrollTop;
    emit("scroll", event);
  }
  // 滚动到指定项
  function scrollToItem(index: number) {
    if (!scrollbarRef.value || index < 0 || index >= items.length) {
      return;
    }

    const targetScrollTop = index * parsedItemHeight.value;
    scrollTop.value = targetScrollTop;

    nextTick(() => {
      // 查找对应的DOM元素并滚动到视图中
      const itemElement = scrollbarRef.value?.wrapRef?.querySelector(`[data-index="${index}"]`);
      if (itemElement) {
        itemElement.scrollIntoView({
          block: "nearest",
        });
      }
      else {
        // 如果找不到元素，回退到scrollTo方法
        scrollbarRef.value?.wrapRef?.scrollTo({
          top: targetScrollTop,
        });
      }
    });
  }

  return {
    containerHeight,
    scrollTop,
    startIndex,
    endIndex,
    visibleItems,
    totalHeight,
    onScroll,
    scrollToItem,
    parsedItemHeight,
  };
}

// 使用虚拟列表逻辑
const {
  containerHeight,
  scrollTop,
  startIndex,
  endIndex,
  visibleItems,
  totalHeight,
  onScroll,
  scrollToItem,
  parsedItemHeight,
} = useVirtualList();

// 内部计算是否在顶部
const isScrollTop = computed(() => scrollTop.value <= 0);

// 计算是否有数据
const hasItems = computed(() => items.length > 0);

// 处理点击事件
function handleItemClick(item: T, index: number) {
  emit("itemClick", item, index);
  emit("update:selectedIndex", index);
}

// 处理鼠标悬停事件
function handleItemHover(item: T, index: number) {
  emit("itemHover", item, index);
}

// 滚动到选中项
function scrollToSelectedItem() {
  if (selectedIndex >= 0) {
    scrollToItem(selectedIndex);
  }
}

// 获取当前滚动位置
function getScrollTop(): number {
  return scrollTop.value;
}

// 设置滚动位置
function setScrollTop(newScrollTop: number) {
  const maxScrollTop = Math.max(0, totalHeight.value - containerHeight.value);
  const clampedScrollTop = Math.max(0, Math.min(newScrollTop, maxScrollTop));

  scrollTop.value = clampedScrollTop;
  if (scrollbarRef.value?.wrapRef) {
    scrollbarRef.value.wrapRef.scrollTop = clampedScrollTop;
  }
}

// 滚动到顶部
function scrollToTop() {
  setScrollTop(0);
}

// 滚动到底部
function scrollToBottom() {
  setScrollTop(totalHeight.value);
}

// 获取当前可见项目信息
function getVisibleRange(): VisibleRange {
  return {
    startIndex: startIndex.value,
    endIndex: endIndex.value,
    visibleCount: endIndex.value - startIndex.value,
  };
}

// 监听项目数据变化
watch(() => items.length, (newLength) => {
  if (newLength === 0) {
    scrollTop.value = 0;
  }
  else if (scrollTop.value > newLength * parsedItemHeight.value) {
    setScrollTop(Math.max(0, newLength * parsedItemHeight.value - containerHeight.value));
  }
});

// 监听项目高度变化
watch(() => itemHeight, () => {
  const currentVisibleIndex = Math.floor(scrollTop.value / parsedItemHeight.value);
  nextTick(() => {
    scrollToItem(currentVisibleIndex);
  });
});

// 添加和删除事件监听器
onMounted(() => {
  if (enablePullToRefresh) {
    // 在scrollbar的wrap元素上添加事件监听器
    const targetElement = pullContainerRef.value || scrollbarRef.value?.wrapRef;
    if (targetElement) {
      targetElement.addEventListener("touchstart", handleTouchStart, passiveOptions);
      targetElement.addEventListener("touchmove", handleTouchMove, passiveOptions);
      targetElement.addEventListener("touchend", handleTouchEnd, passiveOptions);
    }
  }
});

onUnmounted(() => {
  if (refreshTimeoutTimer) {
    clearTimeout(refreshTimeoutTimer);
  }

  // 清理事件监听器
  if (enablePullToRefresh) {
    const targetElement = pullContainerRef.value || scrollbarRef.value?.wrapRef;
    if (targetElement) {
      targetElement.removeEventListener("touchstart", handleTouchStart);
      targetElement.removeEventListener("touchmove", handleTouchMove);
      targetElement.removeEventListener("touchend", handleTouchEnd);
    }
  }
});

// 检查当前是否可以下拉刷新
function canPullToRefresh() {
  if (!enablePullToRefresh)
    return false;
  if (isRefreshing.value)
    return false;
  if (disableWhenLoading && scrollTop.value > 0)
    return false;
  return isScrollTop.value;
}

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
    // 发出刷新事件
    emit("refresh");
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

// 暴露方法给父组件
defineExpose({
  scrollToItem,
  scrollToSelectedItem,
  getScrollTop,
  setScrollTop,
  scrollToTop,
  scrollToBottom,
  getVisibleRange,
  scrollbarRef,
  finishRefresh,
  pullContainerRef,
});

// 创建可重用模板
const [DefineVirtualListContent, ReuseVirtualListContent] = createReusableTemplate();
</script>

<template>
  <!-- 定义可重用的虚拟列表内容模板 -->
  <DefineVirtualListContent>
    <slot name="pre" />
    <!-- 空状态插槽 -->
    <template v-if="!hasItems">
      <slot name="empty" />
    </template>
    <!-- 虚拟列表容器 -->
    <div
      v-else
      :style="{
        height: `${totalHeight}px`,
        position: 'relative',
      }"
    >
      <!-- 可见项目 -->
      <div
        v-for="item in visibleItems"
        :key="getItemKey(item.data, item.index)"
        :data-index="item.index" :style="{
          position: 'absolute',
          top: `${item.top}px`,
          left: 0,
          right: 0,
          height: `${parsedItemHeight}px`,
        }"
        :class="[
          itemClass,
          { [activeClass]: item.index === selectedIndex },
        ]"
        @click="handleItemClick(item.data, item.index)"
        @mouseover="handleItemHover(item.data, item.index)"
      >
        <!-- 默认插槽 -->
        <slot
          name="default"
          :item="item.data"
          :index="item.index"
          :is-active="item.index === selectedIndex"
        />
      </div>
    </div>
    <slot name="end" />
  </DefineVirtualListContent>

  <el-scrollbar
    ref="scrollbarRef"
    :max-height="maxHeight"
    :height="height"
    :wrap-class="wrapClass"
    v-bind="$attrs"
    :class="className || $attrs.class"
    @scroll="onScroll"
    @end-reached="(direction) => emit('endReached', direction)"
  >
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

      <!-- 重用虚拟列表内容 -->
      <ReuseVirtualListContent />
    </div>

    <!-- 不启用下拉刷新时重用虚拟列表内容 -->
    <ReuseVirtualListContent v-else />
  </el-scrollbar>
</template>

<style scoped>
/* 组件默认样式 */
.virtual-list-item {
  transition: background-color 0.2s ease;
  cursor: pointer;
}

.virtual-list-item:hover {
  background-color: var(--el-fill-color-light);
}

.virtual-list-item.active {
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}
</style>
