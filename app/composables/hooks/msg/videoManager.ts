import type { ShallowReactive } from "vue";
// 通用视频管理器 VideoManager
import { h, nextTick, render } from "vue";
import VideoPreviewCard from "~/components/chat/Preview/Video.vue";
// @unocss-include
export class VideoManager {
  private maxCount = 9;

  constructor(
    private inputRef: Ref<HTMLElement | null>,
    private selectionManager: SelectionManager, // SelectionManager 类型
    private isAIRoom: ComputedRef<boolean>,
  ) {}

  insert(file: File, fileName = ""): Promise<void> {
    if (!this.inputRef.value) {
      return Promise.reject(new Error("msgInputRef 不存在"));
    }
    if (this.isAIRoom.value) {
      return Promise.reject(new Error("AI对话不支持视频"));
    }
    if (this.getCount() >= this.maxCount) {
      return Promise.reject(new Error(`最多只能添加 ${this.maxCount} 个视频！`));
    }
    return new Promise((resolve, reject) => {
      this.inputRef.value!.focus();
      nextTick(() => {
        try {
          const range = this.selectionManager.getRange() || this.selectionManager.createRangeAtEnd();
          this.insertAtRange(file, fileName, range).then(resolve).catch(reject);
        }
        catch (error) {
          reject(error);
        }
      });
    });
  }

  private async insertAtRange(file: File, fileName: string, range: Range): Promise<void> {
    // 使用 vue 渲染 VideoPreviewCard 组件
    const container = document.createElement("span");
    container.className = "video-container";
    container.setAttribute("data-type", "video");
    container.setAttribute("contenteditable", "false");
    container.setAttribute("tabindex", "0");
    container.setAttribute("draggable", "false");

    const displayName = fileName || file.name || "视频";
    const videoUrl = URL.createObjectURL(file);
    (container as any).__ossFile = shallowReactive<OssFile>({
      id: videoUrl,
      file,
      status: "",
      percent: 0,
      // 视频
      duration: 0,
      thumbSize: 0,
      thumbWidth: 0,
      thumbHeight: 0,
    });
    (container as any).__objectUrl = videoUrl;
    // 重构参数传递，支持事件
    const vnode = h(VideoPreviewCard, {
      fileName: displayName,
      size: file.size || 0,
      ctxName: undefined, // 可根据需要传递上下文名
      onClick: (e: MouseEvent) => {
        // 预览视频
        mitter.emit(MittEventType.VIDEO_READY, {
          type: "play",
          payload: {
            mouseX: e.clientX,
            mouseY: e.clientY,
            url: videoUrl,
            duration: (container as any).__ossFile.duration || 0,
            size: file.size || 0,
            // thumbUrl: ,
            thumbSize: 0,
            thumbWidth: 0,
            thumbHeight: 0,
          },
        });
      },
      onDelete: () => {
        container.remove();
      },
    });
    render(vnode, container);

    requestAnimationFrame(() => {
      range.deleteContents();
      range.insertNode(container);
      range.setStartAfter(container);
      range.collapse(true);
      const selection = this.selectionManager.getCurrent();
      selection?.removeAllRanges();
      selection?.addRange(range);
      this.inputRef.value?.focus();
    });
    return Promise.resolve();
  }

  getCount(): number {
    return this.inputRef.value?.querySelectorAll(".video-container").length || 0;
  }

  getFiles(): ShallowReactive<OssFile>[] {
    if (!this.inputRef.value)
      return [];
    const containers = this.inputRef.value.querySelectorAll(".video-container");
    return Array.from(containers)
      .map(container => (container as any).__ossFile)
      .filter(Boolean) as ShallowReactive<OssFile>[];
  }

  clear() {
    if (!this.inputRef.value)
      return;
    const containers = this.inputRef.value.querySelectorAll(".video-container");
    containers.forEach((container) => {
      const objectUrl = (container as any).__objectUrl;
      if (objectUrl)
        URL.revokeObjectURL(objectUrl);
      container.remove();
    });
  }
}

export default VideoManager;
