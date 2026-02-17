import type { ShallowReactive } from "vue";
import type { SelectionManager } from "./inputDomUtils";

/**
 * 媒体管理器基类，提供图片/文件/视频管理器共享的插入、查询、清理逻辑
 */
export abstract class BaseMediaManager {
  protected maxCount = 9;

  constructor(
    protected inputRef: Ref<HTMLElement | null>,
    protected selectionManager: SelectionManager,
    protected isAIRoom: ComputedRef<boolean>,
  ) {}

  /** 子类对应的 DOM 容器 class 名，如 "image-container" */
  protected abstract containerClass: string;

  /** AI 房间拒绝提示 */
  protected abstract aiRoomMessage: string;

  /**
   * 通用插入前守卫检查：inputRef 存在、非 AI 房间、未超限
   * 返回 null 表示通过，否则返回 reject 用的 Error
   */
  protected guardInsert(): Error | null {
    if (!this.inputRef.value) {
      return new Error("msgInputRef 不存在");
    }
    if (this.isAIRoom.value) {
      return new Error(this.aiRoomMessage);
    }
    if (this.getCount() >= this.maxCount) {
      return new Error(`最多只能添加 ${this.maxCount} 个！`);
    }
    return null;
  }

  /**
   * 聚焦并在 nextTick 后获取 range，然后调用 callback
   */
  protected focusAndInsert<T>(callback: (range: Range) => Promise<T>): Promise<T> {
    const guardError = this.guardInsert();
    if (guardError) {
      return Promise.reject(guardError);
    }

    return new Promise((resolve, reject) => {
      this.inputRef.value!.focus();
      nextTick(() => {
        try {
          const range = this.selectionManager.getRange() || this.selectionManager.createRangeAtEnd();
          callback(range).then(resolve).catch(reject);
        }
        catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * 在 range 处插入容器节点，并在尾部追加空格、恢复选区
   */
  protected insertContainerAtRange(container: HTMLElement, range: Range): void {
    requestAnimationFrame(() => {
      range.deleteContents();
      range.insertNode(container);

      // 尾部插入空格
      const spaceNode = document.createTextNode(" ");
      range.setStartAfter(container);
      range.insertNode(spaceNode);
      range.setStartAfter(spaceNode);
      range.collapse(true);

      const selection = this.selectionManager.getCurrent();
      selection?.removeAllRanges();
      selection?.addRange(range);

      this.inputRef.value?.focus();
    });
  }

  getCount(): number {
    return this.inputRef.value?.querySelectorAll(`.${this.containerClass}`).length || 0;
  }

  getFiles(): ShallowReactive<OssFile>[] {
    if (!this.inputRef.value)
      return [];

    const containers = this.inputRef.value.querySelectorAll(`.${this.containerClass}`);
    return Array.from(containers)
      .map(container => (container as any).__ossFile)
      .filter(Boolean) as ShallowReactive<OssFile>[];
  }

  clear() {
    if (!this.inputRef.value)
      return;

    const containers = this.inputRef.value.querySelectorAll(`.${this.containerClass}`);
    containers.forEach((container) => {
      const objectUrl = (container as any).__objectUrl;
      if (objectUrl)
        URL.revokeObjectURL(objectUrl);
      container.remove();
    });
  }
}
