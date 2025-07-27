<script lang="ts" setup>
import type { Position } from "@vueuse/core";
import ContextMenu from "@imengyu/vue3-context-menu";

const {
  modelValue,
  callType,
} = defineProps<{
  modelValue: boolean,
  callType: CallTypeEnum | null | undefined,
}>();
const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void
  (e: "update:callType", value: CallTypeEnum): void
}>();
const setting = useSettingStore();
const chat = useChatStore();
const user = useUserStore();
// 从useWebRTC获取状态和方法
const {
  rtcStatus,
  isRtcConnecting,
  callDuration,
  isSender,
  theContact,
  // 设备相关
  audioDevices,
  selectedAudioDevice,
  selectedVideoDevice,
  videoDevices,
  isSupportScreenSharing,
  isSupportFullscreen,

  // 状态相关
  connectionStatus,
  localStream,
  remoteStream,
  // 屏幕共享
  isScreenSharing,
  startScreenShare,
  stopScreenShare,

  // 方法
  endCall,
  toggleMute,
  toggleVideo,
  switchAudioDevice,
  switchVideoDevice,
  mounted,
  unMounted,
} = chat.useChatWebRTC();
onMounted(() => {
  mounted();
});

// 清理资源
onUnmounted(() => {
  unMounted();
});


enum MaxVideoObjEnum {
  CONTAIN = "object-contain",
  COVER = "object-cover",
  FILL = "object-fill",
}
const maxVideoCoverList = [{
  className: MaxVideoObjEnum.CONTAIN,
  detailText: "原始比例",
}, {
  className: MaxVideoObjEnum.COVER,
  detailText: "全面屏",
}, {
  className: MaxVideoObjEnum.FILL,
  detailText: "拉伸",
}];
const mainVideoRef = ref<HTMLVideoElement>();

// 通话状态
const isConnected = computed(() => connectionStatus.value === CallStatusEnum.ACCEPT || rtcStatus.value === "connected");
const isConnectClose = computed(() => [undefined, CallStatusEnum.END, CallStatusEnum.CANCEL, CallStatusEnum.REJECT, CallStatusEnum.BUSY, CallStatusEnum.ERROR].includes(connectionStatus.value));

// 设置
// @unocss-include
const isMaxVideoClass = ref<MaxVideoObjEnum>(MaxVideoObjEnum.CONTAIN); // 最大化视频
const isSelfMinView = ref(false); // 切换视频流
const minWindStream = computed(() => callType === CallTypeEnum.VIDEO ? (!isSelfMinView.value ? localStream.value : remoteStream.value) : null); // 小窗口的视频流
const maxWindStream = computed(() => callType === CallTypeEnum.VIDEO ? (isSelfMinView.value ? localStream.value : remoteStream.value) : remoteStream.value); // 大窗口的视频流
const audioVolume = ref(1); // 最小音量 默认扬声器音量
const minWindStreamProps = computed(() => ({ muted: !isSelfMinView.value, volume: !isSelfMinView.value ? 0 : audioVolume.value })); // 非本人视频静音
const maxWindStreamProps = computed(() => ({ muted: isSelfMinView.value, volume: isSelfMinView.value ? 0 : audioVolume.value }));// 本人视频静音
const isMinWind = ref(false); // 最小化
const isMaxWind = ref(false); // 全屏|窗口通话

// 拖拽
const dragRef = useTemplateRef<HTMLDivElement>("dragRef");
const dragRefStyle = ref({
  maxWidth: 0,
  maxHeight: 0,
});
const disableDrag = computed(() => (setting.isMobileSize && !isMinWind.value) || !modelValue);
function onMoveDb(position: Position) {
  const { innerWidth, innerHeight } = window;
  // 限制不移出屏幕边缘
  const newX = Math.min(Math.max(position.x, 0), innerWidth - (dragRef?.value?.offsetWidth || 0));
  const newY = Math.min(Math.max(position.y, 0), innerHeight - (dragRef?.value?.offsetHeight || 0));
  if (dragRef.value) {
    if (newX >= innerWidth - (dragRefStyle.value.maxWidth || dragRef.value.offsetWidth) || newY >= innerHeight - (dragRefStyle.value.maxHeight || dragRef.value.offsetHeight)) {
      if (!isMinWind.value) {
        dragRefStyle.value.maxWidth = Math.max(dragRef.value.offsetWidth, dragRefStyle.value.maxWidth);
        dragRefStyle.value.maxHeight = Math.max(dragRef.value.offsetHeight, dragRefStyle.value.maxHeight);
        isMinWind.value = true;
      }
    }
    position.x = newX;
    position.y = newY;
  }
}
const { x, y, style } = useDraggable(dragRef, {
  disabled: disableDrag,
  stopPropagation: true,
  onMove: onMoveDb,
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
      if (setting.isMobileSize) {
        isMinWind.value = true;
      }
      else {
        const isCloseToEdge = newX <= 50 || newY <= 50;
        const isCloseToMaxEdge = newX >= innerWidth - maxWidth || newY >= innerHeight - maxHeight;
        const isCloseToMinEdge = newX >= innerWidth - dragRefWidth - 50 || newY >= innerHeight - dragRefHeight - 50;
        if (isCloseToEdge) {
          isMinWind.value = true;
          position.x = newX <= 50 ? 0 : newX;
          position.y = newY <= 50 ? 0 : newY;
        }
        else if (isCloseToMaxEdge) {
          position.x = newX + dragRefWidth + 60 >= innerWidth ? (innerWidth - dragRefWidth) : newX;
          position.y = newY + dragRefHeight + 60 >= innerHeight ? (innerHeight - dragRefHeight) : newY;
        }
        else if (isCloseToMinEdge) {
          isMinWind.value = true;
        }
        else {
          isMinWind.value = false;
        }
      }
    }
  },
});
watch(() => setting.isMobileSize, (val) => {
  if (val) {
    y.value = 0;
    x.value = 0;
  }
});

// 格式化通话时长
const formattedDuration = computed(() => {
  if (!callDuration.value) {
    return "连接中...";
  }
  const minutes = Math.floor(callDuration.value / 60);
  const seconds = callDuration.value % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
});
const rtcCallTextMap = {
  undefined: "",
  [CallStatusEnum.CALLING]: "正在呼叫...",
  [CallStatusEnum.ACCEPT]: "通话中",
  [CallStatusEnum.END]: "通话结束",

  [CallStatusEnum.REJECT]: "对方拒绝了呼叫",
  [CallStatusEnum.CANCEL]: "对方取消了呼叫",
  [CallStatusEnum.BUSY]: "对方无应答",
  [CallStatusEnum.ERROR]: "通话错误中断",
};
const rtcDescText = computed(() => {
  if (isConnected.value) {
    return `通话时长 ${formattedDuration.value}`;
  }
  else if (isRtcConnecting.value) {
    return "正在连接中...";
  }
  else if (connectionStatus.value === CallStatusEnum.CALLING) {
    return isSender ? "正在呼叫..." : "待接听...";
  }
  else {
    return rtcCallTextMap[connectionStatus.value || "undefined"];
  }
});

// 显示状态
const show = computed({
  get() {
    return modelValue;
  },
  set(val) {
    emit("update:modelValue", val);
  },
});
watch(() => modelValue, (val) => {
  if (val) {
    nextTick(() => {
      if (dragRef.value) {
        const { innerWidth, innerHeight } = window;
        const { offsetWidth, offsetHeight } = dragRef.value;
        const newX = (innerWidth - offsetWidth) / 2;
        const newY = (innerHeight - offsetHeight) / 2;
        x.value = newX;
        y.value = newY;
      }
    });
  }
}, { immediate: true });

function clearAll() {
  show.value = false;
  isSelfMinView.value = false;
  isMaxWind.value = false;
  isMinWind.value = false;
}

watch(isConnectClose, (val) => {
  if (val) {
    setTimeout(() => {
      clearAll();
    }, 400);
  }
});
// 结束通话
function hanUpCall() {
  endCall(connectionStatus.value === CallStatusEnum.CALLING ? CallStatusEnum.CANCEL : CallStatusEnum.END);
  show.value = false;
}

// 关闭拦截
function closeDialog() {
  ElMessageBox.confirm("是否关闭当前通话？", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
    center: true,
  }).then((action) => {
    action === "confirm" && hanUpCall();
  }).catch(() => {
  });
}

// 双击屏幕
function onDblClickWindow() {
  if (setting.isMobileSize) {
    x.value = 0;
    y.value = 0;
    isMinWind.value = false;
  }
}
// 右键菜单
function onMaxWindContextmenu(e: MouseEvent) {
  e.stopPropagation();
  e.preventDefault();
  if (!setting.isMobileSize) {
    return;
  }
  if (callType !== CallTypeEnum.VIDEO) {
    return;
  }
  const opt = {
    x: e.x,
    zIndex: 2000,
    y: e.y,
    theme: setting.contextMenuTheme,
    items: [
      {
        customClass: "group",
        icon: " group-btn-warning i-tabler:arrows-maximize",
        label: "全屏视频",
        onClick: () => {
          // 视频最大化
          openMaxVideo();
        },
      },
    ] as any,
  };
  ContextMenu.showContextMenu(opt);
}

// 全屏监听
const {
  isFullscreen,
} = useFullscreenListener(mainVideoRef);
async function openMaxVideo() {
  isFullscreen.value = !isFullscreen.value;
}

defineExpose({
  connectionStatus,
  localStream,
  remoteStream,
  hanUpCall,
});
</script>

<template>
  <div
    v-if="show"
    ref="dragRef"
    style="touch-action: none;--el-dialog-padding-info: 0;"
    class="group rtc-dialog rounded-dialog fixed z-1099 h-fit w-fit select-none border-(1px #2d2d2d solid) bg-dark text-white sm:(h-600px max-h-full w-340px)"
    :style="style" :class="{
      'is-mini active:cursor-move': isMinWind && !isMaxWind,
      'is-mobile-mini  cursor-pointer hover:shadow-lg': setting.isMobileSize && isMinWind && !isMaxWind,
      'is-max': isMaxWind,
    }"
  >
    <!-- 主内容 -->
    <div
      class="rounded-dialog relative z-2 h-full flex flex-col items-center gap-4 text-light shadow-lg"
      :class="{ 'bg-dark-6 bg-op-60 backdrop-blur': callType === CallTypeEnum.AUDIO || !isConnected }"
      @contextmenu="onMaxWindContextmenu"
      @dblclick.stop="onDblClickWindow"
    >
      <!-- 头部 -->
      <h4
        class="menu w-full flex items-center rounded-t-2 p-4"
        :class="{ 'bg-linear': callType === CallTypeEnum.VIDEO && isConnected }"
      >
        <div v-if="!isConnected" relative w-full flex-row-bt-c>
          <span />
          {{ callType === CallTypeEnum.AUDIO ? '语音通话' : '视频通话' }}
          <i i-carbon:close btn-danger p-3 title="关闭" @click.capture="closeDialog" />
        </div>
        <template v-else>
          <!-- 视频比例控制 -->
          <el-dropdown v-if="callType === CallTypeEnum.VIDEO && maxWindStream?.getVideoTracks()?.[0]?.enabled" trigger="hover">
            <i
              :class="isMaxVideoClass === MaxVideoObjEnum.COVER ? 'i-solar:scale-bold' : 'i-solar:scale-outline'"
              :title="isMaxVideoClass ? '视频还原' : '视频最大化'" class="btn-info bg-white p-2.6 text-white"
              @click.capture="isMaxVideoClass = isMaxVideoClass === MaxVideoObjEnum.CONTAIN ? MaxVideoObjEnum.COVER : MaxVideoObjEnum.CONTAIN"
            />
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="option in maxVideoCoverList" :key="option.detailText"
                  @click.capture="isMaxVideoClass = option.className"
                >
                  <i v-if="isMaxVideoClass === option.className" class="i-solar:check-circle-bold mr-2" />
                  {{ option.detailText }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <!-- 共享屏幕切换按钮 -->
          <el-tooltip
            v-if="callType === CallTypeEnum.VIDEO && isConnected && isSupportScreenSharing"
            :content="isScreenSharing ? '停止共享屏幕' : '共享屏幕'"
            placement="bottom"
          >
            <i
              :class="isScreenSharing ? 'i-solar:screencast-bold-duotone text-color-info' : 'i-solar:screencast-outline'"
              class="ml-4 btn-info p-2.8 sm:ml-3"
              @click="isScreenSharing ? stopScreenShare() : startScreenShare()"
            />
          </el-tooltip>
          <div v-if="isMaxWind" class="absolute-center-x h-12 w-3/4 flex-1" :data-tauri-drag-region="setting.isDesktop" />
          <span absolute-center-x max-w-full truncate>
            {{ rtcDescText }}
          </span>
          <!-- 操作按钮 -->
          <i
            title="缩小" class="i-carbon:subtract ml-a btn-info p-3" @click.capture="() => {
              isMaxWind = false;
              isMinWind = true;
            }"
          />
          <i
            :title="isMaxWind ? '最小化' : '全屏'"
            :class="isMaxWind ? 'text-color-info i-tabler:minimize' : 'i-tabler:maximize'"
            ml-4 hidden btn-info p-2.6 sm:ml-3 sm:block
            @click.capture="() => {
              isMinWind = false;
              isMaxWind = !isMaxWind;
            }"
          />
          <i i-carbon:close ml-4 btn-danger p-3 sm:ml-3 title="关闭" @click.capture="closeDialog" />
        </template>
      </h4>
      <div
        class="menu-mini hidden w-full rounded-t-2 p-2 text-center text-sm"
        :class="{ 'bg-linear': callType === CallTypeEnum.VIDEO && isConnected }"
      >
        {{ rtcDescText }}
      </div>
      <!-- 中间 头像和状态区域 -->
      <div
        class="avatar-box flex-row-c-c flex-1 flex-col truncate transition-all"
      >
        <!-- 远程视频/头像显示 -->
        <div v-if="callType === CallTypeEnum.AUDIO || !maxWindStream?.getVideoTracks()?.[0]?.enabled" class="relative flex-row-c-c flex-col">
          <CardElImage
            :draggable="false"
            :src="BaseUrlImg + theContact.avatar"
            class="avatar mx-a h-20 w-20 select-none border-default-hover rounded-full shadow-lg"
          />
          <div class="username mt-4 text-center text-lg font-medium">
            {{ theContact.name }}
          </div>
        </div>
      </div>
      <!-- 控制按钮区域 -->
      <div
        v-if="connectionStatus !== undefined"
        class="btns max-w-22em w-full flex flex-wrap items-center justify-center gap-col-8 gap-row-6 px-12 py-6 sm:(gap-col-6 gap-row-6)"
      >
        <!-- 接听者的接听/拒绝按钮 -->
        <template v-if="!isSender && !isConnected && !isRtcConnecting">
          <!-- 接听按钮 -->
          <el-button
            style="width: var(--mini-btn-size, 3.2rem);height: var(--mini-btn-size, 3.2rem);margin: 0;" type="success" circle size="large"
            @click.capture="chat.confirmRtcFn.confirmCall()"
          >
            <i class="i-solar:phone-calling-bold mt-1 p-[var(--mini-btn-icon-size,_0.875rem)]" />
          </el-button>
          <!-- 拒绝按钮 -->
          <el-button
            style="width: var(--mini-btn-size, 3.2rem);height: var(--mini-btn-size, 3.2rem);margin: 0;" type="danger" circle size="large" title="挂断"
            @click.capture="chat.confirmRtcFn.rejectCall()"
          >
            <i class="i-solar:end-call-bold mt-1 rotate-4 transform p-[var(--mini-btn-icon-size,_0.875rem)]" />
          </el-button>
        </template>
        <!-- 控制按钮 -->
        <template v-else-if="isSender || isConnected || isRtcConnecting">
          <!-- 麦克风控制 -->
          <el-dropdown trigger="hover" class="mini-hidden">
            <button
              type="button"
              style="width: var(--mini-btn-size, 3.2rem);height: var(--mini-btn-size, 3.2rem);margin: 0;"
              class="cursor-pointer rounded-full border-none shadow-sm hover:op-80"
              :class="localStream?.getAudioTracks()[0]?.enabled ? '!bg-light !text-dark' : '!text-light !bg-[#222d2b60] '"
              :plain="localStream?.getAudioTracks()[0]?.enabled ? false : true" size="large" @click.capture="toggleMute"
            >
              <i class="i-solar:microphone-3-bold p-[var(--mini-btn-icon-size,_0.875rem)]" />
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="device in audioDevices.filter(d => d.kind === 'audioinput') || []"
                  :key="device.deviceId" @click.capture="switchAudioDevice(device.deviceId)"
                >
                  <i v-if="device.deviceId === selectedAudioDevice" class="i-solar:check-circle-bold mr-2" />
                  {{ device.label }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <!-- 结束通话 -->
          <el-button
            style="width: var(--mini-btn-size, 3.2rem);height: var(--mini-btn-size, 3.2rem);margin: 0;" type="danger"
            :style="{ order: callType === CallTypeEnum.VIDEO ? 4 : 1 }" circle size="large" title="挂断"
            @click.capture="hanUpCall"
          >
            <i class="i-solar:end-call-broken p-[var(--mini-btn-icon-size,_0.875rem)]" />
          </el-button>
          <!-- 扬声器控制 -->
          <el-dropdown trigger="hover" style="order: 2" class="mini-hidden">
            <el-button
              style="order: 2; width: var(--mini-btn-size, 3.2rem);height: var(--mini-btn-size, 3.2rem);margin: 0;" type="info" circle size="large"
              title="点击快速切换音量" :plain="audioVolume < 0.5" @click="audioVolume = audioVolume === 0 ? 1 : 0"
            >
              <i
                class="p-[var(--mini-btn-icon-size,_0.875rem)]"
                :class="audioVolume === 0 ? 'i-solar:volume-cross-bold-duotone' : audioVolume < 0.5 ? 'i-solar:volume-loud-bold-duotone' : 'i-solar:volume-loud-bold '"
              />
            </el-button>
            <template #dropdown>
              <div class="w-fit flex-row-c-c py-1 pl-3 pr-6">
                音量：
                <el-slider
                  v-model.lazy="audioVolume" style="width: 12em;" :min="0" :max="1" :step="0.1"
                  :format-tooltip="(val) => `${val * 100}%`"
                />
              </div>
            </template>
          </el-dropdown>
          <!-- 视频控制 -->
          <el-dropdown v-if="callType === CallTypeEnum.VIDEO" trigger="hover" style="order: 3" class="mini-hidden">
            <button
              type="button" circle style="width: var(--mini-btn-size, 3.2rem);height: var(--mini-btn-size, 3.2rem);margin: 0;transition: none;"
              class="cursor-pointer rounded-full border-none shadow-sm hover:op-80"
              :class="localStream?.getVideoTracks()[0]?.enabled ? 'bg-light text-dark' : 'text-light bg-[#222d2b60] '"
              :plain="localStream?.getVideoTracks()[0]?.enabled ? false : true" size="large" @click="toggleVideo"
            >
              <i class="i-solar:camera-bold p-[var(--mini-btn-icon-size,_0.875rem)]" />
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="device in videoDevices" :key="device.deviceId"
                  @click="switchVideoDevice(device.deviceId, isScreenSharing)"
                >
                  <i v-if="device.deviceId === selectedVideoDevice" class="i-solar:check-circle-bold mr-2" />
                  {{ device.label }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
      </div>
      <!-- 本地视频小窗口 -->
      <div v-if="callType === CallTypeEnum.VIDEO" class="min-wind-stream absolute right-4 top-14">
        <video
          v-show="minWindStream?.getVideoTracks()[0]?.enabled" :srcObject="minWindStream" autoplay
          :controls="false" title="点击切换" v-bind="minWindStreamProps"
          class="h-24 w-16 cursor-pointer border-default-hover card-default-br object-cover md:(h-30 w-20)"
          @click="isSelfMinView = !isSelfMinView"
        />
        <CardElImage
          v-show="!minWindStream?.getVideoTracks()[0]?.enabled" title="点击切换"
          :src="isSelfMinView ? BaseUrlImg + user.userInfo.avatar : BaseUrlImg + theContact.avatar"
          class="h-24 w-16 cursor-pointer select-none border-default card-default-br object-cover md:(h-30 w-20)"
          @click="isSelfMinView = !isSelfMinView"
        />
      </div>
    </div>
    <!-- 视频区域和背景区域 -->
    <div class="rounded-dialog bg absolute left-0 top-0 z-0 h-full w-full overflow-hidden truncate">
      <video
        v-show="callType === CallTypeEnum.VIDEO && maxWindStream?.getVideoTracks()[0]?.enabled"
        ref="mainVideoRef"
        :srcObject="maxWindStream"
        autoplay
        :class="isMaxVideoClass"
        :controls="false"
        disablepictureinpicture
        v-bind="maxWindStreamProps" class="absolute left-0 top-0 mx-a h-full w-full"
      />
      <CardElImage
        v-show="!maxWindStream?.getVideoTracks()[0]?.enabled"
        :src="!isSelfMinView ? BaseUrlImg + user.userInfo.avatar : BaseUrlImg + theContact.avatar"
        class="absolute left-0 top-0 mx-a h-full w-full select-none filter-blur"
      />
    </div>
    <!-- 视频最大化 -->
    <div
      v-if="callType === CallTypeEnum.VIDEO && isSupportFullscreen && maxWindStream?.getVideoTracks()[0]?.enabled "
      class="video-max absolute bottom-0 right-0 z-100 h-10 w-10 flex-row-c-c btn-info rounded-[1rem_0_0_0] bg-dark-1 bg-op-50 pl-1 pt-1 op-100 backdrop-blur-12px backdrop-saturate-180 transition-opacity sm:(op-0 group-hover:op-100)"
      @click="openMaxVideo"
    >
      <i
        title="视频全屏"
        i-tabler:maximize p-2.6
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
// 放大缩小transition
$call-wind-transition: width 0.2s ease, height 0.2s ease, top 0.2s ease, left 0.2s ease;

.bg-linear {
  background: linear-gradient(to bottom, rgba(20, 20, 20, 1), rgba(20, 20, 20, 0.7), rgba(20, 20, 20, 0));
}

.rounded-dialog {
  border-radius: 0.5rem;
}

.rtc-dialog {
  transition: var(--call-wind-transition, width 0.2s, height 0.2s ease);
  width: 340px;
  height: 450px;
  &.is-mini {
    width: 10rem;
    height: 14rem;

    .video-max,
    .menu,
    .min-wind-stream,
    .rtc-desc {
      display: none;
    }
    .avatar {
      width: 4rem;
      height: 4rem;
    }

    .username {
      font-size: 0.9rem;
      margin-top: 0.5rem;
    }

    .menu-mini {
      display: block !important;
    }


    .btns {
      opacity: 0.5;
      transition: opacity 0.2s;
    }
    &:hover {
      .btns {
        opacity: 1;
      }
    }
    .btns {
      --mini-btn-size: 2.4rem;
      --mini-btn-icon-size: .5rem;
      gap: .5rem;
      grid-gap: .5rem;
      width: 100%;
      padding: 0 0.875rem 0.875rem 0.875rem ;
      .mini-hidden {
        display: none;
      }
    }
  }
  &.is-max {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    transition: $call-wind-transition;
  }
}

@media screen and (max-width: 768px) {
  .rtc-dialog {
    position: fixed !important;
    top: 0;
    left: 0;
    transition: $call-wind-transition;
    width: 100%;
    height: 100%;

    &.rounded-dialog {
      --at-apply: "rounded-0 border-none";
    }
  }
  .rtc-dialog.is-mobile-mini {
    width: 10rem;
    height: 14rem;
    transition: width 0.2s, height 0.2s ease;
    .menu,
    .min-wind-stream,
    .rtc-desc {
      display: none;
    }
    &.rounded-dialog {
      border-radius: 0.5rem !important;
      border: 1px solid #2d2d2d;
    }
    .avatar {
      width: 4rem;
      height: 4rem;
    }

    .username {
      font-size: 0.9rem;
    }

    .menu-mini {
      display: block !important;
    }

    .btns {
      opacity: 1;
    }
  }
}
</style>
