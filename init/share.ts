// 设置数据同步
export function useSettingStoreSync() {
  let isUpdating = false; // 防止递归更新的标志


  // 创建storage监听器
  const storageListener = useDebounceFn((event: StorageEvent) => {
    try {
      // 只处理设置相关的storage变化
      if (event.key !== SETTING_STORE_KEY || !event.newValue || isUpdating) {
        return;
      }
      const newSettingData = JSON.parse(event.newValue);
      if (newSettingData.settingPage) {
        isUpdating = true;
        // 使用深度合并避免嵌套对象丢失
        deepMerge(newSettingData.settingPage);
        // 延迟重置标志，避免立即触发watch
        isUpdating = false;
      }
    }
    catch (err) {
      console.warn("Failed to process storage change:", err);
    }
  }, 80);

  // 添加storage监听器
  window.addEventListener("storage", storageListener);
  // 清理函数
  const cleanup = () => {
    if (storageListener) {
      window.removeEventListener("storage", storageListener);
    }
    isUpdating = false;
  };

  return {
    close: cleanup,
  };
}

// 深度合并函数
function deepMerge(source: any): any {
  // 使用简单的diff算法，只更新实际发生变化的属性
  const settingStore = useSettingStore();
  const current = settingStore.settingPage;

  function diffAndUpdate(currentObj: any, newObj: any, path: string[] = []) {
    for (const key in newObj) {
      const currentValue = currentObj[key];
      const newValue = newObj[key];

      // 如果值不同才更新
      if (currentValue !== newValue) {
        if (typeof newValue === "object" && newValue !== null
          && typeof currentValue === "object" && currentValue !== null) {
          // 递归处理嵌套对象
          diffAndUpdate(currentValue, newValue, [...path, key]);
        }
        else {
          // 直接更新基本类型或null值
          currentObj[key] = newValue;
        }
      }
    }
  }

  diffAndUpdate(current, source);
  console.log("Setting store updated from storage:", source, current);
}

export function initSettingStoreSync() {
  const { close } = useSettingStoreSync();
  return close;
}
