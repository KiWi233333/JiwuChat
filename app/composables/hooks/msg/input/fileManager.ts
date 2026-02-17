import { h, render } from "vue";
import FilePreviewCard from "~/components/chat/Preview/File.vue";
import { MSG_CTX_NAMES } from "~/constants/msgContext";
import { BaseMediaManager } from "./BaseMediaManager";

export class FileManager extends BaseMediaManager {
  protected containerClass = "file-container";
  protected aiRoomMessage = "AI对话不支持文件";

  insert(file: File | string, fileName = ""): Promise<void> {
    return this.focusAndInsert(range => this.insertAtRange(file, fileName, range));
  }

  private insertAtRange(file: File | string, fileName: string, range: Range): Promise<void> {
    return new Promise((resolve) => {
      const container = document.createElement("span");
      container.className = this.containerClass;
      container.setAttribute("data-type", "file");
      container.setAttribute("contenteditable", "false");
      container.setAttribute("tabindex", "0");
      container.setAttribute("draggable", "false");

      let displayName = fileName;
      let size = 0;
      let mimeType = "";
      if (typeof file === "string") {
        displayName = fileName || file.split("/").pop() || "文件";
        container.setAttribute("data-url", file);
      }
      else {
        displayName = fileName || file.name || "文件";
        size = file.size;
        mimeType = file.type;
        (container as any).__ossFile = {
          file,
          status: "",
          percent: 0,
          subscribe: undefined,
          children: [],
        };
      }

      // 渲染 FilePreviewCard 组件
      const vnode = h(FilePreviewCard, {
        fileName: displayName,
        size,
        mimeType,
        ctxName: MSG_CTX_NAMES.FILE,
        onDelete() {
          container.remove();
        },
      });
      render(vnode, container);

      this.insertContainerAtRange(container, range);
      resolve();
    });
  }
}

export default FileManager;
