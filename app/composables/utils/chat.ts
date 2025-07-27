// utils/chat.ts

import type { ShallowRef } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";

// @unocss-include
export const contactTypeIconClassMap: Record<RoomType, string> = {
  [RoomType.GROUP]: "i-solar:users-group-rounded-bold-duotone",
  [RoomType.SELFT]: "i-solar:user-bold-duotone",
  [RoomType.AICHAT]: "i-ri:robot-2-line",
};
export const applyUserSearchInputDomId = "user-search-apply-input";

/**
 * 解析消息内容（会话文本）
 * @param msg 消息
 * @returns 消息内容
 */
export function resolveMsgContactText(msg: ChatMessageVO): string {
  if (msg.message.type === MessageType.SOUND) {
    const _msg = msg as ChatMessageVO<SoundBodyMsgVO>;
    return `[语音] ${getSecondsText(_msg?.message?.body?.second || 0)}`;
  }
  else if (msg.message.type === MessageType.IMG) {
    const _msg = msg as ChatMessageVO<ImgBodyMsgVO>;
    return `[图片] ${_msg?.message.content}`;
  }
  else if (msg.message.type === MessageType.FILE) {
    const _msg = msg as ChatMessageVO<FileBodyMsgVO>;
    return `[文件] ${_msg.message.body?.fileName} ${_msg?.message.content}`;
  }
  else if (msg.message.type === MessageType.VIDEO) {
    const _msg = msg as ChatMessageVO<ImgBodyMsgVO>;
    return `[视频] ${_msg?.message.content}`;
  }
  else if (msg.message.type === MessageType.RTC) {
    const _msg = msg as ChatMessageVO<RtcLiteBodyMsgVO>;
    return `[${_msg.message.body?.typeText || "通讯聊天"}] ${_msg?.message.content}`;
  }
  // 其他类型消息
  return msg.message.content || "";
}
/**
 * 解析消息内容（回复文本）
 * @param msg 消息
 * @returns 消息内容
 */
export function resolveMsgReplyText(msg: ChatMessageVO): string | undefined | null {
  if (msg.message.type === MessageType.SOUND) {
    const _msg = msg as ChatMessageVO<SoundBodyMsgVO>;
    return `[语音] ${getSecondsText(_msg?.message?.body?.second || 0)}`;
  }
  else if (msg.message.type === MessageType.IMG) {
    const _msg = msg as ChatMessageVO<ImgBodyMsgVO>;
    return `[图片] ${_msg?.message.content}`;
  }
  else if (msg.message.type === MessageType.FILE) {
    const _msg = msg as ChatMessageVO<FileBodyMsgVO>;
    return `[文件] ${_msg.message.body?.fileName} ${_msg?.message.content}`;
  }
  else if (msg.message.type === MessageType.VIDEO) {
    const _msg = msg as ChatMessageVO<ImgBodyMsgVO>;
    return `[视频] ${_msg?.message.content}`;
  }
  else if (msg.message.type === MessageType.RTC) {
    const _msg = msg as ChatMessageVO<RtcLiteBodyMsgVO>;
    return `[${_msg.message.body?.typeText || "通讯聊天"}] ${_msg?.message.content}`;
  }
  // 其他类型消息
  return msg.message.content;
}

// 计算语音消息文本
function getSecondsText(second?: number) {
  if (!second)
    return "";
  if (second < 60) {
    return `${second}"`;
  }
  else if (second < 3600) {
    const minute = Math.floor(second / 60);
    const second_ = second % 60;
    return `${minute}'${second_}"`;
  }
}


/**
 * 设置视频全屏
 * @param videoDom 视频dom
 * @param isFull 是否全屏
 */
export async function setWebVideoFullScreen(videoDom?: HTMLVideoElement | null, isFull: boolean = false): Promise<boolean> {
  if (!videoDom) {
    return false;
  }
  if (!videoDom.requestFullscreen) {
    ElNotification.warning({
      title: "兼容性",
      message: "当前浏览器不支持全屏",
      duration: 2000,
    });
    return false;
  }
  try {
    isFull ? await videoDom.requestFullscreen() : await document.exitFullscreen();
  }
  catch (error) {
    return false;
  }
  return !isFull;
}

export async function setDesktopVideoFullScreen(isFull: boolean = false): Promise<boolean> {
  // 桌面端
  if (useSettingStore().isDesktop) {
    const appWindow = getCurrentWindow();
    appWindow.setFullscreen(isFull);
    return await appWindow.isFullscreen();
  }
  return false;
}


/**
 * 监听全屏状态变化
 * @param target 监听目标，可以是 id 或者 DOM 元素
 * @returns 全屏状态和更新函数
 */
export function useFullscreenListener(target?: string | HTMLElement | HTMLVideoElement | Ref<HTMLElement | HTMLVideoElement | undefined> | Readonly<ShallowRef<HTMLVideoElement | null>> | null) {
  const _isFullscreen = ref(false);
  const _isDesktopFullScreen = ref(false);

  // 获取目标元素
  const getTargetElement = () => {
    if (typeof target === "string") {
      return document.getElementById(target); // 如果传入的是 id，通过 id 获取元素
    }
    else if (target instanceof HTMLElement) {
      return target; // 如果传入的是 DOM 元素，直接使用
    }
    else if (target && "value" in target && target.value instanceof HTMLElement) {
      return target.value; // 如果传入的是 ref，通过 ref 获取元素
    }
    return null; // 如果传入的既不是 id 也不是 DOM 元素，返回 null
  };

  const isFullscreen = computed({
    get: () => _isFullscreen.value,
    set: (val: boolean) => {
      if (val === _isFullscreen.value) {
        return;
      }
      if (val) {
        const targetElement = getTargetElement();
        if (targetElement) {
          targetElement.requestFullscreen().catch(() => {});
        }
      }
      else {
        document.exitFullscreen().catch(() => {});
      }
      _isFullscreen.value = !!val;
    },
  });
  // 监听全屏状态变化
  async function handleFullscreenChange() {
    const targetElement = getTargetElement();
    isFullscreen.value = !!document.fullscreenElement && document.fullscreenElement === targetElement;
    if (_isDesktopFullScreen.value !== isFullscreen.value) {
      _isDesktopFullScreen.value = await setDesktopVideoFullScreen(isFullscreen.value); // 同步到桌面端
    }
  }

  // 挂载时添加监听
  onMounted(() => {
    document.addEventListener("fullscreenchange", handleFullscreenChange);
  });
  onActivated(() => {
    document.addEventListener("fullscreenchange", handleFullscreenChange);
  });

  // 卸载时移除监听
  onUnmounted(() => {
    document.removeEventListener("fullscreenchange", handleFullscreenChange);
  });
  onDeactivated(() => {
    document.removeEventListener("fullscreenchange", handleFullscreenChange);
  });

  return {
    isFullscreen, // 全屏状态
    handleFullscreenChange, // 可供外部调用的全屏状态更新函数
  };
}
