import type { Ref } from "vue";
import { nextTick, onMounted, onUnmounted, ref, unref, watch } from "vue";

type MaybeRef<T> = Ref<T> | T;
type MaybeRefOrGetter<T> = MaybeRef<T> | (() => T);

function toValue<T>(r: MaybeRefOrGetter<T>): T {
  return typeof r === "function" ? (r as () => T)() : unref(r);
}

interface UseHistoryStateOptions<T> {
  /**
   * 是否启用
   */
  enabled?: MaybeRefOrGetter<boolean>;
  /**
   * 历史记录中的唯一标识 Key
   * 如果不传，默认生成随机 Key
   */
  stateKey?: string;
  /**
   * 触发入栈的状态值
   * 默认为 true
   */
  activeValue?: T;
  /**
   * 出栈后的状态值
   * 默认为 false
   */
  inactiveValue?: T;
}

/**
 * 管理浏览器历史记录状态的 Hook
 * 用于在移动端通过路由历史拦截返回键，防止误退出应用
 *
 * @param state 依赖的状态 Ref
 * @param options 配置项
 */
export function useHistoryState<T = boolean>(
  state: Ref<T>,
  options: UseHistoryStateOptions<T> = {},
) {
  const {
    enabled = true,
    stateKey = `history-state-${Math.random().toString(36).slice(2)}`,
    activeValue = true as unknown as T,
    inactiveValue = false as unknown as T,
  } = options;

  const isNavigatingBack = ref(false);

  // 监听状态变化
  watch(state, (val) => {
    if (!toValue(enabled))
      return;

    if (val === activeValue) {
      // 状态激活 -> 入栈
      history.pushState({ [stateKey]: true }, "");
    }
    else if (val === inactiveValue) {
      // 状态非激活 -> 出栈
      // 如果不是通过浏览器返回键触发的（即点击了UI上的返回按钮），则手动执行 history.back()
      if (!isNavigatingBack.value && history.state?.[stateKey]) {
        history.back();
      }
    }
  });

  // 监听浏览器返回事件
  function onPopState(event: PopStateEvent) {
    if (!toValue(enabled))
      return;

    // 如果当前处于激活状态，且触发了 popstate (点击了返回键)
    if (state.value === activeValue) {
      // 标记为正在通过返回键导航，防止 watch 中重复 back
      isNavigatingBack.value = true;
      // 恢复状态为非激活
      state.value = inactiveValue;

      // 重置标志位
      nextTick(() => {
        isNavigatingBack.value = false;
      });
    }
  }

  // 仅在客户端执行
  if (import.meta.client) {
    onMounted(() => {
      window.addEventListener("popstate", onPopState);
    });

    onUnmounted(() => {
      window.removeEventListener("popstate", onPopState);
    });
  }
}
