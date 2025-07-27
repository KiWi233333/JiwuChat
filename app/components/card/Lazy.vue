<script lang="ts" setup>
const props = withDefaults(defineProps<{
  viewShow?: boolean
  delay?: number
  loadingClass?: string
}>(), {
  viewShow: true,
  delay: 400,
  loadingClass: "mx-a my-0.6em h-1.4rem w-1.4rem animate-[spin_2s_infinite_linear] rounded-6px bg-[var(--el-color-primary)]",
});

const emit = defineEmits(["done"]);

// 停止加载
const loadMoreRef = ref();
// 定时器
let timer = Date.now();
// 刷新
const { stop, isSupported } = useIntersectionObserver(
  loadMoreRef,
  ([obj]) => {
    if (obj && obj.isIntersecting)
      requestAnimationFrame(callBack);
    else
      timer && clearInterval(timer);
  },
);

function callBack() {
  const now = Date.now();
  if (now - timer < props.delay)
    return;
  cancelAnimationFrame(timer);
  stop && stop();
}

if (props.viewShow)
  emit("done");
onUnmounted(() => {
  if (timer) {
    cancelAnimationFrame(timer);
    timer = 0;
  }
});

watch(() => props.viewShow, (val) => {
  if (!val) {
    cancelAnimationFrame(timer);
    stop && stop();
  }
});

defineExpose({
  stop,
  loadMoreRef,
});
</script>

<template>
  <!-- 默认内容 -->
  <slot name="default" />
  <!-- 加载 -->
  <div
    v-if="!viewShow"
    ref="loadMoreRef"
    key="loadMoreRef"
  >
    <slot name="load">
      <div key="load" w-full flex-row-c-c py-2 text-center text-bluegray>
        <div
          :class="loadingClass"
        />
      </div>
    </slot>
  </div>
  <!-- 完成 -->
  <div v-else class="animate-fade-in">
    <slot name="done">
      <!-- 加载更多 -->
      <div v-if="!viewShow" key="done" h-2 w-full text-center text-bluegray @click="!isSupported && $emit('done')">
        <!-- 暂无更多 -->
      </div>
    </slot>
  </div>
</template>
