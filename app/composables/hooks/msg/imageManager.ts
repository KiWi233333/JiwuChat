import type { ShallowReactive } from "vue";
import type { SelectionManager } from "./useMsgInputForm";

// 图片管理器
export class ImageManager {
  private maxCount = 9;

  constructor(
    private inputRef: Ref<HTMLElement | null>,
    private selectionManager: SelectionManager,
    private isAIRoom: ComputedRef<boolean>,
  ) {}

  insert(file: File, alt = ""): Promise<void> {
    if (!this.inputRef.value) {
      return Promise.reject(new Error("msgInputRef 不存在"));
    }

    if (this.isAIRoom.value) {
      ElMessage.error("AI对话暂不支持图片输入！");
      return Promise.reject(new Error("AI对话不支持图片"));
    }

    if (this.getCount() >= this.maxCount) {
      ElMessage.error(`最多只能添加 ${this.maxCount} 张图片！`);
      return Promise.reject(new Error("图片数量超限"));
    }

    return new Promise((resolve, reject) => {
      this.inputRef.value!.focus();

      nextTick(() => {
        try {
          const range = this.selectionManager.getRange() || this.selectionManager.createRangeAtEnd();
          this.insertAtRange(file, alt, range).then(resolve).catch(reject);
        }
        catch (error) {
          reject(error);
        }
      });
    });
  }

  private insertAtRange(file: File, alt: string, range: Range): Promise<void> {
    return new Promise((resolve, reject) => {
      const container = SecurityUtils.createSafeElement("span", "image-container", {
        "data-type": "image",
        "contenteditable": "false",
        "role": "img",
        "tabindex": "0",
        "draggable": "false",
      }) as any;

      const img = document.createElement("img");
      img.className = "inserted-image";
      img.style.cssText = "max-width: 12rem; max-height: 9rem; border-radius: 0.3rem; cursor: pointer;";

      let objectUrl: string | null = null;

      img.onerror = () => {
        if (objectUrl)
          URL.revokeObjectURL(objectUrl);
        reject(new Error("图片加载失败"));
      };

      objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
      img.alt = alt || file.name || "图片";
      container.__objectUrl = objectUrl;

      img.onload = () => {
        container.__ossFile = shallowReactive<OssFile>({
          file,
          id: objectUrl,
          status: "",
          percent: 0,
          subscribe: undefined,
          children: [],
          width: img.naturalWidth || 0,
          height: img.naturalHeight || 0,
        });
        resolve();
      };

      const deleteBtn = SecurityUtils.createSafeElement("span", "image-delete-btn", {
        title: "删除图片",
        role: "button",
        tabindex: "0",
      });

      container.addEventListener("click", (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        const target = e.target as HTMLElement;

        if (target.classList.contains("image-delete-btn")) {
          if (container.__objectUrl) {
            URL.revokeObjectURL(container.__objectUrl);
          }
          container.remove();
        }
        else if (target.tagName === "IMG") {
          // 创建图片查看器
          const url = URL.createObjectURL(container.__ossFile?.file || file);
          useImageViewer.open({
            urlList: [url],
            initialIndex: 0,
            closeCallback() {
              URL.revokeObjectURL(url);
            },
          });
        }
      });

      container.appendChild(img);
      container.appendChild(deleteBtn);

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
    });
  }

  getCount(): number {
    return this.inputRef.value?.querySelectorAll(".image-container").length || 0;
  }

  getFiles(): OssFile[] {
    if (!this.inputRef.value)
      return [];

    const containers = this.inputRef.value.querySelectorAll(".image-container");
    return Array.from(containers)
      .map(container => (container as any).__ossFile)
      .filter(Boolean) as ShallowReactive<OssFile>[];
  }

  clear() {
    if (!this.inputRef.value)
      return;

    const containers = this.inputRef.value.querySelectorAll(".image-container");
    containers.forEach((container) => {
      const objectUrl = (container as any).__objectUrl;
      if (objectUrl)
        URL.revokeObjectURL(objectUrl);
      container.remove();
    });
  }
}
