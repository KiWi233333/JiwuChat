import type { Ref } from "vue";
import { onUnmounted, ref, watch } from "vue";
// 如果需要支持字符串 template ref，需要引入 vueuse
// import { useTemplateRef } from "@vueuse/core";

export function useWatchComposition(
  inputRef: Ref<HTMLInputElement | HTMLTextAreaElement | null | undefined>,
) {
  const isComposing = ref(false);

  const onCompositionStart = () => {
    isComposing.value = true;
  };
  const onCompositionEnd = () => {
    isComposing.value = false;
  };

  // 监听 ref 变化，自动绑定/解绑事件
  watch(
    inputRef,
    (newEl, oldEl) => {
      if (oldEl instanceof HTMLInputElement || oldEl instanceof HTMLTextAreaElement) {
        oldEl?.removeEventListener("compositionstart", onCompositionStart);
        oldEl?.removeEventListener("compositionend", onCompositionEnd);
      }
      if (newEl instanceof HTMLInputElement || newEl instanceof HTMLTextAreaElement) {
        newEl.addEventListener("compositionstart", onCompositionStart);
        newEl.addEventListener("compositionend", onCompositionEnd);
      }
    },
    { immediate: true }, // 初始时立即绑定
  );

  onUnmounted(() => {
    const el = inputRef.value;
    if (el) {
      el.removeEventListener("compositionstart", onCompositionStart);
      el.removeEventListener("compositionend", onCompositionEnd);
    }
    isComposing.value = false; // 避免状态遗留
  });

  return {
    isComposing,
  };
}
