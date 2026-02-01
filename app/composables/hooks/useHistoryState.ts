import type { Ref, WatchStopHandle } from "vue";
import { nextTick, onBeforeUnmount, ref, toValue, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

type MaybeRefOrGetter<T> = Ref<T> | (() => T) | T;

interface UseHistoryStateOptions<T> {
  /**
   * 是否启用
   */
  enabled?: MaybeRefOrGetter<boolean>;
  /**
   * 路由参数中的 Key
   * 默认为随机
   */
  stateKey?: string;
  /**
   * 对应路由参数存在时的状态值 (Active)
   * 例如:打开房间对应 isOpenContact = false,则 activeValue 为 false
   * 默认为 true
   */
  activeValue?: T;
  /**
   * 对应路由参数不存在时的状态值 (Inactive)
   * 默认为 false
   */
  inactiveValue?: T;
  /**
   * 是否在状态变为 Inactive 时使用 router.back()
   * 默认为 true,设为 false 则使用 router.replace() 移除参数
   */
  useBackNavigation?: boolean;
}

/**
 * 通过 Vue Router Query 参数管理状态的 Hook
 * 1. 状态变为 Active -> 添加 Query 参数 (push)
 * 2. 状态变为 Inactive -> 返回上一页 (back) 或移除参数 (replace)
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
    stateKey = `modal_${Math.random().toString(36).substring(2, 15)}`,
    activeValue = true as unknown as T,
    inactiveValue = false as unknown as T,
    useBackNavigation = true,
  } = options;

  // 尝试获取 router 和 route，如果不可用则优雅降级
  let router: ReturnType<typeof useRouter> | undefined;
  let route: ReturnType<typeof useRoute> | undefined;

  try {
    router = useRouter();
    route = useRoute();
  }
  catch (error) {
    // Router 不可用，返回空的 cleanup 函数
    console.warn("[useHistoryState] Router not available, history state management disabled");
    return {
      cleanup: () => {},
    };
  }

  // 双重检查：如果 router 或 route 为 undefined，返回空实现
  if (!router || !route) {
    console.warn("[useHistoryState] Router or route is undefined, history state management disabled");
    return {
      cleanup: () => {},
    };
  }

  // 记录初始化时的路径,仅在当前路径下响应变化
  const initialPath = route.path;

  // 标记是否正在同步中,防止循环触发
  const isSyncing = ref(false);

  // 副作用清理函数
  let stopStateWatcher: WatchStopHandle | null = null;
  let stopRouteWatcher: WatchStopHandle | null = null;

  // 标记是否已初始化
  const initialized = ref(false);

  /**
   * 检查当前路由参数中是否存在指定 key
   */
  const hasQueryKey = (query = route.query) => stateKey in query;

  /**
   * 同步状态到指定值
   */
  const syncState = async (targetValue: T) => {
    if (state.value === targetValue)
      return;
    isSyncing.value = true;
    state.value = targetValue;
    await nextTick();
    isSyncing.value = false;
  };

  /**
   * 移除路由参数
   */
  const removeQueryKey = async () => {
    if (route?.path !== initialPath || !hasQueryKey())
      return;

    isSyncing.value = true;
    if (useBackNavigation) {
      router.back();
      // 监听路由变化来确认 back 完成,带超时保护
      let unwatch: WatchStopHandle;
      const timeout = setTimeout(() => {
        isSyncing.value = false;
        unwatch?.();
      }, 300);

      unwatch = watch(
        () => route.query,
        () => {
          clearTimeout(timeout);
          isSyncing.value = false;
        },
        { once: true },
      );
    }
    else {
      const query = { ...route.query };
      delete query[stateKey];
      await router.replace({
        path: initialPath,
        query,
      });
      isSyncing.value = false;
    }
  };

  /**
   * 添加路由参数
   */
  const addQueryKey = async () => {
    if (route?.path !== initialPath || hasQueryKey())
      return;

    isSyncing.value = true;
    await router.push({
      path: initialPath,
      query: { ...route.query, [stateKey]: "1" },
    });
    isSyncing.value = false;
  };

  /**
   * 清理副作用并重置状态
   */
  const cleanup = async () => {
    stopStateWatcher?.();
    stopRouteWatcher?.();
    stopStateWatcher = stopRouteWatcher = null;

    await removeQueryKey();
    await syncState(inactiveValue);
  };

  /**
   * 设置监听器
   */
  const setupWatchers = () => {
    // 1. 监听 State 变化 -> 更新路由
    stopStateWatcher = watch(
      state,
      async (val) => {
        if (!toValue(enabled) || isSyncing.value || route?.path !== initialPath)
          return;

        if (val === activeValue)
          await addQueryKey();
        else if (val === inactiveValue)
          await removeQueryKey();
      },
      { flush: "post" },
    );

    // 2. 监听路由变化 -> 同步 State
    stopRouteWatcher = watch(
      () => route.query,
      async (query) => {
        if (!toValue(enabled) || isSyncing.value || route?.path !== initialPath)
          return;

        await syncState(hasQueryKey(query) ? activeValue : inactiveValue);
      },
      { flush: "post" },
    );
  };

  /**
   * 初始化同步
   */
  const initializeSync = async () => {
    if (initialized.value || route?.path !== initialPath)
      return;

    initialized.value = true;
    if (hasQueryKey() && state.value !== activeValue) {
      await syncState(activeValue);
    }
  };

  // 监听 enabled 变化
  const stopEnabledWatcher = watch(
    () => toValue(enabled),
    async (value) => {
      if (value) {
        setupWatchers();
        await initializeSync();
      }
      else {
        await cleanup();
      }
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    stopStateWatcher?.();
    stopRouteWatcher?.();
    stopEnabledWatcher();
  });

  return {
    cleanup,
  };
}
