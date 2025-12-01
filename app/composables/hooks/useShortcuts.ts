import { minimizeWindow } from "../tauri/window";

export type ShortcutEventHandler = (e: KeyboardEvent) => void | Promise<void>;
export type ShortcutEventType = "toggle-theme" | "close-window" | "minimize-window" | "send-message" | "line-break" | "switch-chat" | "";
export type ShortcutCategory = "app" | "local";
export const CustomDialogPopupId = "custom-popup-dialog-model";

export interface ShortcutConfig {
  key: string;
  category: ShortcutCategory;
  enabled: boolean;
  disabledEdit?: boolean; // 是否禁用编辑
  description: string;
  eventType: ShortcutEventType;
  selfTarget?: boolean; // 是否只在当前输入框生效
  macKey?: string; // macOS 专用快捷键
}

// 获取系统对应的修饰键
const getModifierKey = () => isMac() ? "Cmd" : "Ctrl";

// 获取当前平台的快捷键
function getPlatformKey(config: ShortcutConfig): string {
  if (isMac() && config.macKey) {
    return config.macKey;
  }
  return config.key;
}

// 解析键盘事件为快捷键字符串
function parseKeyEvent(e: KeyboardEvent): string {
  const modifiers: string[] = [];

  if (!e.key)
    return "";

  if (isMac()) {
    if (e.metaKey)
      modifiers.push("cmd");
    if (e.altKey)
      modifiers.push("alt");
    if (e.shiftKey)
      modifiers.push("shift");
    if (e.ctrlKey)
      modifiers.push("ctrl");
  }
  else {
    if (e.ctrlKey)
      modifiers.push("ctrl");
    if (e.altKey)
      modifiers.push("alt");
    if (e.shiftKey)
      modifiers.push("shift");
    if (e.metaKey)
      modifiers.push("cmd");
  }

  let key = e.key?.toLowerCase();
  if (key === " ")
    key = "space";

  return modifiers.length > 0 ? `${modifiers.join("+")}+${key}` : key;
}

// 检查快捷键是否匹配
function isKeyMatch(eventKey: string, configKey: string): boolean {
  const normalizedEventKey = eventKey.toLowerCase();
  const normalizedConfigKey = configKey.toLowerCase();

  // 处理特殊快捷键
  if (normalizedConfigKey === "arrowup/arrowdown") {
    return normalizedEventKey === "arrowup" || normalizedEventKey === "arrowdown";
  }

  return normalizedEventKey === normalizedConfigKey;
}

const DISABLED_BROWSER_SHORTCUTS: Record<string, boolean> = {
  "ctrl+p": true, // 打印
  "ctrl+f": true, // 查找
  "f3": true, // 查找下一个
  // "ctrl+r": true,
  "ctrl+shift+f": true, // 查找下一个
  "ctrl+shift+i": true, // 检查更新
  "ctrl+=": true, // 放大
  "ctrl+-": true, // 缩小
  "ctrl+0": true, // 重置缩放
  "ctrl+n": true, // 新建
  "ctrl+t": true, // 新建标签页
  "ctrl+d": true, // 复制
  "ctrl+h": true, // 替换
  "ctrl+l": true, // 跳转
  "ctrl+s": true, // 保存
  // macOS 快捷键
  "cmd+p": true, // 打印
  "cmd+f": true, // 查找
  // "cmd+r": true,
  "cmd+shift+f": true, // 查找下一个
  "cmd+shift+i": true, // 检查更新
  "cmd+=": true, // 放大
  "cmd+-": true, // 缩小
  "cmd+0": true, // 重置缩放
  "cmd+n": true, // 新建
  "cmd+t": true, // 新建标签页
  "cmd+d": true, // 复制
  "cmd+h": true, // 替换
  "cmd+l": true, // 跳转
  "cmd+s": true, // 保存
};

/**
 * 快捷键管理组合函数
 *
 * 提供完整的快捷键系统，支持全局快捷键和输入框快捷键的管理、注册和处理。
 * 快捷键配置支持条件判断、优先级排序和用户自定义，兼容 macOS 和 Windows/Linux。
 *
 * @example
 * ```typescript
 * const {
 *   shortcuts,
 *   initShortcuts,
 *   handleInputShortcuts,
 *   updateShortHandlers
 * } = useShortcuts();
 *
 * // 初始化快捷键系统
 * const cleanup = initShortcuts();
 *
 * // 更新事件处理器
 * updateShortHandlers('send-message', () => {
 *   // 发送消息逻辑
 * });
 *
 * // 清理监听器
 * cleanup();
 * ```
 *
 * @returns 快捷键管理对象，包含以下属性：
 * - shortcuts: 快捷键配置数组的响应式引用
 * - getShortcutsByCategory: 根据分类获取快捷键配置
 * - updateShortcut: 更新指定快捷键配置
 * - toggleShortcut: 切换快捷键启用状态
 * - resetShortcuts: 重置快捷键配置为默认值
 * - hasConflict: 检查快捷键是否冲突
 * - updateShortHandlers: 更新快捷键事件处理函数
 * - handleKeyEvent: 处理键盘事件
 * - handleInputShortcuts: 处理输入框快捷键事件
 * - initShortcuts: 初始化快捷键监听器，返回清理函数
 *
 * @author GitHub Copilot
 * @since 1.0.0
 */
export function useShortcuts() {
  const user = useUserStore();

  // 输入法组合状态
  const isComposing = ref(false);

  // 响应式快捷键配置
  const shortcuts = useLocalStorage<ShortcutConfig[]>(() => `shortcuts_${user.userId}`, [
    {
      key: "Alt+K",
      macKey: "Cmd+K",
      description: "切换主题",
      category: "app",
      enabled: true,
      eventType: "toggle-theme",
    },
    {
      key: "Ctrl+W",
      macKey: "Cmd+W",
      description: "关闭窗口",
      category: "app",
      enabled: true,
      eventType: "close-window",
    },
    {
      key: "Escape",
      description: "最小化窗口",
      category: "app",
      enabled: true,
      eventType: "minimize-window",
      selfTarget: true,
    },
    {
      key: "Enter",
      description: "发送消息",
      category: "local",
      enabled: true,
      eventType: "send-message",
    },
    {
      key: "Shift+Enter",
      description: "换行输入",
      category: "local",
      enabled: true,
      eventType: "line-break",
    },
    {
      key: "ArrowUp/ArrowDown",
      disabledEdit: true,
      description: "切换会话",
      category: "local",
      enabled: true,
      eventType: "switch-chat",
    },
  ]);

  const shortcutKeyMap = computed(() => {
    const obj: Record<string, ShortcutConfig> = {};
    shortcuts.value.forEach((config) => {
      const platformKey = getPlatformKey(config);
      obj[platformKey.toLowerCase()] = config;
    });
    return obj;
  });

  // 默认事件处理器
  const eventHandlers = ref<Record<string, ShortcutEventHandler>>({
    "toggle-theme": () => useSettingThemeChange(),
    "close-window": () => closeWindowHandler(false),
    "minimize-window": () => minimizeWindow(),
    "send-message": () => {},
    "line-break": () => {},
    "switch-chat": () => {},
  });

  const resetShortcuts = () => {
    shortcuts.value = [
      {
        key: "Alt+K",
        macKey: "Cmd+K",
        description: "切换主题",
        category: "app",
        enabled: true,
        eventType: "toggle-theme",
      },
      {
        key: "Ctrl+W",
        macKey: "Cmd+W",
        description: "关闭窗口",
        category: "app",
        enabled: true,
        eventType: "close-window",
      },
      {
        key: "Escape",
        description: "最小化窗口",
        category: "app",
        enabled: true,
        eventType: "minimize-window",
      },
      {
        key: "Enter",
        description: "发送消息",
        category: "local",
        enabled: true,
        eventType: "send-message",
      },
      {
        key: "Shift+Enter",
        description: "换行输入",
        category: "local",
        enabled: true,
        eventType: "line-break",
      },
      {
        key: "ArrowUp/ArrowDown",
        disabledEdit: true,
        description: "切换会话",
        category: "local",
        enabled: true,
        eventType: "switch-chat",
      },
    ];
  };

  // 处理键盘事件
  const handleKeyEvent = (e: KeyboardEvent, category: ShortcutCategory): boolean => {
    const eventKey = parseKeyEvent(e);

    // 查找匹配的快捷键配置
    let bestMatch: ShortcutConfig | null = null;

    for (const config of shortcuts.value) {
      if (config.category === category && config.enabled) {
        const platformKey = getPlatformKey(config);
        if (isKeyMatch(eventKey, platformKey)) {
          bestMatch = config;
          break;
        }
      }
    }

    if (!bestMatch) {
      return false;
    }

    const handler = eventHandlers.value[bestMatch.eventType];
    if (!handler) {
      return false;
    }

    // 特殊处理输入框快捷键
    if (category === "local") {
      const { key } = e;

      if (bestMatch.eventType === "send-message") { // 发送消息
        // 检查是否正在使用输入法组合
        if (isComposing.value) {
          return false; // 输入法组合时，不触发发送消息
        }
        e.preventDefault();
        handler(e);
        return true;
      }
      else if (bestMatch.eventType === "line-break") { // 换行输入
        if (bestMatch.key === "Shift+Enter") {
          return false; // 允许默认行为
        }
        else { // 自定义快捷键
          e.preventDefault();
          handler(e);
          return true;
        }
      }
      else if (bestMatch.eventType === "switch-chat" && (key === "ArrowUp" || key === "ArrowDown")) { // 固定
        handler(e);
        return true;
      }
    }
    else { // 应用快捷键
      e.preventDefault();
      handler(e);
      return true;
    }

    return false;
  };

  // 输入框快捷键处理
  const handleInputShortcuts = (e: KeyboardEvent) => handleKeyEvent(e, "local");

  // 初始化监听器
  const initShortcuts = (): (() => void) => {
    const preventDefaultHandler = (e: KeyboardEvent) => {
      const eventKey = parseKeyEvent(e);

      // 阻止浏览器默认快捷键
      if (DISABLED_BROWSER_SHORTCUTS[eventKey]) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      handleKeyEvent(e, "app");
    };

    const contextMenuHandler = (e: MouseEvent) => e.preventDefault();

    window.addEventListener("keydown", preventDefaultHandler);
    window.addEventListener("contextmenu", contextMenuHandler);

    return () => {
      window.removeEventListener("keydown", preventDefaultHandler, true);
      window.removeEventListener("contextmenu", contextMenuHandler);
    };
  };

  return {
    shortcuts,
    eventHandlers,
    isComposing, // 暴露输入法组合状态

    getShortcutByKey: (eventType: ShortcutEventType) => shortcuts.value.find(s => s.eventType === eventType),

    getShortcutsByCategory: (category: ShortcutCategory) => {
      return shortcuts.value.filter(s => s.category === category);
    },

    updateShortcut: (key: string, category: ShortcutCategory, updates: Partial<ShortcutConfig>) => {
      const index = shortcuts.value.findIndex(s => s.key === key && s.category === category);
      if (index !== -1) {
        shortcuts.value[index] = { ...shortcuts.value[index], ...updates } as ShortcutConfig;
      }
    },

    toggleShortcut: (key: string, category: ShortcutCategory, enabled: boolean) => {
      const shortcut = shortcuts.value.find(s => s.key === key && s.category === category);
      if (shortcut) {
        shortcut.enabled = enabled;
      }
    },

    resetShortcuts,

    hasConflict: (key: string, category: ShortcutCategory, excludeKey?: string) => {
      return shortcuts.value.some(s => s.key === key && s.category === category && s.key !== excludeKey);
    },

    /**
     * 更新快捷键事件处理函数
     * @param type 事件类型
     * @param handler
     */
    updateShortHandlers: (type: ShortcutEventType, handler: ShortcutEventHandler) => {
      eventHandlers.value[type] = handler;
    },

    /**
     * 开始输入法组合
     */
    startComposition: () => {
      isComposing.value = true;
    },

    /**
     * 结束输入法组合
     */
    endComposition: () => {
      isComposing.value = false;
    },

    handleKeyEvent,
    handleInputShortcuts,
    initShortcuts,

    isEnabled: (eventType: ShortcutEventType, category: ShortcutCategory) => {
      return shortcuts.value.find(s => s.eventType === eventType && s.category === category)?.enabled;
    },

    // 新增：获取当前平台的修饰键
    getModifierKey,

    // 新增：获取平台对应的快捷键
    getPlatformKey: (config: ShortcutConfig) => getPlatformKey(config),
  };
}
