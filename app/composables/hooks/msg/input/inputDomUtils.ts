// @unocss-include
export const MAX_UPLOAD_IMAGE_COUNT = 9;
export const AT_USER_TAG_CLASSNAME = "at-user-tag";

// 安全工具类
export class SecurityUtils {
  static sanitizeInput(input: string): string {
    if (typeof input !== "string")
      return "";
    return input.replace(/[<>'"&]/g, "");
  }

  static createSafeElement(tagName: string, className: string, attributes: Record<string, string> = {}): HTMLElement {
    const element = document.createElement(tagName);
    element.className = className;
    element.contentEditable = "false";

    Object.entries(attributes).forEach(([key, value]) => {
      if (typeof value === "string" && value.length < 100) {
        element.setAttribute(key, SecurityUtils.sanitizeInput(value));
      }
    });

    return element;
  }
}

// DOM缓存管理器
export class DomCacheManager {
  private cache = new Map<string, Element[]>();
  private cacheTimeout = 5000;
  private cacheClearTimer: NodeJS.Timeout | null = null;

  get(key: string, selector: string, parent: HTMLElement | null): Element[] {
    if (!parent)
      return [];

    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const elements = Array.from(parent.querySelectorAll(selector));
    this.cache.set(key, elements);
    this.scheduleClear();
    return elements;
  }

  clear() {
    this.cache.clear();
    if (this.cacheClearTimer) {
      clearTimeout(this.cacheClearTimer);
      this.cacheClearTimer = null;
    }
  }

  private scheduleClear() {
    if (this.cacheClearTimer)
      clearTimeout(this.cacheClearTimer);
    this.cacheClearTimer = setTimeout(() => this.clear(), this.cacheTimeout);
  }
}

// 选区管理器
export class SelectionManager {
  constructor(private inputRef: Ref<HTMLElement | null>) {}

  getCurrent(): Selection | null {
    return window.getSelection();
  }

  getRange(): Range | null {
    const selection = this.getCurrent();
    return selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  }

  isInInputBox(range: Range): boolean {
    return this.inputRef.value?.contains(range.commonAncestorContainer)
      || this.inputRef.value === range.commonAncestorContainer;
  }

  updateRange(): Range | null {
    try {
      const selection = this.getCurrent();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (this.isInInputBox(range)) {
          return range.cloneRange();
        }
      }
    }
    catch (error) {
      console.warn("Failed to update selection range:", error);
    }
    return null;
  }

  focusAtEnd() {
    if (!this.inputRef.value)
      return;

    this.inputRef.value.focus();
    const selection = this.getCurrent();
    const range = document.createRange();

    range.selectNodeContents(this.inputRef.value);
    range.collapse(false);

    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  createRangeAtEnd(): Range {
    const range = document.createRange();
    range.selectNodeContents(this.inputRef.value!);
    range.collapse(false);

    const selection = this.getCurrent();
    selection?.removeAllRanges();
    selection?.addRange(range);

    return range;
  }
}

// 标签管理器
export class TagManager {
  constructor(
    private inputRef: Ref<HTMLElement | null>,
    private domCache: DomCacheManager,
    private selectionManager: SelectionManager,
  ) {}

  parseFromDom<T>(selector: string, parseFunc: (tag: Element) => T | null): T[] {
    if (!this.inputRef.value)
      return [];

    try {
      // 使用 selector 作为缓存 key（而非 Date.now()），确保缓存可命中
      const tags = this.domCache.get(selector, selector, this.inputRef.value);
      return tags.map(parseFunc).filter(Boolean) as T[];
    }
    catch (error) {
      console.warn("Parse tags error:", error);
      return [];
    }
  }

  insert(
    element: HTMLElement,
    tagData: { type: string; uid: string; nickName: string; text: string },
    matchRegex: RegExp,
    addSpace = false,
  ): boolean {
    if (!this.inputRef.value || !element || !tagData.uid) {
      console.warn("插入标签失败：缺少必要参数");
      return false;
    }

    try {
      // 检查重复标签
      const existingTags = this.domCache.get(`${tagData.type}-tags`, `[data-uid="${tagData.uid}"]`, this.inputRef.value);
      if (existingTags.length > 0)
        return false;

      const range = this.selectionManager.getRange();
      if (!range) {
        this.selectionManager.focusAtEnd();
        const newRange = this.selectionManager.getRange();
        if (!newRange)
          return false;
        return this.insertAtRange(element, newRange, matchRegex, addSpace);
      }

      return this.insertAtRange(element, range, matchRegex, addSpace);
    }
    catch (error) {
      console.error("插入标签失败:", error);
      return false;
    }
  }

  private insertAtRange(element: HTMLElement, range: Range, matchRegex: RegExp, addSpace: boolean): boolean {
    const { startContainer, startOffset } = range;

    // 删除匹配文本
    if (startContainer.nodeType === Node.TEXT_NODE) {
      const textNode = startContainer as Text;
      const beforeText = textNode.textContent?.substring(0, startOffset) || "";
      const match = beforeText.match(matchRegex);

      if (match && match[0].length > 0 && match[0].length <= 50) {
        const deleteStart = Math.max(0, startOffset - match[0].length);
        textNode.deleteData(deleteStart, match[0].length);
        range.setStart(textNode, deleteStart);
        range.setEnd(textNode, deleteStart);
      }
    }

    // 插入元素
    range.deleteContents();
    range.insertNode(element);

    if (addSpace) {
      const spaceNode = document.createTextNode(" ");
      range.setStartAfter(element);
      range.insertNode(spaceNode);
      range.setStartAfter(spaceNode);
    }
    else {
      range.setStartAfter(element);
    }

    range.collapse(true);
    const selection = this.selectionManager.getCurrent();
    selection?.removeAllRanges();
    selection?.addRange(range);

    this.domCache.clear();
    return true;
  }
}


// 输入检测器
export class InputDetector {
  private static AT_PATTERN = /@([\w\u4E00-\u9FA5]{0,20})$/;
  private static AI_PATTERN = /\/([\w\u4E00-\u9FA5]{0,20})$/;

  static getBeforeText(range: Range, inputRef: HTMLElement): string {
    try {
      const container = range.startContainer;
      const offset = range.startOffset;

      if (container.nodeType === Node.TEXT_NODE) {
        const textNode = container as Text;
        let beforeText = textNode.textContent?.substring(0, offset) || "";

        if (textNode.parentNode !== inputRef) {
          const walker = document.createTreeWalker(
            inputRef,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode: node =>
                inputRef.contains(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
            },
          );

          let currentNode = walker.nextNode();
          let allText = "";
          while (currentNode) {
            if (currentNode === textNode) {
              allText += textNode.textContent?.substring(0, offset) || "";
              break;
            }
            else {
              allText += currentNode.textContent || "";
            }
            currentNode = walker.nextNode();
          }
          beforeText = allText;
        }
        return SecurityUtils.sanitizeInput(beforeText);
      }
      return container === inputRef ? SecurityUtils.sanitizeInput(inputRef.textContent || "") : "";
    }
    catch (error) {
      console.warn("Failed to get before text:", error);
      return "";
    }
  }

  static detectType(beforeText: string): { type: "at" | "ai" | null; keyword: string } {
    if (!beforeText || typeof beforeText !== "string") {
      return { type: null, keyword: "" };
    }

    const atMatch = beforeText.match(this.AT_PATTERN);
    if (atMatch) {
      return { type: "at", keyword: SecurityUtils.sanitizeInput(atMatch[1] || "") };
    }

    const aiMatch = beforeText.match(this.AI_PATTERN);
    if (aiMatch) {
      return { type: "ai", keyword: SecurityUtils.sanitizeInput(aiMatch[1] || "") };
    }

    return { type: null, keyword: "" };
  }
}
