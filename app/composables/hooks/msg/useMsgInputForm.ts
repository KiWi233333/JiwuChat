import ContextMenuGlobal from "@imengyu/vue3-context-menu";

export const MAX_UPLOAD_IMAGE_COUNT = 9;
export const AT_USER_TAG_CLASSNAME = "at-user-tag";
// @unocss-include
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
  // 快捷键 Hook
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
  const isReplyAI = computed(() => chat.askAiRobotList.length > 0);
  const showAtOptions = ref(false);
  const showAiOptions = ref(false);
  const selectedAtItemIndex = ref(0);
  const selectedAiItemIndex = ref(0);
  const atFilterKeyword = ref("");
  const aiFilterKeyword = ref("");
  const optionsPosition = ref({ left: 0, top: 0, width: 250 });

  // 管理器实例
  const domCache = new DomCacheManager();
  const selectionManager = new SelectionManager(msgInputRef);
  const tagManager = new TagManager(msgInputRef, domCache, selectionManager);
  const imageManager = new ImageManager(msgInputRef, selectionManager, computed(() => chat.isAIRoom || isReplyAI.value));
  const fileManager = new FileManager(msgInputRef, selectionManager, computed(() => chat.isAIRoom || isReplyAI.value));
  const videoManager = new VideoManager(msgInputRef, selectionManager, computed(() => chat.isAIRoom || isReplyAI.value));

  // Hooks
  const { userOptions, userAtOptions, loadUser } = useLoadAtUserList();
  const { aiOptions, loadAi } = useLoadAiList();

  // AI机器人
  const aiSelectOptions = computed(() => new Set(chat.askAiRobotList.map(p => p.userId)));
  const aiShowOptions = computed(() => // 过滤掉已选择的AI机器人
    aiOptions.value?.filter(p => !aiSelectOptions.value.has(p.userId)) || [],
  );
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

  const filteredAiOptions = computed(() => {
    if (!aiFilterKeyword.value)
      return aiShowOptions.value;
    const keyword = aiFilterKeyword.value.toLowerCase();
    return aiShowOptions.value.filter(ai =>
      ai?.nickName?.toLowerCase().includes(keyword),
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
    showAiOptions.value = false;
    atFilterKeyword.value = "";
    aiFilterKeyword.value = "";
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

        if (detection.type === "at" && userAtOptions.value.length > 0 && !isReplyAI.value) {
          atFilterKeyword.value = detection.keyword;
          showAtOptions.value = true;
          showAiOptions.value = false;
          selectedAtItemIndex.value = 0;
          updateOptionsPosition();
          updateSelectionRange();
          return;
        }

        if (detection.type === "ai" && aiOptions.value.length > 0 && !isAtUser.value) {
          aiFilterKeyword.value = detection.keyword;
          showAiOptions.value = true;
          showAtOptions.value = false;
          selectedAiItemIndex.value = 0;
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
    resolveContentAiAsk();
  }
  function resolveContentAtUsers() {
    const users = tagManager.parseFromDom(`.${AT_USER_TAG_CLASSNAME}`, (tag) => {
      const uid = tag.getAttribute("data-uid");
      const nickName = tag.getAttribute("data-nickName");

      if (!uid || !nickName || !nickName)
        return null;

      const userInfo = userOptions.value.find(u => u.userId === uid);
      return {
        label: userInfo?.label || nickName,
        value: userInfo?.value || nickName,
        userId: uid,
        nickName,
        avatar: userInfo?.avatar,
      } as AtChatMemberOption;
    });
    chat.atUserList = users;
    return users;
  }

  function resolveContentAiAsk() {
    const aiRobots = tagManager.parseFromDom(".ai-robot-tag", (tag) => {
      const uid = tag.getAttribute("data-uid");
      const nickName = tag.getAttribute("data-nickName");

      if (!uid || !nickName || !nickName)
        return null;

      const robotInfo = aiOptions.value.find(r => r.userId === uid);
      return {
        label: robotInfo?.label || nickName,
        value: robotInfo?.value || nickName,
        userId: uid,
        nickName,
        avatar: robotInfo?.avatar,
        aiRobotInfo: robotInfo?.aiRobotInfo,
      } as AskAiRobotOption;
    });

    chat.askAiRobotList = aiRobots;
  }

  function insertAtUserTag(user: AskAiRobotOption) {
    if (!user?.userId || !user?.nickName)
      return;

    if (!chat.atUserList.some(u => u.userId === user.userId)) {
      chat.atUserList.push(user);
    }
    const outer = SecurityUtils.createSafeElement("span", AT_USER_TAG_CLASSNAME, {
      "data-type": "at-user",
      "data-uid": user.userId,
      "data-nickName": user.nickName || "",
      "draggable": "false",
      "title": `@${SecurityUtils.sanitizeInput(user.nickName)} (${SecurityUtils.sanitizeInput(user.nickName || "")})`,
    });

    const inner = SecurityUtils.createSafeElement("span", "at-user-inner");
    inner.textContent = `@${SecurityUtils.sanitizeInput(user.nickName)}`;
    outer.appendChild(inner);

    tagManager.insert(outer, {
      type: "at-user",
      uid: user.userId,
      nickName: user.nickName || "",
      text: `@${user.nickName}`,
    }, /@[^@\s]*$/, true);
  }

  function insertAiRobotTag(robot: AskAiRobotOption) {
    if (!robot?.userId || !robot?.nickName)
      return;

    if (!chat.askAiRobotList.some(r => r.userId === robot.userId)) {
      chat.askAiRobotList.push(robot);
    }

    const outer = SecurityUtils.createSafeElement("span", "ai-robot-tag", {
      "data-type": "ai-robot",
      "data-uid": robot.userId,
      "draggable": "false",
      "data-nickName": robot.nickName || "",
      "title": `${SecurityUtils.sanitizeInput(robot.nickName)} (${SecurityUtils.sanitizeInput(robot.nickName || "")})`,
    });

    const inner = SecurityUtils.createSafeElement("span", "ai-robot-inner");
    inner.textContent = SecurityUtils.sanitizeInput(robot.nickName || "未知机器人");
    // 添加头像变量 var(--ai-robot-inner-icon)
    inner.style.setProperty("--ai-robot-inner-icon", `url(${BaseUrlImg + robot.avatar || ""})`);
    outer.appendChild(inner);

    tagManager.insert(outer, {
      type: "ai-robot",
      uid: robot.userId,
      nickName: robot.nickName || "",
      text: robot.nickName,
    }, /\/[^/\s]*$/);
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

    insertAiRobotTag(robot);
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

  function checkExistChildren(): boolean {
    if (msgInputRef.value?.textContent?.trim()) {
      return true;
    }
    else if (msgInputRef.value?.innerHTML.trim() === "<br>") {
      return false;
    }
    return !![...(msgInputRef.value?.childNodes || [])].filter(node => node.nodeType !== Node.TEXT_NODE).length;
  }

  function getInputDTOByText() {
    try {
      // 获取输入框内容
      const formDataTemp: Partial<ChatMessageDTO> = {
        msgType: MessageType.TEXT,
        content: "",
        body: {
          mentionList: [],
        },
      };
      msgInputRef.value?.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          formDataTemp.content += node.textContent || "";
        }
        else if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).classList.contains(AT_USER_TAG_CLASSNAME)) {
          formDataTemp.content += node.textContent || "";
        }
      });

      // 处理 @ 和 AI
      // 文本类
      if (formDataTemp.content) {
        if (chat.theContact.type === RoomType.GROUP) { // 处理 @用户
          const atUidList = resolveContentAtUsers();
          if (atUidList?.length) {
            chat.atUserList = atUidList;
            // 将 atUidList 转换为 mentionList 格式
            formDataTemp.body.mentionList = atUidList.map(item => ({
              uid: item.userId,
              displayName: `@${item.nickName}`,
            }));
          }
        }

        // 处理 AI机器人 TODO: 可改为全体呼叫
        const { replaceText, aiRobitUidList } = resolveAiReply(formDataTemp.content!, aiOptions.value, chat.askAiRobotList);
        if (aiRobitUidList.length > 0 && replaceText) { // AI消息
          formDataTemp.content = replaceText;
          formDataTemp.body = {
            userIds: aiRobitUidList.length > 0 ? aiRobitUidList : undefined,
            businessCode: AiBusinessType.TEXT,
          } as AiChatBodyDTO;
          formDataTemp.msgType = MessageType.AI_CHAT; // 设置对应消息类型
        }
        else if (chat.theContact.type === RoomType.AICHAT) { // 私聊机器人
          formDataTemp.content = replaceText;
          formDataTemp.body = {
            userIds: [chat.theContact.targetUid], // 个人
            businessCode: AiBusinessType.TEXT, // 文本
          } as AiChatBodyDTO;
          formDataTemp.msgType = MessageType.AI_CHAT; // 设置对应消息类型
        }
      };

      return formDataTemp;
    }
    catch (error) {
      console.warn("Get input valid text error:", error);
      return undefined;
    }
  }

  /**
   * 换行
   */
  function breakLine() {
    if (!msgInputRef.value)
      return;

    try {
      // 获取当前选区
      const selection = selectionManager.getCurrent();
      if (!selection || selection.rangeCount === 0) {
        // 如果没有选区，将光标定位到末尾
        selectionManager.focusAtEnd();
        return;
      }

      const range = selection.getRangeAt(0);

      // 确保选区在输入框内
      if (!selectionManager.isInInputBox(range)) {
        selectionManager.focusAtEnd();
        return;
      }

      // 删除选中的内容（如果有）
      range.deleteContents();

      // 创建换行文本节点
      const newLineText = document.createTextNode("\n");

      // 插入换行符
      range.insertNode(newLineText);

      // 将光标移动到换行符后面
      range.setStartAfter(newLineText);
      range.collapse(true);

      // 更新选区
      selection.removeAllRanges();
      selection.addRange(range);

      // 确保输入框保持焦点
      msgInputRef.value.focus();

      // 更新表单内容
      nextTick(() => {
        updateFormContent();
      });
    }
    catch (error) {
      console.warn("Break line error:", error);
      // 降级处理：直接在末尾添加换行
      selectionManager.focusAtEnd();
      const endRange = document.createRange();
      endRange.selectNodeContents(msgInputRef.value);
      endRange.collapse(false);
      endRange.insertNode(document.createTextNode("\n"));
      endRange.setStartAfter(endRange.endContainer);
      endRange.collapse(true);
      const selection = selectionManager.getCurrent();
      selection?.removeAllRanges();
      selection?.addRange(endRange);
    }
  }
  /**
   * 处理键盘事件
   * @param e 键盘事件对象
   */
  function handleKeyDown(e: KeyboardEvent) {
    try {
      updateSelectionRange();

      // 0. 限制快捷键 - 只允许常规输入框快捷键
      if (isRestrictedShortcut(e)) {
        e.preventDefault();
        return;
      }
      // 1. 处理弹出选项导航 上下键 (ai、@好友)
      if ((showAtOptions.value || showAiOptions.value) && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        e.stopPropagation();
        const options = showAtOptions.value ? filteredUserAtOptions.value : filteredAiOptions.value;
        const currentIndex = showAtOptions.value ? selectedAtItemIndex.value : selectedAiItemIndex.value;
        const direction = e.key === "ArrowDown" ? 1 : -1;
        const newIndex = Math.max(0, Math.min(currentIndex + direction, options.length - 1));

        if (showAtOptions.value) {
          selectedAtItemIndex.value = newIndex;
          nextTick(() => scrollToSelectedItem(true, newIndex));
        }
        else if (showAiOptions.value) {
          selectedAiItemIndex.value = newIndex;
          nextTick(() => scrollToSelectedItem(false, newIndex));
        }
        return;
      }
      // 确认选择 (ai、@好友)
      if ((showAtOptions.value || showAiOptions.value) && (e.key === "Enter" || e.key === "Tab")) {
        if (showAtOptions.value && filteredUserAtOptions.value.length) {
          const selectedUser = filteredUserAtOptions.value[selectedAtItemIndex.value];
          if (selectedUser) {
            handleSelectAtUser(selectedUser);
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }
        else if (showAiOptions.value && filteredAiOptions.value.length) {
          const selectedAi = filteredAiOptions.value[selectedAiItemIndex.value];
          if (selectedAi) {
            handleSelectAiRobot(selectedAi);
            e.preventDefault();
            return;
          }
        }
      }
      // 退出选择 (ai、@好友)
      if ((showAtOptions.value || showAiOptions.value) && e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        resetOptions();
        return;
      }
      // 其他消息快捷键
      setting.shortcutManager.handleInputShortcuts(e);
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
  // 禁用的快捷键列表
  const restrictedShortcutMap: Record<string, boolean> = {
    "ctrl+b": true,
    "ctrl+i": true,
    "ctrl+u": true,
    "meta+b": true,
    "meta+i": true,
    "meta+u": true,
  };

  // 快捷键限制函数
  function isRestrictedShortcut(e: KeyboardEvent): boolean {
    const { key, ctrlKey, metaKey } = e;
    // 检查是否为禁用的快捷键
    return !!restrictedShortcutMap[ctrlKey ? "ctrl+" : metaKey ? "meta+" : key.toLocaleLowerCase()];
  }

  // 快捷键初始化 --- 处理会话切换快捷键 || 输入框快捷键（发送消息、换行等）
  setting.shortcutManager.updateShortHandlers("send-message", handleSubmit);
  setting.shortcutManager.updateShortHandlers("line-break", () => {
    if (setting.shortcutManager.isEnabled("line-break", "local")) {
      breakLine();
    }
  });
  setting.shortcutManager.updateShortHandlers("switch-chat", (e) => {
    if (!checkExistChildren()) {
      chat.onDownUpChangeRoom(e.key === "ArrowDown" ? "down" : "up");
    }
  });

  // 输入法组合事件处理
  function handleCompositionStart() {
    setting.shortcutManager.startComposition();
  }

  function handleCompositionEnd() {
    setting.shortcutManager.endComposition();
  }

  // 监听输入法组合事件
  watch(msgInputRef, (newRef) => {
    if (newRef) {
      // 添加输入法组合事件监听器
      newRef.addEventListener("compositionstart", handleCompositionStart);
      newRef.addEventListener("compositionend", handleCompositionEnd);
    }
  }, { immediate: true });

  // 清理输入法事件监听器
  onUnmounted(() => {
    if (msgInputRef.value) {
      msgInputRef.value.removeEventListener("compositionstart", handleCompositionStart);
      msgInputRef.value.removeEventListener("compositionend", handleCompositionEnd);
    }
  });


  /**
   * 根据上传成功的 OssFile 构造消息体
   */
  function constructMsgFormDTO(fileActions: ReturnType<typeof useFileActions>, oss?: OssFile, formData?: Partial<ChatMessageDTO>, customUploadType?: OssFileType) {
    const time = Date.now();
    const ackId = `temp_${time}_${Math.floor(Math.random() * 100)}`;

    const baseMessage = {
      ...(chat.msgForm || {}),
      roomId: chat.theRoomId!,
      clientId: ackId,
      content: formData?.content,
      msgType: formData?.msgType || MessageType.TEXT,
      body: {
        ...(chat.msgForm?.body || {}),
        ...formData?.body,
      },
    };
    const previewFormDataTemp = computed<ChatMessageDTO & { _ossFile?: OssFile }>(() => {
      if (!oss?.file) {
        return baseMessage;
      }

      const analysis = fileActions.analyzeFile(oss.file, customUploadType);
      const type = analysis.type;

      switch (type) {
        case OssFileType.IMAGE:
          return {
            ...baseMessage,
            msgType: MessageType.IMG,
            body: {
              ...baseMessage.body,
              url: oss.id!,
              width: oss.width || 0,
              height: oss.height || 0,
              size: oss.file?.size,
            },
            _ossFile: oss,
          };

        case OssFileType.VIDEO:
          const thumb = oss?.children?.[0];
          return {
            ...baseMessage,
            msgType: MessageType.VIDEO,
            body: {
              ...baseMessage.body,
              url: oss.id!,
              size: oss.file?.size || 0,
              duration: oss.duration || 0,
              thumbUrl: thumb?.id,
              thumbSize: thumb?.thumbSize || 0,
              thumbWidth: thumb?.thumbWidth || 0,
              thumbHeight: thumb?.thumbHeight || 0,
            },
            _ossFile: oss,
          };

        case OssFileType.FILE:
          return {
            ...baseMessage,
            msgType: MessageType.FILE,
            body: {
              ...baseMessage.body,
              fileName: oss.file?.name || "",
              url: oss.key!,
              size: oss.file?.size || 0,
            },
            _ossFile: oss,
          };

        case OssFileType.SOUND:
          return {
            ...baseMessage,
            msgType: MessageType.SOUND,
            body: {
              ...baseMessage.body,
              url: oss.key,
              second: oss.duration || 0,
            },
            _ossFile: oss,
          };

        default:
          return baseMessage;
      }
    });

    const getFormData
    = () => {
      if (!oss?.file) {
        return baseMessage;
      }

      const analysis = fileActions.analyzeFile(oss.file, customUploadType);
      const type = analysis.type;

      switch (type) {
        case OssFileType.IMAGE:
          return {
            ...baseMessage,
            msgType: MessageType.IMG,
            body: {
              ...baseMessage.body,
              url: oss.key!,
              width: oss.width || 0,
              height: oss.height || 0,
              size: oss.file?.size,
            },
          };

        case OssFileType.VIDEO:
          const thumb = oss?.children?.[0];
          return {
            ...baseMessage,
            msgType: MessageType.VIDEO,
            body: {
              ...baseMessage.body,
              url: oss.key,
              size: oss.file?.size || 0,
              duration: oss.duration || 0,
              thumbUrl: thumb?.key,
              thumbSize: thumb?.thumbSize,
              thumbWidth: thumb?.thumbWidth,
              thumbHeight: thumb?.thumbHeight,
            },
          };

        case OssFileType.FILE:
          return {
            ...baseMessage,
            msgType: MessageType.FILE,
            body: {
              ...baseMessage.body,
              fileName: oss.file?.name || "",
              url: oss.key!,
              size: oss.file?.size || 0,
            },
          };

        case OssFileType.SOUND:
          return {
            ...baseMessage,
            msgType: MessageType.SOUND,
            body: {
              ...baseMessage.body,
              url: oss.key,
              second: oss.duration || 0,
            },
          };

        default:
          return baseMessage;
      }
    };

    return { getFormData, previewFormDataTemp, time, ackId };
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
    fileManager,
    videoManager,
    tagManager,
    selectionManager,

    // @ 和 AI 选择状态
    showAtOptions,
    showAiOptions,
    selectedAtItemIndex,
    selectedAiItemIndex,
    atFilterKeyword,
    aiFilterKeyword,
    optionsPosition,

    // 计算选项
    filteredUserAtOptions,
    filteredAiOptions,
    aiShowOptions,
    userOptions,
    userAtOptions,
    aiOptions,
    aiSelectOptions,

    // 状态
    isReplyAI,

    // 滚动条引用
    atScrollbar,
    aiScrollbar,

    // 加载函数
    loadUser,
    loadAi,

    // 内容管理
    updateFormContent,
    clearInputContent,
    checkExistChildren,
    getInputDTOByText,
    resolveContentAtUsers,

    // 选区和范围
    updateSelectionRange,
    updateOptionsPosition,

    // 标签插入
    insertAtUserTag,
    insertAiRobotTag,

    // 选项处理器
    resetOptions,
    handleSelectAtUser,
    handleSelectAiRobot,
    scrollToSelectedItem,

    // 提交处理器
    constructMsgFormDTO,

    // 事件处理器
    handleInput: debouncedHandleInput,
    handleKeyDown,
    onContextMenu,
  };
}
