import type { Emitter } from "mitt";
import type { MittEvents } from "~/composables/utils/useMitt";
import { onBeforeUnmount } from "vue";
import { mitter } from "~/composables/utils/useMitt";

/**
 * useEventBus Hook
 * 自动管理事件的注册与卸载，支持类型自动推断
 *
 * @example
 * // 单个事件
 * useEventBus(MittEventType.MESSAGE, (msg) => {
 *   // msg 类型自动推断为 ChatMessageVO
 * })
 *
 * @example
 * // 多个事件，共享处理器
 * useEventBus([MittEventType.MESSAGE, MittEventType.RECALL], (data) => {
 *   // data 类型为联合类型
 * })
 *
 * @example
 * // 对象形式，每个事件独立处理器
 * useEventBus({
 *   [MittEventType.MESSAGE]: (msg) => { /* msg: ChatMessageVO *\/ },
 *   [MittEventType.RECALL]: (data) => { /* data: WSMsgRecall *\/ }
 * })
 *
 * @param events - 事件名 / 事件名数组 / 事件-处理器对象
 * @param handlers - 事件处理器（单个或数组，仅在 events 为 string 或 string[] 时使用）
 * @param options - 可选参数：autoCleanup（默认为 true），控制是否自动卸载
 */
interface UseEventBusOptions {
  /** 是否自动清理，默认为 true */
  autoCleanup?: boolean;
  // 是否组件激活和卸载自动清理
  enabledOnActivated?: boolean;
}

interface Listener<K extends keyof MittEvents> {
  event: K;
  handler: (payload: MittEvents[K]) => void;
}

// 单个事件的重载
export function useEventBus<K extends keyof MittEvents>(
  event: K,
  handler: (payload: MittEvents[K]) => void,
  options?: UseEventBusOptions,
): { cleanup: () => void; eventBus: Emitter<MittEvents> };

// 多个事件，单个处理器（处理器参数为联合类型）
export function useEventBus<K extends keyof MittEvents>(
  events: K[],
  handler: (payload: MittEvents[K]) => void,
  options?: UseEventBusOptions,
): { cleanup: () => void; eventBus: Emitter<MittEvents> };

// 多个事件，多个处理器（一一对应）
export function useEventBus<K extends keyof MittEvents>(
  events: K[],
  handlers: Array<(payload: MittEvents[K]) => void>,
  options?: UseEventBusOptions,
): { cleanup: () => void; eventBus: Emitter<MittEvents> };

// 对象形式：每个事件独立处理器
export function useEventBus<K extends keyof MittEvents>(
  events: Partial<Record<K, (payload: MittEvents[K]) => void>>,
  options?: UseEventBusOptions,
): { cleanup: () => void; eventBus: Emitter<MittEvents> };

// 实现
export function useEventBus<K extends keyof MittEvents>(
  events: K | K[] | Partial<Record<K, (payload: MittEvents[K]) => void>>,
  handlers?: ((payload: MittEvents[K]) => void) | Array<(payload: MittEvents[K]) => void> | UseEventBusOptions,
  options?: UseEventBusOptions,
): { cleanup: () => void; eventBus: Emitter<MittEvents> } {
  // 处理 options 参数位置
  let actualOptions: UseEventBusOptions = {};
  if (typeof handlers === "object" && handlers !== null && !Array.isArray(handlers) && "autoCleanup" in handlers) {
    actualOptions = handlers as UseEventBusOptions;
  }
  else if (options) {
    actualOptions = options;
  }
  const { autoCleanup = true, enabledOnActivated = false } = actualOptions;

  const listeners: Listener<K>[] = [];

  // 对象形式：useEventBus({eventA: handlerA, eventB: handlerB})
  if (typeof events === "object" && !Array.isArray(events)) {
    Object.entries(events).forEach(([event, handler]) => {
      if (handler && typeof handler === "function") {
        const eventKey = event as K;
        const typedHandler = handler as (payload: MittEvents[K]) => void;
        mitter.on(eventKey, typedHandler);
        listeners.push({ event: eventKey, handler: typedHandler });
      }
    });
  }
  else {
    // 标准化为数组
    const eventList = Array.isArray(events) ? events : [events];
    // 过滤出函数类型的 handlers
    const validHandlers = typeof handlers === "function"
      ? [handlers]
      : Array.isArray(handlers)
        ? handlers.filter((h): h is (payload: MittEvents[K]) => void => typeof h === "function")
        : [];

    if (validHandlers.length === 0) {
      throw new Error("Handler is required when using event string or array");
    }

    // 如果只有一个 handler，则所有事件都用同一个 handler，反之一一对应
    const normalizedHandlers
      = validHandlers.length === 1 && eventList.length > 1
        ? eventList.map(() => validHandlers[0]!)
        : validHandlers;

    eventList.forEach((event, i) => {
      const handler = normalizedHandlers[i] || normalizedHandlers[0];
      if (!handler) {
        throw new Error(`Handler is required for event: ${String(event)}`);
      }
      mitter.on(event, handler);
      listeners.push({ event, handler });
    });
  }

  // 清理函数，移除所有事件监听
  const cleanup = () => {
    listeners.forEach(({ event, handler }) => {
      mitter.off(event, handler);
    });
    listeners.length = 0;
  };

  if (autoCleanup) {
    onBeforeUnmount(cleanup);
  }

  // 组件激活和卸载自动清理
  if (enabledOnActivated) {
    // 组件激活时重新注册事件
    onActivated(() => {
      listeners.forEach(({ event, handler }) => {
        mitter.on(event, handler);
      });
    });
    // 组件卸载时清理事件
    if (autoCleanup) {
      onDeactivated(cleanup);
    }
  }


  return { cleanup, eventBus: mitter };
}
