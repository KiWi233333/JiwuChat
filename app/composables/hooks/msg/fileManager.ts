// 通用文件管理器 FileManager，参考 ImageManager 实现
import type { ComputedRef, Ref, ShallowReactive } from "vue";
import { h, nextTick, render } from "vue";
import FilePreviewCard from "~/components/Chat/FilePreviewCard.vue";

export class FileManager {
  private maxCount = 9;

  constructor(
    private inputRef: Ref<HTMLElement | null>,
    private selectionManager: SelectionManager, // SelectionManager 类型
    private isAIRoom: ComputedRef<boolean>,
  ) {}

  insert(file: File | string, fileName = ""): Promise<void> {
    if (!this.inputRef.value) {
      return Promise.reject(new Error("msgInputRef 不存在"));
    }
    if (this.isAIRoom.value) {
      // 这里可自定义提示
      return Promise.reject(new Error("AI对话不支持文件"));
    }
    if (this.getCount() >= this.maxCount) {
      return Promise.reject(new Error(`最多只能添加 ${this.maxCount} 个文件！`));
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

  private insertAtRange(file: File | string, fileName: string, range: Range): Promise<void> {
    return new Promise((resolve) => {
      // 创建挂载点
      const container = document.createElement("span");
      container.className = "file-container";
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

      // // 删除按钮
      // container.addEventListener("click", (e) => {
      //   const target = e.target as HTMLElement;
      //   console.log(target.className);
      // });

      // 渲染 FilePreviewCard 组件
      const vnode = h(FilePreviewCard, {
        fileName: displayName,
        size,
        mimeType,
        ctxName: "file",
        onDelete() {
          // TODO: 释放资源
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
        resolve();
      });
    });
  }

  getCount(): number {
    return this.inputRef.value?.querySelectorAll(".file-container").length || 0;
  }

  getFiles(): OssFile[] {
    if (!this.inputRef.value)
      return [];
    const containers = this.inputRef.value.querySelectorAll(".file-container");
    return Array.from(containers)
      .map(container => (container as any).__ossFile)
      .filter(Boolean) as ShallowReactive<OssFile>[];
  }

  clear() {
    if (!this.inputRef.value)
      return;
    const containers = this.inputRef.value.querySelectorAll(".file-container");
    containers.forEach((container) => {
      container.remove();
    });
  }
}

export default FileManager;
