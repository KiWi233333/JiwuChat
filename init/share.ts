/**
 * 设置数据同步 - 支持多标签页通讯
 * 提供发送方和接收方两个独立的API
 */
const tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const SYNC_EVENT_KEY = `${SETTING_STORE_KEY}_sync_event`;

/**
 * 发送方：监听store变化并发送到storage
 * @param watchKeys 要监听同步的store属性数组
 * @returns 返回包含清理函数的对象
 */
export function useSettingStoreSender(watchKeys: string[] = []) {
  let isUpdating = false; // 防止递归更新的标志
  const settingStore = useSettingStore();

  // 创建store变化监听器（store -> storage）
  const storeWatchers = watchKeys.map((key) => {
    return watch(
      () => (settingStore as any)[key],
      useDebounceFn((newValue) => {
        if (isUpdating)
          return;

        try {
          isUpdating = true;

          // 获取当前localStorage中的完整数据
          const currentData = JSON.parse(localStorage.getItem(SETTING_STORE_KEY) || "{}");

          // 更新指定属性
          currentData[key] = toRaw(newValue);

          // 保存到localStorage
          localStorage.setItem(SETTING_STORE_KEY, JSON.stringify(currentData));

          // 发送多标签页同步事件
          const syncEventData = {
            sourceTabId: tabId, // 标识来源标签页
            timestamp: Date.now(),
            action: "update", // 操作类型
            data: {
              [key]: toRaw(newValue),
            },
          };

          // 使用独立的sync事件key，避免与主数据混淆
          localStorage.setItem(SYNC_EVENT_KEY, JSON.stringify(syncEventData));

          // 立即清除同步事件，避免localStorage堆积无用数据
          setTimeout(() => {
            try {
              localStorage.removeItem(SYNC_EVENT_KEY);
            }
            catch (e) {
              // 忽略清除错误
            }
          }, 200);

          nextTick(() => {
            isUpdating = false;
          });
        }
        catch (err) {
          console.warn(`Failed to send ${key} sync event:`, err);
          isUpdating = false;
        }
      }, 100),
      {
        deep: true,
        immediate: false,
      },
    );
  });

  // 清理函数
  const cleanup = () => {
    // 清理store监听器
    storeWatchers.forEach((unwatch) => {
      if (typeof unwatch === "function") {
        unwatch();
      }
    });
    isUpdating = false;
  };

  return {
    close: cleanup,
    tabId, // 返回标签页ID，方便调试
  };
}

/**
 * 接收方：监听storage变化并更新到store
 * @param watchKeys 要监听同步的store属性数组
 * @param options 接收选项
 * @param options.ignoreOwnTab 是否忽略来自自己标签页的事件，默认true
 * @param options.compatibleMode 是否启用向后兼容模式，默认true
 * @returns 返回包含清理函数的对象
 */
export function useSettingStoreReceiver(
  watchKeys: string[] = [],
  options: {
    ignoreOwnTab?: boolean; // 是否忽略来自自己标签页的事件，默认true
    compatibleMode?: boolean; // 是否启用向后兼容模式，默认true
  } = {},
) {
  const { ignoreOwnTab = true, compatibleMode = true } = options;
  let isUpdating = false; // 防止递归更新的标志
  const settingStore = useSettingStore();

  // 创建storage变化监听器（storage -> store）
  const storageListener = useDebounceFn((event: StorageEvent) => {
    if (isUpdating)
      return;

    try {
      // 处理新版本同步事件
      if (event.key === SYNC_EVENT_KEY && event.newValue) {
        const syncData = JSON.parse(event.newValue);

        // 忽略来自当前标签页的同步事件（如果启用）
        if (ignoreOwnTab && syncData.sourceTabId === tabId) {
          return;
        }

        isUpdating = true;

        // 遍历需要同步的属性
        watchKeys.forEach((key) => {
          if (syncData.data[key] && (settingStore as any)[key] !== undefined) {
            // 使用深度合并避免嵌套对象丢失
            deepMerge((settingStore as any)[key], syncData.data[key]);
          }
        });

        // 延迟重置标志，避免立即触发watch
        nextTick(() => {
          isUpdating = false;
        });

        return;
      }

      // 兼容旧版本：处理直接的设置storage变化（保持向后兼容）
      if (compatibleMode && event.key === SETTING_STORE_KEY && event.newValue) {
        const newSettingData = JSON.parse(event.newValue);
        isUpdating = true;

        // 遍历需要同步的属性
        watchKeys.forEach((key) => {
          if (newSettingData[key] && (settingStore as any)[key] !== undefined) {
            // 使用深度合并避免嵌套对象丢失
            deepMerge((settingStore as any)[key], newSettingData[key]);
          }
        });

        // 延迟重置标志，避免立即触发watch
        nextTick(() => {
          isUpdating = false;
        });
      }
    }
    catch (err) {
      console.warn("Failed to receive storage sync event:", err);
      isUpdating = false;
    }
  }, 100);

  // 添加storage监听器
  window.addEventListener("storage", storageListener);

  // 清理函数
  const cleanup = () => {
    // 移除storage监听器
    if (storageListener) {
      window.removeEventListener("storage", storageListener);
    }
    isUpdating = false;
  };

  return {
    close: cleanup,
    tabId, // 返回标签页ID，方便调试
  };
}

/**
 * 双向同步：同时启用发送和接收功能
 * @param watchKeys 要监听同步的store属性数组
 * @param options 同步选项
 * @param options.ignoreOwnTab 是否忽略来自自己标签页的事件，默认true
 * @param options.compatibleMode 是否启用向后兼容模式，默认true
 * @returns 返回包含清理函数的对象
 */
export function useSettingStoreSync(
  watchKeys: string[] = [],
  options: {
    ignoreOwnTab?: boolean; // 是否忽略来自自己标签页的事件，默认true
    compatibleMode?: boolean; // 是否启用向后兼容模式，默认true
  } = {},
) {
  const sender = useSettingStoreSender(watchKeys);
  const receiver = useSettingStoreReceiver(watchKeys, options);

  // 清理函数
  const cleanup = () => {
    sender.close();
    receiver.close();
  };

  return {
    close: cleanup,
    sender,
    receiver,
    tabId,
  };
}

// 深度合并函数
function deepMerge(target: any, source: any): void {
  if (!source || typeof source !== "object") {
    return;
  }

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = target[key];

    // 如果值不同才更新
    if (targetValue !== sourceValue) {
      if (
        typeof sourceValue === "object"
        && sourceValue !== null
        && !Array.isArray(sourceValue)
        && typeof targetValue === "object"
        && targetValue !== null
        && !Array.isArray(targetValue)
      ) {
        // 递归处理嵌套对象
        deepMerge(targetValue, sourceValue);
      }
      else {
        // 直接更新基本类型、数组或null值
        target[key] = sourceValue;
      }
    }
  }
}

/**
 * 初始化设置store同步
 *
 * @returns 返回清理函数
 */
export function initSettingStoreSync() {
  let syncInstance: any;
  const watchKeys = ["settingPage"];
  const options = {
    ignoreOwnTab: true,
    compatibleMode: true,
  };
  const setting = useSettingStore();
  const route = useRoute();
  let mode;
  if (route.path.includes("setting")) {
    mode = "sender";
  }
  else {
    mode = "receiver";
  }
  switch (mode) {
    case "sender":
      syncInstance = useSettingStoreSender(watchKeys);
      break;
    case "receiver":
      syncInstance = useSettingStoreReceiver(watchKeys, options);
      break;
    case "both":
    default:
      syncInstance = useSettingStoreSync(watchKeys, options);
      break;
  }

  return syncInstance.close;
}
