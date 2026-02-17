// @unocss-include
import { h, render } from "vue";
import VideoPreviewCard from "~/components/chat/Preview/Video.vue";
import { BaseMediaManager } from "./BaseMediaManager";

export class VideoManager extends BaseMediaManager {
  protected containerClass = "video-container";
  protected aiRoomMessage = "AI对话不支持视频";

  insert(file: File, fileName = ""): Promise<void> {
    return this.focusAndInsert(range => this.insertAtRange(file, fileName, range));
  }

  private async insertAtRange(file: File, fileName: string, range: Range): Promise<void> {
    const container = document.createElement("span");
    container.className = this.containerClass;
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
      duration: 0,
      thumbSize: 0,
      thumbWidth: 0,
      thumbHeight: 0,
    });
    (container as any).__objectUrl = videoUrl;

    const vnode = h(VideoPreviewCard, {
      fileName: displayName,
      size: file.size || 0,
      ctxName: undefined,
      onClick: (e: MouseEvent) => {
        mitter.emit(MittEventType.VIDEO_READY, {
          type: "play",
          payload: {
            mouseX: e.clientX,
            mouseY: e.clientY,
            url: videoUrl,
            duration: (container as any).__ossFile.duration || 0,
            size: file.size || 0,
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

    this.insertContainerAtRange(container, range);
  }
}

export default VideoManager;
