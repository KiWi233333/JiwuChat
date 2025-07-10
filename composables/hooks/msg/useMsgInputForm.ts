import ContextMenuGlobal from "@imengyu/vue3-context-menu";

export const MAX_UPLOAD_IMAGE_COUNT = 9;
// @unocss-include
// 安全工具类
class SecurityUtils {
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
class DomCacheManager {
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
class SelectionManager {
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
class TagManager<T> {
  constructor(
    private inputRef: Ref<HTMLElement | null>,
    private domCache: DomCacheManager,
    private selectionManager: SelectionManager,
  ) {}

  parseFromDom<T>(selector: string, parseFunc: (tag: Element) => T | null): T[] {
    if (!this.inputRef.value)
      return [];

    try {
      const cacheKey = `${selector}-${Date.now()}`;
      const tags = this.domCache.get(cacheKey, selector, this.inputRef.value);
      return tags.map(parseFunc).filter(Boolean) as T[];
    }
    catch (error) {
      console.warn("Parse tags error:", error);
      return [];
    }
  }

  insert(
    element: HTMLElement,
    tagData: { type: string; uid: string; username: string; text: string },
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

// 图片管理器
class ImageManager {
  private maxCount = 9;

  constructor(
    private inputRef: Ref<HTMLElement | null>,
    private selectionManager: SelectionManager,
    private isAIRoom: ComputedRef<boolean>,
  ) {}

  insert(file: File | string, alt = ""): Promise<void> {
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

  private insertAtRange(file: File | string, alt: string, range: Range): Promise<void> {
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

      img.onload = () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        }
        resolve();
      };

      if (typeof file === "string") {
        img.src = file;
        img.alt = alt || "图片";
      }
      else {
        objectUrl = URL.createObjectURL(file);
        img.src = objectUrl;
        img.alt = alt || file.name || "图片";
        container.__imageFile = file;
        container.__objectUrl = objectUrl;
      }

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
          const url = URL.createObjectURL(container.__imageFile || file);
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

  getFiles(): File[] {
    if (!this.inputRef.value)
      return [];

    const containers = this.inputRef.value.querySelectorAll(".image-container");
    return Array.from(containers)
      .map(container => (container as any).__imageFile)
      .filter(file => file instanceof File);
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

// 输入检测器
class InputDetector {
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

// 主Hook
export function useMsgInputForm(
  inputRefName = "msgInputRef",
  handleSubmit: () => void,
  scrollbarRefs: {
    atScrollbarRef?: string;
    aiScrollbarRef?: string;
  } = {},
  popoverWidth = 160,
  focusRefName = "",
) {
  // Store
  const setting = useSettingStore();
  const chat = useChatStore();

  const { atScrollbarRef = "atScrollbarRef", aiScrollbarRef = "aiScrollbarRef" } = scrollbarRefs;

  // Refs
  const inputTextContent = ref("");
  const msgInputRef = useTemplateRef<HTMLInputElement | HTMLTextAreaElement>(inputRefName);
  const focusRef = useTemplateRef<HTMLInputElement | HTMLTextAreaElement>(focusRefName);
  const { focused: inputFocus } = useFocus(focusRef, { initialValue: false });
  const selectionRange = ref<Range | null>(null);

  const atScrollbar = useTemplateRef<any>(atScrollbarRef);
  const aiScrollbar = useTemplateRef<any>(aiScrollbarRef);

  // 状态
  const isAtUser = computed(() => chat.atUserList.length > 0);
  const showAtOptions = ref(false);
  const selectedAtItemIndex = ref(0);
  const selectedAiItemIndex = ref(0);
  const atFilterKeyword = ref("");
  const optionsPosition = ref({ left: 0, top: 0, width: 250 });

  // 管理器实例
  const domCache = new DomCacheManager();
  const selectionManager = new SelectionManager(msgInputRef);
  const tagManager = new TagManager(msgInputRef, domCache, selectionManager);
  const imageManager = new ImageManager(msgInputRef, selectionManager, computed(() => chat.isAIRoom));

  // Hooks
  const { userOptions, userAtOptions, loadUser } = useLoadAtUserList();

  // @用户
  // const atSelectOptions = computed(() => new Set(chat.atUserList.map(p => p.userId)));
  // const atShowOptions = computed(() =>   // 过滤掉已选择的@用户
  //   userAtOptions.value?.filter(p => !atSelectOptions.value.has(p.userId)) || [],
  // );

  const filteredUserAtOptions = computed(() => {
    if (!atFilterKeyword.value)
      return userAtOptions.value;
    const keyword = atFilterKeyword.value.toLowerCase();
    return userAtOptions.value.filter(user =>
      user?.nickName?.toLowerCase().includes(keyword),
    );
  });

  // 监听器
  watch(inputFocus, (val) => {
    if (!val) {
      nextTick(() => {
        resetOptions();
        domCache.clear();
      });
    }
  }, { immediate: true });

  // 防抖输入处理
  const debouncedHandleInput = useDebounceFn(handleInput, 60);

  // 方法
  function resetOptions() {
    showAtOptions.value = false;
    atFilterKeyword.value = "";
  }

  function updateSelectionRange() {
    selectionRange.value = selectionManager.updateRange();
  }

  function updateOptionsPosition() {
    if (!msgInputRef.value)
      return;

    try {
      const range = selectionManager.getRange();
      if (!range)
        return;

      requestAnimationFrame(() => {
        const inputRect = msgInputRef.value!.getBoundingClientRect();
        const rangeRect = range.getBoundingClientRect();

        let left = Math.max(0, rangeRect.left - inputRect.left);
        const maxLeft = Math.max(0, inputRect.width - popoverWidth);
        left = Math.min(left, maxLeft);

        optionsPosition.value = {
          left,
          top: Math.max(0, rangeRect.top - inputRect.top - 8),
          width: popoverWidth,
        };
      });
    }
    catch (error) {
      console.warn("Failed to update options position:", error);
    }
  }

  function handleInput() {
    try {
      updateFormContent();

      const range = selectionManager.getRange();
      if (range && msgInputRef.value) {
        const beforeText = InputDetector.getBeforeText(range, msgInputRef.value);
        const detection = InputDetector.detectType(beforeText);

        if (detection.type === "at" && userAtOptions.value.length > 0) {
          atFilterKeyword.value = detection.keyword;
          showAtOptions.value = true;
          selectedAtItemIndex.value = 0;
          updateOptionsPosition();
          updateSelectionRange();
          return;
        }
      }

      resetOptions();
      updateSelectionRange();
    }
    catch (error) {
      console.warn("Handle input error:", error);
      resetOptions();
    }
  }

  function updateFormContent() {
    if (!msgInputRef.value)
      return;
    resolveContentAtUsers();
  }
  function resolveContentAtUsers() {
    const users = tagManager.parseFromDom(".at-user-tag", (tag) => {
      const uid = tag.getAttribute("data-uid");
      const username = tag.getAttribute("data-username");
      const nickName = tag.textContent?.replace(/^@/, "");

      if (!uid || !username || !nickName)
        return null;

      const userInfo = userOptions.value.find(u => u.userId === uid);
      return {
        label: userInfo?.label || nickName,
        value: userInfo?.value || nickName,
        userId: uid,
        username,
        nickName,
        avatar: userInfo?.avatar,
      } as AtChatMemberOption;
    });
    chat.atUserList = users;
    return users;
  }


  function insertAtUserTag(user: AskAiRobotOption) {
    if (!user?.userId || !user?.nickName)
      return;

    if (!chat.atUserList.some(u => u.userId === user.userId)) {
      chat.atUserList.push(user);
    }

    const outer = SecurityUtils.createSafeElement("span", "at-user-tag", {
      "data-type": "at-user",
      "data-uid": user.userId,
      "data-username": user.username || "",
      "draggable": "false",
      "title": `@${SecurityUtils.sanitizeInput(user.nickName)} (${SecurityUtils.sanitizeInput(user.username || "")})`,
    });

    const inner = SecurityUtils.createSafeElement("span", "at-user-inner");
    inner.textContent = `@${SecurityUtils.sanitizeInput(user.nickName)}`;
    outer.appendChild(inner);

    tagManager.insert(outer, {
      type: "at-user",
      uid: user.userId,
      username: user.username || "",
      text: `@${user.nickName}`,
    }, /@[^@\s]*$/, true);
  }

  function handleSelectAtUser(user: AskAiRobotOption) {
    resetOptions();
    if (!msgInputRef.value)
      return;

    if (selectionRange.value) {
      const selection = selectionManager.getCurrent();
      selection?.removeAllRanges();
      selection?.addRange(selectionRange.value);
    }
    else {
      selectionManager.focusAtEnd();
    }

    insertAtUserTag(user);
  }

  function handleSelectAiRobot(robot: AskAiRobotOption) {
    resetOptions();
    if (!msgInputRef.value)
      return;

    if (selectionRange.value) {
      const selection = selectionManager.getCurrent();
      selection?.removeAllRanges();
      selection?.addRange(selectionRange.value);
    }
    else {
      selectionManager.focusAtEnd();
    }
  }

  function clearInputContent() {
    if (msgInputRef.value) {
      const range = document.createRange();
      range.selectNodeContents(msgInputRef.value);
      range.deleteContents();
      domCache.clear();
      updateFormContent();
    }
  }

  function getInputVaildText(): string {
    try {
      // 默认 （包括 @ ）
      const content = msgInputRef.value?.textContent || "";
      inputTextContent.value = content;
      return content.trim();
    }
    catch (error) {
      console.warn("Get input valid text error:", error);
      return "";
    }
  }
  /**
   * 处理键盘事件
   * @param e 键盘事件对象
   */
  function handleKeyDown(e: KeyboardEvent) {
    try {
      updateSelectionRange();

      // 限制快捷键 - 只允许常规输入框快捷键
      if (isRestrictedShortcut(e)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // 处理选项导航
      if ((showAtOptions.value) && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        const options = showAtOptions.value ? filteredUserAtOptions.value : [];
        const currentIndex = showAtOptions.value ? selectedAtItemIndex.value : selectedAiItemIndex.value;
        const direction = e.key === "ArrowDown" ? 1 : -1;
        const newIndex = Math.max(0, Math.min(currentIndex + direction, options.length - 1));

        if (showAtOptions.value) {
          selectedAtItemIndex.value = newIndex;
          nextTick(() => scrollToSelectedItem(true, newIndex));
        }
        return;
      }

      // 会话切换
      if ((e.key === "ArrowUp" || e.key === "ArrowDown") && setting.downUpChangeContact && !getInputVaildText()) {
        e.preventDefault();
        chat.onDownUpChangeRoom(e.key === "ArrowDown" ? "down" : "up");
      }

      // 确认选择
      if ((showAtOptions.value) && (e.key === "Enter" || e.key === "Tab")) {
        if (showAtOptions.value && filteredUserAtOptions.value.length) {
          const selectedUser = filteredUserAtOptions.value[selectedAtItemIndex.value];
          if (selectedUser) {
            handleSelectAtUser(selectedUser);
            e.preventDefault();
            return;
          }
        }
      }

      // 退出选择
      if ((showAtOptions.value) && e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        resetOptions();
        return;
      }

      // 发送消息
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    }
    catch (error) {
      console.warn("Handle key down error:", error);
    }
  }

  // 滚动到选中的选项
  function scrollToSelectedItem(isAtOptions: boolean, selectedIndex: number) {
    const scrollbar = isAtOptions ? atScrollbar.value : aiScrollbar.value;
    scrollbar?.scrollToItem?.(selectedIndex);
  }

  // 通用剪贴板操作
  const clipboardActions = {
    async cut() {
      const selection = window.getSelection();
      if (selection && selection.toString()) {
        try {
          await navigator.clipboard.writeText(selection.toString());
          selection.deleteFromDocument();
          updateFormContent();
          nextTick(() => {
            selectionManager.focusAtEnd();
          });
        }
        catch (err) {
          document.execCommand("cut");
          updateFormContent();
        }
      }
    },

    async copy() {
      const selection = window.getSelection();
      if (selection && selection.toString()) {
        try {
          await navigator.clipboard.writeText(selection.toString());
          nextTick(() => {
            selectionManager.focusAtEnd();
          });
        }
        catch (err) {
          document.execCommand("copy");
        }
      }
    },

    async paste() {
      try {
        // 先尝试从剪贴板读取数据
        const clipboardData = await navigator.clipboard.read();

        for (const item of clipboardData) {
          if (item.types.some(type => type.startsWith("image/"))) {
            const imageType = item.types.find(type => type.startsWith("image/"));
            if (imageType) {
              const blob = await item.getType(imageType);
              const file = new File([blob], `pasted-image-${Date.now()}.${imageType.split("/")[1]}`, { type: imageType });
              await imageManager.insert(file);
              return;
            }
          }
        }

        // 如果没有图片，处理文本
        const text = await navigator.clipboard.readText();
        if (text) {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(text));
            range.collapse(false);
            updateFormContent();
          }
        }
      }
      catch (err) {
        // 降级处理
        try {
          const text = await navigator.clipboard.readText();
          document.execCommand("insertText", false, text);
          updateFormContent();
        }
        catch (e) {
          console.warn("Paste failed:", e);
        }
      }
      nextTick(() => {
        selectionManager.focusAtEnd();
      });
    },

    selectAll() {
      const selection = window.getSelection();
      const range = document.createRange();
      if (msgInputRef.value) {
        range.selectNodeContents(msgInputRef.value);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    },
  };
  // 右键菜单
  function onContextMenu(e: MouseEvent) {
    e.preventDefault();
    const selectedText = window.getSelection()?.toString();

    const contextMenuItems = [
      {
        label: "剪切",
        customClass: "group",
        icon: "hover:scale-106 transition-200 i-solar:scissors-line-duotone",
        hidden: !selectedText,
        onClick: clipboardActions.cut,
      },
      {
        label: "复制",
        customClass: "group",
        icon: "hover:scale-106 transition-200 i-solar:copy-line-duotone",
        hidden: !selectedText,
        onClick: clipboardActions.copy,
      },
      {
        label: "粘贴",
        customClass: "group",
        icon: "hover:scale-106 transition-200 i-solar:document-text-outline",
        onClick: clipboardActions.paste,
      },
      {
        label: "全选",
        icon: "i-solar:check-read-outline",
        onClick: clipboardActions.selectAll,
      },
    ];

    ContextMenuGlobal.showContextMenu({
      x: e.x,
      y: e.y,
      theme: setting.contextMenuTheme,
      items: contextMenuItems,
    });
  }
  // 快捷键限制函数
  function isRestrictedShortcut(e: KeyboardEvent): boolean {
    const { key, ctrlKey, metaKey } = e;

    // 禁用的快捷键列表
    const restrictedShortcuts = [
      // 格式化快捷键
      { ctrl: true, key: "b" }, // 加粗
      { ctrl: true, key: "i" }, // 斜体
      { ctrl: true, key: "u" }, // 下划线

      // Mac 系统对应的快捷键
      { meta: true, key: "b" }, // 加粗 (Mac)
      { meta: true, key: "i" }, // 斜体 (Mac)
      { meta: true, key: "u" }, // 下划线 (Mac)
    ];

    // 检查是否为禁用的快捷键
    return restrictedShortcuts.some((shortcut) => {
      const ctrlMatch = shortcut.ctrl ? (ctrlKey || metaKey) : !ctrlKey && !metaKey;
      const metaMatch = shortcut.meta ? metaKey : !metaKey;
      const keyMatch = shortcut.key.toLowerCase() === key.toLowerCase();

      return ctrlMatch && metaMatch && keyMatch;
    });
  }

  return {
    // 核心 refs 和状态
    inputFocus,
    msgInputRef,
    focusRef,
    selectionRange,
    inputTextContent,

    // 管理器
    imageManager,
    tagManager,
    selectionManager,

    // @ 和 AI 选择状态
    showAtOptions,
    selectedAtItemIndex,
    selectedAiItemIndex,
    atFilterKeyword,
    optionsPosition,

    // 计算选项
    filteredUserAtOptions,
    userOptions,
    userAtOptions,

    // 滚动条引用
    atScrollbar,
    aiScrollbar,

    // 加载函数
    loadUser,

    // 内容管理
    updateFormContent,
    clearInputContent,
    getInputVaildText,
    resolveContentAtUsers,

    // 选区和范围
    updateSelectionRange,
    updateOptionsPosition,

    // 标签插入
    insertAtUserTag,

    // 选项处理器
    resetOptions,
    handleSelectAtUser,
    handleSelectAiRobot,
    scrollToSelectedItem,

    // 事件处理器
    handleInput: debouncedHandleInput,
    handleKeyDown,
    onContextMenu,
  };
}
