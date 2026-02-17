import type { ImageManager } from "./imageManager";
import type { DomCacheManager, SelectionManager } from "./inputDomUtils";
import ContextMenuGlobal from "@imengyu/vue3-context-menu";
import { AT_USER_TAG_CLASSNAME, SecurityUtils } from "./inputDomUtils";

/**
 * 输入框右键菜单与粘贴 token 解析
 */
export function useInputContextMenu(deps: {
  msgInputRef: Ref<HTMLElement | null>;
  selectionManager: SelectionManager;
  domCache: DomCacheManager;
  imageManager: ImageManager;
  updateFormContent: () => void;
  userAtOptions: ComputedRef<AtChatMemberOption[]>;
  aiOptions: Ref<AskAiRobotOption[]>;
  contextMenuTheme: ComputedRef<string>;
}) {
  const {
    msgInputRef,
    selectionManager,
    domCache,
    imageManager,
    updateFormContent,
    userAtOptions,
    aiOptions,
    contextMenuTheme,
  } = deps;

  // 右键菜单打开前保存的选区快照
  let savedContextMenuRange: Range | null = null;
  let savedContextMenuText = "";

  /**
   * 恢复右键菜单打开前的选区
   */
  function restoreContextMenuSelection(): Selection | null {
    const selection = window.getSelection();
    if (savedContextMenuRange) {
      selection?.removeAllRanges();
      selection?.addRange(savedContextMenuRange);
    }
    else {
      selectionManager.focusAtEnd();
    }
    return window.getSelection();
  }

  // 自定义 Token 粘贴解析（@用户、AI 机器人）
  function rebuildNodeFromPaste(node: Node, parent: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      parent.appendChild(document.createTextNode(node.textContent || ""));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE)
      return;

    const el = node as HTMLElement;

    // @用户 token
    if (el.classList.contains(AT_USER_TAG_CLASSNAME)) {
      const uid = el.getAttribute("data-uid");
      if (uid) {
        const userInfo = userAtOptions.value.find(u => u.userId === uid);
        if (userInfo) {
          const nickName = userInfo.nickName;
          const outer = SecurityUtils.createSafeElement("span", AT_USER_TAG_CLASSNAME, {
            "data-type": "at-user",
            "data-uid": uid,
            "data-nickName": nickName,
            "draggable": "false",
            "title": `@${SecurityUtils.sanitizeInput(nickName)}`,
          });
          const inner = SecurityUtils.createSafeElement("span", "at-user-inner");
          inner.textContent = `@${SecurityUtils.sanitizeInput(nickName)}`;
          outer.appendChild(inner);
          parent.appendChild(outer);
          return;
        }
      }
      parent.appendChild(document.createTextNode(el.textContent || ""));
      return;
    }

    // AI 机器人 token
    if (el.classList.contains("ai-robot-tag")) {
      const uid = el.getAttribute("data-uid");
      if (uid) {
        const robotInfo = aiOptions.value.find(r => r.userId === uid);
        if (robotInfo) {
          const nickName = robotInfo.nickName;
          const outer = SecurityUtils.createSafeElement("span", "ai-robot-tag", {
            "data-type": "ai-robot",
            "data-uid": uid,
            "data-nickName": nickName,
            "draggable": "false",
            "title": SecurityUtils.sanitizeInput(nickName),
          });
          const inner = SecurityUtils.createSafeElement("span", "ai-robot-inner");
          inner.textContent = SecurityUtils.sanitizeInput(nickName);
          if (robotInfo.avatar) {
            inner.style.setProperty("--ai-robot-inner-icon", `url(${BaseUrlImg + robotInfo.avatar})`);
          }
          outer.appendChild(inner);
          parent.appendChild(outer);
          return;
        }
      }
      parent.appendChild(document.createTextNode(el.textContent || ""));
      return;
    }

    // 其他元素：递归处理子节点
    for (const child of Array.from(el.childNodes)) {
      rebuildNodeFromPaste(child, parent);
    }
  }

  /**
   * 解析粘贴的 HTML 内容，识别并重建自定义 token
   */
  function pasteHtmlWithTokens(html: string): boolean {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const body = doc.body;
      if (!body?.childNodes.length)
        return false;

      if (!body.querySelector(`.${AT_USER_TAG_CLASSNAME}, .ai-robot-tag`))
        return false;

      if (!msgInputRef.value)
        return false;
      msgInputRef.value.focus();

      const selection = selectionManager.getCurrent();
      if (!selection || selection.rangeCount === 0)
        return false;
      const range = selection.getRangeAt(0);
      range.deleteContents();

      const fragment = document.createDocumentFragment();
      for (const node of Array.from(body.childNodes)) {
        rebuildNodeFromPaste(node, fragment);
      }

      range.insertNode(fragment);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);

      updateFormContent();
      domCache.clear();
      return true;
    }
    catch (error) {
      console.warn("pasteHtmlWithTokens failed:", error);
      return false;
    }
  }

  // 通用剪贴板操作
  const clipboardActions = {
    async cut() {
      const text = savedContextMenuText;
      if (!text) {
        return;
      }
      const success = await copyText(text);
      const selection = restoreContextMenuSelection();
      if (success) {
        if (selection && selection.rangeCount > 0) {
          selection.deleteFromDocument();
        }
        updateFormContent();
      }
      else {
        msgInputRef.value?.focus();
        document.execCommand("cut");
        updateFormContent();
      }
      nextTick(() => {
        selectionManager.focusAtEnd();
      });
    },

    async copy() {
      const text = savedContextMenuText;
      if (!text) {
        return;
      }
      const success = await copyText(text);
      if (!success) {
        restoreContextMenuSelection();
        document.execCommand("copy");
      }
      nextTick(() => {
        selectionManager.focusAtEnd();
      });
    },

    async paste() {
      try {
        try {
          const items = await navigator.clipboard.read();
          for (const item of items) {
            if (item.types.includes("text/html")) {
              const blob = await item.getType("text/html");
              const html = await blob.text();
              restoreContextMenuSelection();
              if (pasteHtmlWithTokens(html))
                return;
            }
          }
        }
        catch {
          // Clipboard API HTML 读取不可用，降级处理
        }

        const result = await clipboardRead();

        if (result?.type === "image" && result.blob) {
          const ext = result.blob.type.split("/")[1] || "png";
          const file = new File([result.blob], `pasted-image-${Date.now()}.${ext}`, { type: result.blob.type });
          await imageManager.insert(file);
          return;
        }

        if (result?.type === "text" && result.text) {
          restoreContextMenuSelection();
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(result.text));
            range.collapse(false);
            updateFormContent();
          }
          else {
            msgInputRef.value?.focus();
            document.execCommand("insertText", false, result.text);
            updateFormContent();
          }
          nextTick(() => {
            selectionManager.focusAtEnd();
          });
          return;
        }
      }
      catch (err) {
        try {
          const text = await readText();
          if (text) {
            msgInputRef.value?.focus();
            document.execCommand("insertText", false, text);
            updateFormContent();
          }
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
    const selection = window.getSelection();
    const selectedText = selection?.toString() || "";
    savedContextMenuText = selectedText;
    savedContextMenuRange = (selection && selection.rangeCount > 0)
      ? selection.getRangeAt(0).cloneRange()
      : null;

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
      theme: contextMenuTheme.value,
      items: contextMenuItems,
    });
  }

  return { onContextMenu, pasteHtmlWithTokens };
}
