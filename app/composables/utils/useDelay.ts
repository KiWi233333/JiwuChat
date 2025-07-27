import type { Ref } from "vue";
import { tryOnScopeDispose } from "@vueuse/core";
import { ref, watch } from "vue";

/**
 * 仅当 ref 的值转换为特定值时，才延迟更改其值。
 * 如果在延迟期间，值更改为指定的 delayProp 后又恢复为原始值，则取消此次更改。
 *
 * @param source 要监视的源 Ref。
 * @param delay 延迟时间（毫秒）。
 * @param delayProp 触发延迟机制的特定值。
 */
export function useDelayChange<T>(source: Ref<T>, delay: number, delayProp: T) {
  const delayedValue = ref(source.value) as Ref<T>;

  let timeout: ReturnType<typeof setTimeout> | undefined;
  let originalValue: T | undefined;

  const clear = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
    }
  };

  watch(source, (newValue, oldValue) => {
    clear();

    // Case 1: The new value is the one we want to delay.
    if (newValue === delayProp) {
      originalValue = oldValue;
      timeout = setTimeout(() => {
        delayedValue.value = newValue;
        originalValue = undefined; // Reset after commit
      }, delay);
    }
    // Case 2: The new value is not the delayProp.
    else {
      // If we are in a delay period and the value reverts to the original,
      // we cancel the change entirely by doing nothing.
      // The delayedValue already holds the originalValue.
      if (originalValue !== undefined && newValue === originalValue) {
        originalValue = undefined; // Reset
        return;
      }

      // For any other change, update immediately.
      delayedValue.value = newValue;
      originalValue = undefined; // No longer in a delay period
    }
  }, { flush: "sync" });

  tryOnScopeDispose(clear);

  return readonly(delayedValue);
}
