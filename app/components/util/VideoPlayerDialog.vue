<script lang="ts" setup>
const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits(["update:modelValue"]);
const setting = useSettingStore();
const videoInfo = ref<{
  url: string;
  muted: boolean;
  mouseX?: number | undefined;
  mouseY?: number | undefined;
  thumbUrl?: string | undefined;
  thumbSize?: number | undefined;
  thumbWidth?: number | undefined;
  thumbHeight?: number | undefined;
}>({
  url: "",
  muted: true,
  mouseX: undefined,
  mouseY: undefined,

  thumbUrl: undefined,
  thumbSize: undefined,
  thumbWidth: undefined,
  thumbHeight: undefined,
});

const autoplay = ref(true);
// 拖拽
const dragHandler = useTemplateRef<HTMLDivElement>("dragHandler");
const dragRef = useTemplateRef<HTMLDivElement>("dragRef");
const disabledDrag = computed(() => setting.isMobileSize || !props.modelValue);
const dragRefStyle = ref({
  maxWidth: 0,
  maxHeight: 0,
});
const { x, y } = useDraggable(dragRef, {
  stopPropagation: true,
  handle: dragHandler,
  initialValue: { x: 0, y: 0 },
  disabled: disabledDrag,
  onMove: (position) => {
    const { innerWidth, innerHeight } = window;
    // 限制不移出屏幕边缘
    const newX = Math.min(Math.max(position.x, 0), innerWidth - (dragRef?.value?.offsetWidth || 0));
    const newY = Math.min(Math.max(position.y, 0), innerHeight - (dragRef?.value?.offsetHeight || 0));
    if (dragRef.value) {
      if (newX <= 50 || newY <= 50) {
        //
      }
      else if (newX >= innerWidth - (dragRefStyle.value.maxWidth || dragRef.value.offsetWidth) || newY >= innerHeight - (dragRefStyle.value.maxHeight || dragRef.value.offsetHeight)) {
        dragRefStyle.value.maxWidth = Math.max(dragRef.value.offsetWidth, dragRefStyle.value.maxWidth);
        dragRefStyle.value.maxHeight = Math.max(dragRef.value.offsetHeight, dragRefStyle.value.maxHeight);
      }
      position.x = newX;
      position.y = newY;
    }
  },
  onEnd: (position) => {
    const { innerWidth, innerHeight } = window;
    const dragRefElement = dragRef.value;
    const dragRefWidth = dragRefElement?.offsetWidth || 0;
    const dragRefHeight = dragRefElement?.offsetHeight || 0;
    const maxWidth = dragRefStyle.value.maxWidth || dragRefWidth;
    const maxHeight = dragRefStyle.value.maxHeight || dragRefHeight;
    // 限制不移出屏幕边缘
    const newX = Math.min(Math.max(position.x, 0), innerWidth - dragRefWidth);
    const newY = Math.min(Math.max(position.y, 0), innerHeight - dragRefHeight);

    if (dragRefElement) {
      const isCloseToMaxEdge = newX >= innerWidth - maxWidth || newY >= innerHeight - maxHeight;
      if (isCloseToMaxEdge) {
        position.x = newX + dragRefWidth + 60 >= innerWidth ? (innerWidth - dragRefWidth) : newX;
        position.y = newY + dragRefHeight + 60 >= innerHeight ? (innerHeight - dragRefHeight) : newY;
      }
    }
  },
});

// 打开视频
const show = computed({
  get: () => props.modelValue,
  set: (val: boolean) => {
    emit("update:modelValue", val);
  },
});

// 监听全屏切换
const videoPlayerRef = useTemplateRef<HTMLVideoElement | null>("videoPlayerRef");
const status = ref<"playing" | "play-dbsound" | "paused" | "ended">("paused");
const src = computed(() => videoInfo.value.url);
const { isFullscreen } = useFullscreenListener(videoPlayerRef);

// 全屏切换
async function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
}

// 关闭弹窗
function closeDialog() {
  show.value = false;
  destroy();
}

// 生命周期方法
function onPlay() {
  status.value = "playing";
}

function onPause() {
  status.value = "paused";
}

function onEnded() {
  status.value = "ended";
}


// 挂载时添加监听
onMounted(() => {
  mitter.on(MittEventType.VIDEO_READY, ({ type, payload }) => {
    // console.log(payload);
    switch (type) {
      case "play":
      case "play-dbsound":
        status.value = type === "play" ? "playing" : "play-dbsound";
        videoInfo.value = {
          url: payload.url,
          muted: status.value === "play-dbsound",
          mouseX: payload.mouseX || undefined,
          mouseY: payload.mouseY || undefined,
          thumbUrl: payload.thumbUrl,
          thumbSize: payload.thumbSize,
          thumbWidth: payload.thumbWidth,
          thumbHeight: payload.thumbHeight,
        };
        // 初始化居中
        show.value = true;
        nextTick(() => {
          const { innerWidth, innerHeight } = window;
          x.value = Math.floor((innerWidth - (dragRef.value?.offsetWidth || 0)) / 2);
          y.value = Math.floor((innerHeight - (dragRef.value?.offsetHeight || 0)) / 2);
        });
        // 自动播放
        autoplay.value = true;
        videoPlayerRef.value?.play();
        break;
      case "pause":
        status.value = "paused";
        videoPlayerRef.value?.pause();
        break;
      case "ended":
        status.value = "ended";
        show.value = false;
        break;
      default:
        break;
    }
  });
});

// 卸载时移除监听
function destroy() {
  if (videoPlayerRef.value) {
    videoPlayerRef.value?.pause?.();
  }
  setTimeout(() => {
    console.log("销毁");
    // 暂停视频
    videoPlayerRef.value?.pause?.();
    // 清空视频信息
    videoInfo.value = {
      ...videoInfo.value,
      url: "", // 清空部分
      muted: true,
    };
  }, 350);
  show.value = false;
}

onDeactivated(() => {
  destroy();
});
onUnmounted(() => {
  mitter.off(MittEventType.VIDEO_READY);
  destroy();
});

const videoSize = computed(() => {
  const res = {
    width: "100%",
    height: "100%",
  };
  if (videoInfo.value?.thumbWidth !== undefined && videoInfo.value?.thumbHeight !== undefined && globalThis) {
    const windowWidth = globalThis.window.innerWidth;
    const windowHeight = globalThis.window.innerHeight;
    if (setting.isMobileSize) {
      res.width = `100vw`;
      res.height = `100vh`;
    }
    else {
      const { width, height } = computedImgScaleSize(videoInfo.value.thumbWidth, videoInfo.value.thumbHeight, { maxWidth: Math.floor(windowWidth * 0.6), maxHeight: Math.floor(windowHeight * 0.6) });
      res.width = `${width}px`;
      res.height = `${height}px`;
    }
  }
  return res;
});
</script>

<template>
  <Transition
    mode="out-in"
    enter-active-class="animate-zoom-in-dailog"
    leave-active-class="animate-zoom-out-dailog"
  >
    <div
      v-show="show"
      title="视频播放器"
      class="video-player-dialog fixed left-0 top-0 z-1000 h-full w-full flex-row-c-c"
      :style="videoInfo.mouseX !== undefined && videoInfo.mouseY !== undefined ? `transform-origin: ${videoInfo.mouseX}px ${videoInfo.mouseY}px` : ''"
      @click.self="closeDialog"
    >
      <div
        ref="dragRef"
        class="group video-player fixed flex-row-c-c animate-[fade-in_0.4s] select-none border-default-hover card-rounded-df bg-color-2 shadow-lg transition-none"
        :style="{
          touchAction: 'none',
          left: `${x}px`,
          top: `${y}px`,
        }"
      >
        <div class="menu absolute left-0 top-0 z-1 w-full flex flex items-center p-2">
          <!-- 拖拽柄 -->
          <div ref="dragHandler" class="h-10 flex flex-1 select-none sm:cursor-move" />
          <div class="ml-a flex-row-c-c gap-4 card-default-br px-4 py-2 transition-opacity sm:(op-0 group-hover:op-100)">
            <div
              @click.stop="saveVideoLocal(videoInfo.url)"
            >
              <i
                class="i-solar:download-minimalistic-linear rounded-0"
                title="另存为"
                btn-info p-2.4 filter-drop-shadow-lg
              />
            </div>
            <div
              @click.stop="toggleFullscreen"
            >
              <i
                :class="isFullscreen ? 'i-tabler:minimize' : 'i-tabler:maximize'"
                title="全屏"
                btn-info rounded-0 p-2.4 filter-drop-shadow-lg
              />
            </div>
            <div @click.stop="closeDialog">
              <i title="关闭" i-carbon:close btn-danger rounded-0 p-2.8 filter-drop-shadow-lg />
            </div>
          </div>
        </div>
        <video
          v-if="src"
          ref="videoPlayerRef"
          :style="{ width: videoSize.width, height: videoSize.height }"
          :src="src"
          :autoplay="autoplay"
          controls
          preload="auto"
          :muted="!!videoInfo.muted"
          class="block h-full w-full overflow-hidden card-rounded-df object-contain"
          @play="onPlay"
          @pause="onPause"
          @ended="onEnded"
        />
        <!-- 视频封面 -->
        <!-- <div
          v-else-if="!setting.isMobileSize" hidden card-rounded-df sm:block
          :style="{ width: videoSize.width, height: videoSize.height, background: `url(${videoInfo.thumbUrl}) no-repeat center center / cover` }"
        /> -->
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* @unocss-include */
.animate-zoom-in-dailog {
  --at-apply: "animate-zoom-in";
  animation-timing-function: var(--animate-cubic) !important;
  animation-duration: 0.4s !important;
}
.animate-zoom-out-dailog {
  --at-apply: "animate-zoom-out";
  animation-timing-function: ease-in-out !important;
  animation-duration: 0.4s !important;
}
</style>
