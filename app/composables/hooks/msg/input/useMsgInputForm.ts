import { AT_USER_TAG_CLASSNAME, DomCacheManager, InputDetector, SecurityUtils, SelectionManager, TagManager } from "./inputDomUtils";

// @unocss-include
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
  // 置顶用户
  const replyUserIdStickTop = computed(() => chat.replyMsg?.fromUser?.userId);

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

  // 通用过滤与置顶逻辑
  function createFilteredOptions<T extends { userId: string; nickName: string }>(
    options: Ref<T[]> | ComputedRef<T[]>,
    keyword: Ref<string>,
  ) {
    return computed(() => {
      const kw = keyword.value.toLowerCase();
      const stickId = replyUserIdStickTop.value;
      const sticky: T[] = [];
      const others: T[] = [];

      for (const item of options.value) {
        if (kw && !item.nickName.toLowerCase().includes(kw))
          continue;
        if (stickId && item.userId === stickId)
          sticky.push(item);
        else
          others.push(item);
      }

      return sticky.length > 0 ? [...sticky, ...others] : others;
    });
  }

  const filteredUserAtOptions = createFilteredOptions(userAtOptions, atFilterKeyword);
  const filteredAiOptions = createFilteredOptions(aiOptions, aiFilterKeyword);

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
  /**
   * 通用 DOM 标签解析 → 选项列表
   */
  function resolveTagsFromDom<T extends { userId: string }>(
    selector: string,
    lookupList: Ref<T[]> | ComputedRef<T[]>,
    buildItem: (uid: string, nickName: string, found: T | undefined) => T,
    dedupe = false,
  ): T[] {
    const items = tagManager.parseFromDom(selector, (tag) => {
      const uid = tag.getAttribute("data-uid");
      const nickName = tag.getAttribute("data-nickName");
      if (!uid || !nickName)
        return null;
      const found = lookupList.value.find(u => u.userId === uid);
      return buildItem(uid, nickName, found);
    });

    if (!dedupe)
      return items;

    const seen = new Set<string>();
    return items.filter((item) => {
      if (!item?.userId || seen.has(item.userId))
        return false;
      seen.add(item.userId);
      return true;
    });
  }

  function resolveContentAtUsers() {
    const users = resolveTagsFromDom<AtChatMemberOption>(
      `.${AT_USER_TAG_CLASSNAME}`,
      userOptions,
      (uid, nickName, userInfo) => ({
        label: userInfo?.label || nickName,
        value: userInfo?.value || nickName,
        userId: uid,
        nickName,
        avatar: userInfo?.avatar,
      } as AtChatMemberOption),
    );
    chat.atUserList = users;
    return users;
  }

  function resolveContentAiAsk() {
    const uniqueAiRobots = resolveTagsFromDom<AskAiRobotOption>(
      ".ai-robot-tag",
      aiOptions,
      (uid, nickName, robotInfo) => ({
        label: robotInfo?.label || nickName,
        value: robotInfo?.value || nickName,
        userId: uid,
        nickName,
        avatar: robotInfo?.avatar,
        aiRobotInfo: robotInfo?.aiRobotInfo,
      } as AskAiRobotOption),
      true,
    );
    chat.askAiRobotList = uniqueAiRobots;
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
    }, /\/[^/\s]*$/, true);
  }

  function handleSelectMention(item: AskAiRobotOption, insertFn: (item: AskAiRobotOption) => void) {
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

    insertFn(item);
  }

  function handleSelectAtUser(user: AskAiRobotOption) {
    handleSelectMention(user, insertAtUserTag);
  }

  function handleSelectAiRobot(robot: AskAiRobotOption) {
    handleSelectMention(robot, insertAiRobotTag);
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
          } as AI_CHATBodyDTO;
          formDataTemp.msgType = MessageType.AI_CHAT; // 设置对应消息类型
        }
        else if (chat.theContact.type === RoomType.AI_CHAT) { // 私聊机器人
          formDataTemp.content = replaceText;
          formDataTemp.body = {
            userIds: [chat.theContact.targetUid], // 个人
            businessCode: AiBusinessType.TEXT, // 文本
          } as AI_CHATBodyDTO;
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

  // 右键菜单与粘贴 token 解析（提取到 useInputContextMenu）
  const { onContextMenu, pasteHtmlWithTokens } = useInputContextMenu({
    msgInputRef,
    selectionManager,
    domCache,
    imageManager,
    updateFormContent,
    userAtOptions,
    aiOptions,
    contextMenuTheme: computed(() => setting.contextMenuTheme),
  });
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
   * 根据文件类型构建媒体消息体
   */
  function buildMediaBody(
    baseMessage: Record<string, any>,
    oss: OssFile,
    type: OssFileType,
    urlKey: "id" | "key",
  ) {
    const thumb = oss?.children?.[0];
    const isPreview = urlKey === "id";
    switch (type) {
      case OssFileType.IMAGE:
        return {
          ...baseMessage,
          msgType: MessageType.IMG,
          body: {
            ...baseMessage.body,
            url: oss[urlKey]!,
            width: oss.width || 0,
            height: oss.height || 0,
            size: oss.file?.size,
          },
          ...(isPreview ? { _ossFile: oss } : {}),
        };
      case OssFileType.VIDEO:
        return {
          ...baseMessage,
          msgType: MessageType.VIDEO,
          body: {
            ...baseMessage.body,
            url: oss[urlKey]!,
            size: oss.file?.size || 0,
            duration: oss.duration || 0,
            thumbUrl: thumb?.[urlKey],
            thumbSize: isPreview ? (thumb?.thumbSize || 0) : thumb?.thumbSize,
            thumbWidth: isPreview ? (thumb?.thumbWidth || 0) : thumb?.thumbWidth,
            thumbHeight: isPreview ? (thumb?.thumbHeight || 0) : thumb?.thumbHeight,
          },
          ...(isPreview ? { _ossFile: oss } : {}),
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
          ...(isPreview ? { _ossFile: oss } : {}),
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
          ...(isPreview ? { _ossFile: oss } : {}),
        };
      default:
        return baseMessage;
    }
  }

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

    const resolveType = () => oss?.file
      ? fileActions.analyzeFile(oss.file, customUploadType).type
      : null;

    const previewFormDataTemp = computed<ChatMessageDTO & { _ossFile?: OssFile }>(() => {
      const type = resolveType();
      if (!oss?.file || !type)
        return baseMessage;
      return buildMediaBody(baseMessage, oss, type, "id") as ChatMessageDTO & { _ossFile?: OssFile };
    });

    const getFormData = () => {
      const type = resolveType();
      if (!oss?.file || !type)
        return baseMessage;
      return buildMediaBody(baseMessage, oss, type, "key");
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

    // 粘贴解析
    pasteHtmlWithTokens,

    // 事件处理器
    handleInput: debouncedHandleInput,
    handleKeyDown,
    onContextMenu,
  };
}
