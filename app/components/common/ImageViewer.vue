<script lang="ts" setup>
const SHOW_SHORTCUT_TIPS_KEY = "image-viewer-show-shortcut-tips";
const IS_SHORTCUT_CARD_COLLAPSED_KEY = "image-viewer-is-shortcut-card-collapsed";

// 快捷键信息
interface ShortcutInfo {
  key: string;
  description: string;
  disabled?: ComputedRef<boolean>;
}
const MAX_SCALE = 20; // 最大缩放倍数
const MIN_SCALE = 0.1; // 最小缩放倍数
// 定义快捷键列表
const keyShortList = ref<ShortcutInfo[]>([
  { key: "←", description: "上一张图片" },
  { key: "→", description: "下一张图片" },
  { key: "+", description: "放大图片" },
  { key: "-", description: "缩小图片" },
  { key: "r", description: "顺时针旋转" },
  { key: "R", description: "逆时针旋转" },
  { key: "0", description: "重置图片" },
  { key: "Esc", description: "关闭预览" },
  { key: "双击", description: "放大或重置图片" },
]);
const filterKeyShortList = computed(() => keyShortList.value.filter(item => !item?.disabled));

const keyDownFnMap: Record<string, () => void> = {
  "ArrowLeft": prev,
  "ArrowRight": next,
  "+": zoomIn,
  "-": zoomOut,
  "r": rotateClockwise,
  "R": rotateAnticlockwise,
  "0": resetImage,
  "Escape": close,
};

// 使用 localStorage 存储用户是否不再显示提示
const showShortcutTips = useLocalStorage<boolean>(SHOW_SHORTCUT_TIPS_KEY, true);
const hiddenShortcutTips = computed({
  get: () => !showShortcutTips.value,
  set: (val) => {
    showShortcutTips.value = !val;
  },
});

// 控制提示卡片是否折叠
const isShortcutCardCollapsed = useLocalStorage<boolean>(IS_SHORTCUT_CARD_COLLAPSED_KEY, false); ;

// 关闭提示但不记住选择
function closeShortcutCard() {
  if (showShortcutTips.value) {
    isShortcutCardCollapsed.value = true;
  }
}

// 折叠/展开提示卡片
function toggleShortcutCard() {
  isShortcutCardCollapsed.value = !isShortcutCardCollapsed.value;
}
export interface ViewerOptions {
  urlList: string[];
  initialIndex?: number;
  index?: number;
  ctxName?: string;
  closeCallback?: () => void;
}
export interface ImageViewerState {
  visible: boolean;
  index: number;
  urlList: string[];
  closeCallback?: () => void;
}

const state = reactive<ImageViewerState>({
  visible: false,
  index: 0,
  urlList: [],
  closeCallback: () => {},
});

// 图片操作状态
const imageState = reactive({
  scale: 1,
  rotate: 0,
  translateX: 0,
  translateY: 0,
  moving: false,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  pinching: false,
  initialDistance: 0,
  initialScale: 1,
});

// 引用图片元素
const imageRef = useTemplateRef<HTMLImageElement>("imageRef");
const containerRef = useTemplateRef<HTMLDivElement>("containerRef");

// 计算当前显示的图片URL
const currentImageUrl = computed(() => {
  if (!state.urlList.length || state.index < 0 || state.index >= state.urlList.length) {
    return "";
  }
  return state.urlList[state.index];
});

// 是否显示上一张/下一张按钮
const showPrev = computed(() => state.urlList.length > 1 && state.index > 0);
const showNext = computed(() => state.urlList.length > 1 && state.index < state.urlList.length - 1);

// 重置图片状态
function resetImage() {
  imageState.moving = false; // 确保重置有动画
  imageState.scale = 1;
  imageState.rotate = 0;
  imageState.translateX = 0;
  imageState.translateY = 0;
}

// 图片变换样式
const imageStyle = computed(() => {
  return {
    transform: `translate(${imageState.translateX}px, ${imageState.translateY}px) scale(${imageState.scale}) rotate(${imageState.rotate}deg)`,
    // 性能优化：告诉浏览器 transform 属性即将变化，启用 GPU 加速层
    willChange: imageState.moving ? "transform" : "auto",
    // 当 moving 为 true (触摸板/拖拽) 时，禁用 transition，依靠 rAF 实时渲染
    // 当 moving 为 false (鼠标滚轮/按钮) 时，启用 transition，依靠 CSS 补间
    transition: imageState.moving || imageState.pinching ? "none" : "transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
  };
});

// 提供给外部的调用方法
const timer = ref();
function open(options: ViewerOptions) {
  const setting = useSettingStore();
  state.index = options.index || 0;
  state.urlList = options.urlList || [];
  state.visible = true;
  state.closeCallback = options.closeCallback;
  if (setting.isMobileSize && showShortcutTips.value) {
    showShortcutTips.value = false;
  }
  resetImage();

  // 打开时如果用户没有选择隐藏提示，则显示提示
  if (showShortcutTips.value && !setting.isMobileSize && !isShortcutCardCollapsed.value) {
    clearTimeout(timer.value);
    timer.value = setTimeout(() => {
      // 显示1秒后自动折叠
      timer.value = setTimeout(() => {
        isShortcutCardCollapsed.value = true;
      }, 2000);
    }, 500);
  }
}

// 关闭预览
function close() {
  state.visible = false;
  nextTick(() => state.closeCallback?.());
}

// 保存图片
function saveImage(url: string) {
  saveImageLocal(url);
}

// 放大
function zoomIn() {
  imageState.moving = false; // 按钮操作需启用动画
  imageState.scale = Math.min(imageState.scale * 1.2, MAX_SCALE);
}

// 缩小
function zoomOut() {
  imageState.moving = false; // 按钮操作需启用动画
  imageState.scale = Math.max(imageState.scale / 1.2, MIN_SCALE);
}

// 顺时针旋转
function rotateClockwise() {
  imageState.moving = false;
  imageState.rotate += 90;
}

// 逆时针旋转
function rotateAnticlockwise() {
  imageState.moving = false;
  imageState.rotate -= 90;
}

// 切换到上一张图片
function prev() {
  if (state.index > 0) {
    state.index--;
    resetImage();
  }
}

// 切换到下一张图片
function next() {
  if (state.index < state.urlList.length - 1) {
    state.index++;
    resetImage();
  }
}

// 处理键盘事件
function handleKeydown(e: KeyboardEvent) {
  if (!state.visible)
    return;
  e.stopPropagation(); // 阻止事件冒泡
  e.preventDefault(); // 阻止默认行为
  keyDownFnMap[e.key]?.();
}

// 鼠标拖动开始
function handleMouseDown(e: MouseEvent) {
  if (e.button !== 0)
    return; // 只处理左键点击

  e.preventDefault();
  e.stopPropagation(); // 阻止事件冒泡

  imageState.moving = true;
  imageState.startX = e.clientX;
  imageState.startY = e.clientY;
  imageState.lastX = imageState.translateX;
  imageState.lastY = imageState.translateY;

  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
}

// 鼠标拖动中
function handleMouseMove(e: MouseEvent) {
  if (!imageState.moving)
    return;

  // 使用 requestAnimationFrame 节流拖动，提升性能
  requestAnimationFrame(() => {
    const deltaX = e.clientX - imageState.startX;
    const deltaY = e.clientY - imageState.startY;
    imageState.translateX = imageState.lastX + deltaX;
    imageState.translateY = imageState.lastY + deltaY;
  });
}

// 鼠标拖动结束
function handleMouseUp() {
  imageState.moving = false;
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
}

// --- 滚轮/触摸板优化核心逻辑 ---
let wheelStopTimer: ReturnType<typeof setTimeout>;
let accumulatedDelta = 0; // 累积滚轮增量
let ticking = false; // rAF 锁

function handleWheel(e: WheelEvent) {
  e.preventDefault();
  e.stopPropagation();

  // 1. 累积 Delta (解决掉帧的核心：不要每帧都计算)
  let currentDelta = e.deltaY;
  if (e.deltaMode === 1)
    currentDelta *= 40;
  if (e.deltaMode === 2)
    currentDelta *= 800;

  accumulatedDelta += currentDelta;

  // 2. 检测设备类型
  // 触摸板的单次 delta 很小 (绝对值通常 < 40)，且触发频率极高
  const isTouchPad = Math.abs(currentDelta) < 40 && e.deltaMode === 0;

  // 3. 状态切换
  if (isTouchPad) {
    imageState.moving = true; // 触摸板：禁用 transition，完全跟手
  }
  else {
    imageState.moving = false; // 鼠标滚轮：启用 transition，平滑补间
    // 对于鼠标滚轮，我们不需要 accumulation/rAF 机制，
    // 因为滚轮事件频率低，直接应用 transition 效果更好
    // 下面的 rAF 逻辑主要服务于触摸板
  }

  // 4. 使用 requestAnimationFrame 进行渲染节流
  if (!ticking) {
    window.requestAnimationFrame(() => {
      performZoom(isTouchPad);
      ticking = false;
    });
    ticking = true;
  }

  // 5. 触摸板防抖复位
  if (isTouchPad) {
    clearTimeout(wheelStopTimer);
    wheelStopTimer = setTimeout(() => {
      imageState.moving = false;
      accumulatedDelta = 0; // 清空残余
    }, 200);
  }
}

function performZoom(isTouchPad: boolean) {
  if (accumulatedDelta === 0)
    return;

  // 如果是鼠标滚轮，我们希望它一次性响应，而不是被 rAF 分割，
  // 但为了代码统一，我们在 calculate 时处理灵敏度即可。

  // 灵敏度微调：
  // 触摸板非常灵敏，系数需要小；鼠标滚轮单次值大，系数也要适中
  const sensitivity = isTouchPad ? 0.0025 : 0.002;

  const zoomFactor = Math.exp(-accumulatedDelta * sensitivity);

  // 计算新比例
  const newScale = imageState.scale * zoomFactor;
  imageState.scale = Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE);

  // 如果是触摸板，每帧处理完后清空 delta，等待下一帧积累
  // 如果是鼠标滚轮，由于我们希望利用 CSS transition，其实这里 rAF 执行一次也足够
  accumulatedDelta = 0;
}

// 触摸开始
function handleTouchStart(e: TouchEvent) {
  e.preventDefault();
  e.stopPropagation(); // 阻止事件冒泡

  if (e.touches.length === 1) {
    // 单指拖动
    imageState.moving = true;
    imageState.startX = e.touches[0]?.clientX || 0;
    imageState.startY = e.touches[0]?.clientY || 0;
    imageState.lastX = imageState.translateX;
    imageState.lastY = imageState.translateY;
  }
  else if (e.touches.length === 2) {
    // 双指捏合缩放
    imageState.pinching = true;
    imageState.initialDistance = getDistance(
      e.touches[0]?.clientX || 0,
      e.touches[0]?.clientY || 0,
      e.touches[1]?.clientX || 0,
      e.touches[1]?.clientY || 0,
    );
    imageState.initialScale = imageState.scale;
  }
}

// 触摸移动
function handleTouchMove(e: TouchEvent) {
  e.preventDefault();
  e.stopPropagation(); // 阻止事件冒泡

  // 使用 requestAnimationFrame 优化触摸性能
  if (!ticking) {
    requestAnimationFrame(() => {
      if (imageState.moving && e.touches.length === 1) {
        // 单指拖动
        const deltaX = (e.touches[0]?.clientX || 0) - imageState.startX;
        const deltaY = (e.touches[0]?.clientY || 0) - imageState.startY;

        imageState.translateX = imageState.lastX + deltaX;
        imageState.translateY = imageState.lastY + deltaY;
      }
      else if (imageState.pinching && e.touches.length === 2) {
        // 双指捏合缩放
        const touch1X = e.touches[0]?.clientX || 0;
        const touch1Y = e.touches[0]?.clientY || 0;
        const touch2X = e.touches[1]?.clientX || 0;
        const touch2Y = e.touches[1]?.clientY || 0;

        const currentDistance = getDistance(touch1X, touch1Y, touch2X, touch2Y);
        const ratio = currentDistance / imageState.initialDistance;

        imageState.scale = Math.min(Math.max(imageState.initialScale * ratio, 0.1), 10);
      }
      ticking = false;
    });
    ticking = true;
  }
}

// 触摸结束
function handleTouchEnd() {
  imageState.moving = false;
  imageState.pinching = false;
}

// 计算两点之间的距离
function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// 双击放大/还原
function handleDoubleClick(e: MouseEvent) {
  e.stopPropagation(); // 阻止事件冒泡

  imageState.moving = false; // 双击需要动画
  if (imageState.scale !== 1) {
    resetImage();
  }
  else {
    zoomIn();
  }
}

// 处理背景点击事件
function handleContainerClick(e: MouseEvent) {
  // 仅当点击在容器而不是图片上时关闭预览
  // 检查目标元素是否为图片
  const target = e.target as HTMLElement;
  if (target === containerRef.value && !imageRef.value?.contains(target)) {
    close();
  }
}

// 销毁组件
function destroy() {
  close();
}

// 监听键盘事件
onMounted(() => {
  document.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", handleKeydown);
});

// 暴露方法给外部使用
defineExpose({
  open,
  close,
  destroy,
  state,
});
</script>

<template>
  <CommonPopupDesktop
    v-model="state.visible"
    :duration="300"
    :min-scale="0.4"
    :show-close="false"
    :z-index="1200"
    destroy-on-close
    content-class="w-full h-full custom-image-viewer"
    :close-on-click-modal="true"
  >
    <!-- 图片显示区域 -->
    <div
      ref="containerRef"
      class="absolute inset-0 z-0 flex items-center justify-center"
      @wheel="handleWheel"
      @click="handleContainerClick"
    >
      <img
        v-if="currentImageUrl"
        ref="imageRef"
        :src="currentImageUrl"
        :style="imageStyle"
        class="max-h-full max-w-full cursor-move select-none object-contain md:max-w-70vw"
        @mousedown="handleMouseDown"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
        @dblclick="handleDoubleClick"
        @click.stop
      >
    </div>

    <template #before>
      <!-- 控件容器 - 脱离布局流，确保控件不影响点击遮罩 -->
      <div
        v-show="state.visible" class="pointer-events-none fixed inset-0 animate-(fade-in duration-300)"
        :style="{ 'z-index': 1201 }"
      >
        <!-- 关闭按钮 -->
        <div
          class="btn-bg flex-center pointer-events-auto absolute right-5 top-5 cursor-pointer rounded-full p-2 text-6"
          @click="close"
        >
          <i class="i-carbon:close p-3" />
        </div>
        <!-- 工具栏 -->
        <div class="pointer-events-auto absolute bottom-10 left-1/2 flex transform items-center gap-4 rounded-2 card-default-br p-2.5 p-x-3.75 -translate-x-1/2">
          <el-icon-d-arrow-left
            v-if="showPrev"
            class="btn"
            title="上一张"
            @click.stop="prev"
          />
          <!-- zoom -->
          <el-icon-zoom-in
            class="btn"
            title="放大"
            @click.stop="zoomIn"
          />
          <el-icon-zoom-out
            class="btn"
            title="缩小"
            @click.stop="zoomOut"
          />
          <!-- rotate -->
          <el-icon-refresh-right
            class="btn scale-104"
            title="向前旋转"
            @click.stop="rotateClockwise"
          />
          <!-- reset -->
          <span
            class="btn i-tabler:maximize !p-3"
            @click.stop="resetImage"
          />
          <el-icon-refresh-left
            class="btn scale-104"
            title="重置"
            @click.stop="rotateAnticlockwise"
          />
          <el-icon-download
            v-if="currentImageUrl"
            class="h-1.4rem w-1.4rem btn-primary dark:btn-info"
            title="保存"
            @click.stop="saveImage(currentImageUrl)"
          />
          <el-icon-d-arrow-right
            v-if="showNext"
            class="btn"
            title="下一张"
            @click.stop="next"
          />
          <i
            v-if="!showShortcutTips"
            title="提示"
            class="inline-blcok i-solar:question-circle-linear h-1.4rem w-1.4rem btn-primary dark:btn-info" @click.stop="showShortcutTips = true"
          />
        </div>
        <!-- 左右切换箭头 -->
        <div
          v-if="showPrev"
          class="flex-center btn-bg pointer-events-auto fixed left-5 top-1/2 cursor-pointer rounded-2 py-2 text-6 -translate-y-1/2"
          @click.stop="prev"
        >
          <i class="i-carbon:chevron-left" />
        </div>
        <div
          v-if="showNext"
          class="flex-center btn-bg pointer-events-auto fixed right-5 top-1/2 cursor-pointer rounded-2 py-2 text-6 -translate-y-1/2"
          @click.stop="next"
        >
          <i class="i-carbon:chevron-right" />
        </div>
        <!-- 图片计数 -->
        <div
          v-if="state.urlList.length > 1"
          class="btn-bg pointer-events-auto fixed left-5 top-5 rounded-1 px-2.5 py-1.25 text-3.5"
        >
          {{ state.index + 1 }} / {{ state.urlList.length }}
        </div>
        <!-- 快捷键提示卡片 -->
        <div
          v-if="showShortcutTips"
          class="pointer-events-auto absolute left-2 top-2 w-12rem select-none bg-color-br text-sm shadow-md transition-200 card-rounded-df sm:(left-4 top-4)"
          :class="[isShortcutCardCollapsed ? 'transform -translate-x-full !left-0' : '']"
        >
          <div class="mb-2 flex-row-bt-c border-default-2-b px-3 py-2">
            <h4 class="text-3.5">
              <i class="i-carbon:keyboard mr-2 p-2.6" />
              快捷键
            </h4>
            <i class="i-carbon:close cursor-pointer p-2.6 hover:opacity-70" @click="isShortcutCardCollapsed = true" />
          </div>
          <div class="border-default-2-b px-3 py-2 text-mini leading-1.6em">
            <div v-for="shortcut in filterKeyShortList" :key="shortcut.key" class="flex-row-bt-c">
              <span>{{ shortcut.key }}</span>
              <span>{{ shortcut.description }}</span>
            </div>
          </div>
          <div class="flex-row-bt-c px-3 py-2">
            <el-checkbox v-model="hiddenShortcutTips" size="small" class="mr-1">
              不再提醒
            </el-checkbox>
            <span
              class="btn-primary text-xs"
              @click="closeShortcutCard"
            >知道了</span>
          </div>
          <!-- 折叠/展开按钮 -->
          <div
            v-show="isShortcutCardCollapsed && showShortcutTips"
            title="快捷键提示"
            class="absolute right-0 top-1/2 translate-x-full btn-primary-bg rounded-r-md bg-color px-1 py-2 text-color shadow -translate-y-1/2 !rounded-l-0"
            @click="toggleShortcutCard"
          >
            <i :class="[isShortcutCardCollapsed ? 'i-carbon:chevron-right' : 'i-carbon:chevron-left']" class="p-2.6" />
          </div>
        </div>
      </div>
    </template>
  </CommonPopupDesktop>
</template>

<style lang="scss">
.btn-bg {
  --at-apply: "bg-dark bg-opacity-15 backdrop-blur-2 text-light hover:bg-op-20 transition-200";
}
.btn {
  --at-apply: "w-1.4em h-1.4em btn-primary dark:btn-info";
}

.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.3s,
    transform 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
