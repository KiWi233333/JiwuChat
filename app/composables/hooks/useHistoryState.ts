import type { Ref, WatchStopHandle } from "vue";
import { useDebounceFn } from "@vueuse/core";
import {
  nextTick,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  ref,
  toValue,
  watch,
} from "vue";
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
  /**
   * 作用范围：global 随当前路由变化，适用于全局组件（如布局级 Drawer/Popup）；local 仅在当前首次挂载时的路径生效
   * 默认为 global
   */
  scope?: "local" | "global";
}

/**
 * 历史状态记录
 */
interface HistoryRecord {
  stateKey: string;
  path: string;
  timestamp: number;
}

/**
 * 全局历史状态管理器
 * 用于追踪所有 useHistoryState 实例添加的历史记录
 */
class HistoryStateManager {
  private static instance: HistoryStateManager;
  private stack: HistoryRecord[] = [];
  private registeredKeys = new Set<string>();

  static getInstance(): HistoryStateManager {
    if (!HistoryStateManager.instance) {
      HistoryStateManager.instance = new HistoryStateManager();
    }
    return HistoryStateManager.instance;
  }

  /**
   * 检查 key 是否已注册（防止重复注册）
   */
  isRegistered(stateKey: string): boolean {
    return this.registeredKeys.has(stateKey);
  }

  /**
   * 注册一个 stateKey
   */
  register(stateKey: string): boolean {
    if (this.registeredKeys.has(stateKey)) {
      console.warn(`[useHistoryState] stateKey "${stateKey}" is already registered, skipping duplicate registration`);
      return false;
    }
    this.registeredKeys.add(stateKey);
    return true;
  }

  /**
   * 注销一个 stateKey
   */
  unregister(stateKey: string): void {
    this.registeredKeys.delete(stateKey);
    // 同时清理栈中该 key 的记录
    this.stack = this.stack.filter(r => r.stateKey !== stateKey);
  }

  /**
   * 记录一条历史
   */
  push(record: HistoryRecord): void {
    // 避免重复添加相同的记录
    const exists = this.stack.some(
      r => r.stateKey === record.stateKey && r.path === record.path,
    );
    if (!exists) {
      this.stack.push(record);
    }
  }

  /**
   * 移除最后一条指定 key 的记录；若传 path 则只移除匹配该 path 的（保证只 pop 当前路由层）
   */
  pop(stateKey: string, path?: string): HistoryRecord | undefined {
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const record = this.stack[i];
      if (!record || record.stateKey !== stateKey)
        continue;
      if (path !== undefined && record.path !== path)
        continue;
      return this.stack.splice(i, 1)[0];
    }
    return undefined;
  }

  /**
   * 检查栈顶是否是指定 key 的记录
   */
  isTopRecord(stateKey: string): boolean {
    if (this.stack.length === 0)
      return false;
    const topRecord = this.stack[this.stack.length - 1];
    return topRecord ? topRecord.stateKey === stateKey : false;
  }

  /**
   * 检查是否有指定 key 的记录；若传 path 则只检查该 path 下的记录
   */
  hasRecord(stateKey: string, path?: string): boolean {
    return this.stack.some(
      r => r.stateKey === stateKey && (path === undefined || r.path === path),
    );
  }

  /**
   * 获取栈的长度
   */
  get length(): number {
    return this.stack.length;
  }

  /**
   * 清理指定 path 相关的所有记录（用于路由跳转时）
   */
  clearPath(path: string): void {
    this.stack = this.stack.filter(r => r.path !== path);
  }

  /**
   * 调试：打印当前栈状态
   */
  debug(): void {
    console.log("[HistoryStateManager] Stack:", JSON.stringify(this.stack, null, 2));
    console.log("[HistoryStateManager] Registered keys:", Array.from(this.registeredKeys));
  }
}

// 导出管理器实例供外部使用（调试）
export const historyStateManager = HistoryStateManager.getInstance();

/**
 * 通过 Vue Router Query 参数管理状态的 Hook（堆栈式）
 * 1. 状态变为 Active -> 添加 Query 参数 (router.push)，保留当前 URL 上其它 key，形成一层新历史
 * 2. 状态变为 Inactive -> 若有本实例的记录则 router.back() 回退一层，否则 replace 仅移除本 key，不影响其它 key
 * 3. 路由参数变化 -> 同步状态；若 URL 中本 key 消失（如用户按浏览器返回）则从 manager 弹出对应记录，保持堆栈一致
 *
 * 多状态叠加：多个实例（如 Drawer + Modal）依次打开时，每次 push 一层，回退时只回退本层，不破坏其它层状态
 */
export function useHistoryState<T = boolean>(
  state: Ref<T>,
  options: UseHistoryStateOptions<T> = {},
) {
  const {
    enabled = true,
    stateKey = `modal_${Math.random().toString(36).substring(2, 15)}`,
    activeValue = (options.activeValue !== undefined ? options.activeValue : true) as T,
    inactiveValue = (options.inactiveValue !== undefined ? options.inactiveValue : false) as T,
    useBackNavigation = true,
    scope = "global",
  } = options;

  const manager = HistoryStateManager.getInstance();

  // 检查是否重复注册
  if (manager.isRegistered(stateKey)) {
    console.warn(`[useHistoryState] Duplicate registration detected for stateKey "${stateKey}". This instance will be inactive.`);
    return {
      cleanup: () => {},
    };
  }

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

  // 注册 stateKey
  manager.register(stateKey);

  // 记录初始化时的路径（local 模式仅在该路径下响应）
  const initialPath = route.path;

  /** 当前生效的路径：global 为当前路由 path，local 为 initialPath */
  const getActivePath = (): string => (scope === "global" ? route!.path : initialPath);
  /** 是否处于应响应操作的路径上（global 始终为 true） */
  const isOnActivePath = (): boolean =>
    scope === "global" || route?.path === initialPath;

  // 标记是否正在同步中,防止循环触发
  const isSyncing = ref(false);

  // 副作用清理函数
  let stopStateWatcher: WatchStopHandle | null = null;
  let stopRouteWatcher: WatchStopHandle | null = null;
  let stopPathWatcher: WatchStopHandle | null = null;

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
   * v2.0 改进：只有当确认是自己添加的记录时才使用 back()
   */
  const removeQueryKey = async () => {
    if (!isOnActivePath() || !hasQueryKey())
      return;

    isSyncing.value = true;
    const activePath = getActivePath();

    // 检查当前路径下是否有本实例的记录（只回退本层）
    const hasOurRecord = manager.hasRecord(stateKey, activePath);
    const shouldUseBack = useBackNavigation && hasOurRecord && window.history.length > 1;

    if (shouldUseBack) {
      manager.pop(stateKey, activePath);

      // 使用 back() 返回上一页
      let unwatch: WatchStopHandle | undefined;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      const cleanup = () => {
        if (timeoutId)
          clearTimeout(timeoutId);
        if (unwatch)
          unwatch();
        isSyncing.value = false;
      };

      // 若 300ms 内路由未变化（如 back 未生效），fallback 解除 isSyncing 避免死锁
      timeoutId = setTimeout(cleanup, 300);

      unwatch = watch(
        () => route.query,
        () => {
          cleanup();
        },
        { once: true },
      );

      router.back();
    }
    else {
      // 仅移除本 key、保留其它 key，不破坏其它层状态
      try {
        const query = { ...route.query };
        delete query[stateKey];
        manager.pop(stateKey, activePath);
        await router.replace({
          path: activePath,
          query,
        });
      }
      finally {
        isSyncing.value = false;
      }
    }
  };

  /**
   * 添加路由参数：push 新一层历史并保留当前 URL 上其它 key，实现多状态堆叠
   */
  const addQueryKey = async () => {
    if (!isOnActivePath() || hasQueryKey())
      return;

    isSyncing.value = true;
    const activePath = getActivePath();
    try {
      manager.push({
        stateKey,
        path: activePath,
        timestamp: Date.now(),
      });
      await router.push({
        path: activePath,
        query: { ...route!.query, [stateKey]: "1" },
      });
    }
    finally {
      isSyncing.value = false;
    }
  };

  /**
   * 清理副作用并重置状态
   */
  const cleanup = async () => {
    stopStateWatcher?.();
    stopRouteWatcher?.();
    stopPathWatcher?.();
    stopStateWatcher = stopRouteWatcher = stopPathWatcher = null;

    await removeQueryKey();
    await syncState(inactiveValue);
  };

  /**
   * 设置监听器
   */
  const setupWatchers = () => {
    // 防抖处理路由操作，避免快速切换状态时的竞态条件
    const debouncedRouteOperation = useDebounceFn(async (isActive: boolean) => {
      if (isActive)
        await addQueryKey();
      else
        await removeQueryKey();
    }, 50);

    // 1. 监听 State 变化 -> 更新路由
    stopStateWatcher = watch(
      state,
      async (val) => {
        if (!toValue(enabled) || isSyncing.value || !isOnActivePath())
          return;

        if (val === activeValue || val === inactiveValue)
          await debouncedRouteOperation(val === activeValue);
      },
      { flush: "post" },
    );

    // 2. 监听路由变化 -> 同步 State
    // 有 key 必同步为 active；无 key 时仅当「当前路径下曾有本层记录」才同步为 inactive（即本页 back 导致失 key），否则是 push 到新路由，不撤销上一页状态
    stopRouteWatcher = watch(
      () => route.query,
      async (query) => {
        if (!toValue(enabled) || isSyncing.value || !isOnActivePath())
          return;

        const hasKey = hasQueryKey(query);
        const currentPath = getActivePath();
        if (hasKey) {
          await syncState(activeValue);
        }
        else if (manager.hasRecord(stateKey, currentPath)) {
          await syncState(inactiveValue);
          manager.pop(stateKey, currentPath);
        }
      },
      { flush: "post" },
    );

    // 3. 监听路径变化 -> 仅重置初始化态，不 pop
    // 区分：push 到新路由 = 累加栈，旧页状态保留在 history 中；只有 back/关闭本层 时才 pop（在 removeQueryKey 或 route 失 key 时）
    stopPathWatcher = watch(
      () => route.path,
      () => {
        if (scope === "global")
          initialized.value = false;
      },
      { flush: "post" },
    );
  };

  /**
   * 初始化同步
   * 双向同步：
   * 1. URL 有参数但 state 不是 activeValue -> 同步 state 为 activeValue
   * 2. state 是 activeValue 但 URL 没参数 -> 添加 URL 参数
   * 3. URL 没参数且 state 不是 activeValue -> 同步 state 为 inactiveValue
   */
  const initializeSync = async () => {
    if (initialized.value || !isOnActivePath())
      return;

    // 等待路由状态稳定
    await nextTick();

    initialized.value = true;
    const activePath = getActivePath();
    const hasKey = hasQueryKey();

    if (hasKey && state.value !== activeValue) {
      // URL 有参数，同步 state 为 activeValue
      // 同时记录到管理器（因为这是恢复场景）
      manager.push({
        stateKey,
        path: activePath,
        timestamp: Date.now(),
      });
      await syncState(activeValue);
    }
    else if (!hasKey && state.value === activeValue) {
      // state 已经是 activeValue 但 URL 没参数，添加参数
      await addQueryKey();
    }
    else if (!hasKey && state.value !== inactiveValue) {
      // URL 没参数且 state 也不是 inactiveValue，同步为 inactiveValue
      await syncState(inactiveValue);
    }
  };

  /**
   * 创建 enabled 监听器，返回 stop 句柄
   * 用于首次挂载与 keep-alive 激活时复用
   */
  const setupEnabledWatcher = (): WatchStopHandle =>
    watch(
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

  let stopEnabledWatcher: WatchStopHandle | null = setupEnabledWatcher();

  onBeforeUnmount(() => {
    stopStateWatcher?.();
    stopRouteWatcher?.();
    stopPathWatcher?.();
    stopEnabledWatcher?.();
    stopEnabledWatcher = null;
    manager.unregister(stateKey);
  });

  onActivated(() => {
    nextTick().then(() => {
      if (!router || !route)
        return;
      if (scope === "local" && route.path !== initialPath)
        return;
      if (manager.isRegistered(stateKey))
        return;
      manager.register(stateKey);
      stopEnabledWatcher = setupEnabledWatcher();
    });
  });

  onDeactivated(() => {
    stopStateWatcher?.();
    stopRouteWatcher?.();
    stopPathWatcher?.();
    stopEnabledWatcher?.();
    stopEnabledWatcher = null;
    manager.unregister(stateKey);
    initialized.value = false;
  });

  return {
    cleanup,
  };
}
