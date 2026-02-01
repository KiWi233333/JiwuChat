import type { Ref, WatchStopHandle } from "vue";
import { nextTick, onBeforeUnmount, ref, unref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

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
   * 路由参数中的 Key
   * 默认为 "modal"
   */
  stateKey?: string;
  /**
   * 对应路由参数存在时的状态值 (Active)
   * 例如：打开房间对应 isOpenContact = false，则 activeValue 为 false
   * 默认为 true
   */
  activeValue?: T;
  /**
   * 对应路由参数不存在时的状态值 (Inactive)
   * 默认为 false
   */
  inactiveValue?: T;
}

/**
 * 通过 Vue Router Query 参数管理状态的 Hook
 * 1. 状态变为 Active -> 添加 Query 参数 (push)
 * 2. 状态变为 Inactive -> 返回上一页 (back)
 * 3. 路由参数变化 -> 同步状态
 *
 * 解决了 KeepAlive 组件在跳转其他页面时错误重置状态的问题
 *
 * 响应式支持 enabled 的副作用移除
 */
export function useHistoryState<T = boolean>(
  state: Ref<T>,
  options: UseHistoryStateOptions<T> = {},
) {
  const {
    enabled = true,
    stateKey = "modal",
    activeValue = true as unknown as T,
    inactiveValue = false as unknown as T,
  } = options;

  const router = useRouter();
  const route = useRoute();

  // 记录初始化时的路径，仅在当前路径下响应变化
  // 防止跳转到其他页面（如 /third）时，因 query 丢失导致状态被错误重置
  const currentPath = route.path;

  // 标记是否正在同步中，防止循环触发
  const isSyncing = ref(false);

  // 对两个 watch 和 onMounted 的副作用收集
  let stopStateWatcher: WatchStopHandle | null = null;
  let stopRouteWatcher: WatchStopHandle | null = null;

  // 由于 onMounted 不可移除，用 nextTick 控制初始化
  const initialized = ref(false);

  /**
   * 为 enabled 响应式提供 watch
   * enabled 关闭时，移除副作用 watcher，恢复默认状态（inactiveValue），并移除 query 参数
   */
  const cleanup = async () => {
    stopStateWatcher?.();
    stopRouteWatcher?.();
    stopStateWatcher = null;
    stopRouteWatcher = null;
    isSyncing.value = false;
    // 只清理 query，且仅在当前路径下
    if (route.path === currentPath) {
      const currentQuery = { ...route.query };
      const hasKey = Object.prototype.hasOwnProperty.call(currentQuery, stateKey);
      if (hasKey) {
        // 移除 query 参数，保留其它参数
        delete currentQuery[stateKey];
        await router.replace({
          path: currentPath,
          query: currentQuery,
        });
      }
    }
    // 恢复 state
    if (state.value !== inactiveValue) {
      state.value = inactiveValue;
    }
  };

  const setupWatchers = () => {
    // 1. 监听 State 变化 -> 更新路由
    stopStateWatcher = watch(state, async (val) => {
      // 如果未启用、正在同步、或路径不匹配，则忽略
      if (!toValue(enabled) || isSyncing.value || route.path !== currentPath)
        return;

      const currentQuery = { ...route.query };
      const hasKey = Object.prototype.hasOwnProperty.call(currentQuery, stateKey);

      if (val === activeValue && !hasKey) {
        // State Active -> 添加 Query (Push)
        isSyncing.value = true;
        await router.push({
          path: currentPath,
          query: { ...currentQuery, [stateKey]: "1" },
        });
        isSyncing.value = false;
      }
      else if (val === inactiveValue && hasKey) {
        // State Inactive -> 返回 (Back)
        // 使用 back() 模拟自然返回，消除历史记录
        isSyncing.value = true;
        router.back();
        // back 是异步的且无法 await 确定完成，设置一个短延时重置标志位
        setTimeout(() => {
          isSyncing.value = false;
        }, 100);
      }
    });

    // 2. 监听路由变化 -> 同步 State
    stopRouteWatcher = watch(() => route.query, (query) => {
      // 如果未启用、正在同步、或路径不匹配，则忽略
      if (!toValue(enabled) || isSyncing.value || route.path !== currentPath)
        return;

      const hasKey = Object.prototype.hasOwnProperty.call(query, stateKey);

      if (hasKey && state.value !== activeValue) {
        // 有参数 -> 设置为 Active
        isSyncing.value = true;
        state.value = activeValue;
        nextTick(() => {
          isSyncing.value = false;
        });
      }
      else if (!hasKey && state.value !== inactiveValue) {
        // 无参数 -> 设置为 Inactive
        isSyncing.value = true;
        state.value = inactiveValue;
        nextTick(() => {
          isSyncing.value = false;
        });
      }
    });
  };

  // enabled 响应式 watch
  const stopEnabledWatcher = watch(
    () => toValue(enabled),
    async (value) => {
      if (value) {
        // enabled 开启，重新建立副作用
        setupWatchers();
        // 如果初始未同步，手动同步一次
        if (!initialized.value) {
          initialized.value = true;
          // 初始化检查：如果当前 URL 已有参数，同步状态
          if (route.path === currentPath) {
            const hasKey = Object.prototype.hasOwnProperty.call(route.query, stateKey);
            if (hasKey && state.value !== activeValue) {
              isSyncing.value = true;
              state.value = activeValue;
              await nextTick();
              isSyncing.value = false;
            }
          }
        }
      }
      else {
        // enabled 关闭，移除副作用、切换回 inactive 状态并清除 url
        await cleanup();
      }
    },
    { immediate: true },
  );

  // 当组件卸载时，全部副作用清理
  onBeforeUnmount(() => {
    stopStateWatcher?.();
    stopRouteWatcher?.();
    stopEnabledWatcher?.();
    stopStateWatcher = null;
    stopRouteWatcher = null;
  });
}
