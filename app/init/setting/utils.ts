// 动画禁用
export const STOP_TRANSITION_ALL_KEY = "stop-transition-all";
export const STOP_TRANSITION_KEY = "stop-transition";

export const IS_DEV = import.meta.env.DEV;
export const IS_PROD = import.meta.env.PROD;

/**
 * 添加根元素类名
 */
export function addRootClass(className: string | "stop-transition-all" | "stop-transition") {
  document?.documentElement?.classList?.remove(className);
  document?.documentElement?.classList?.add(className);
}

/**
 * 移除根元素类名
 */
export function removeRootClass(className: string | "stop-transition-all" | "stop-transition") {
  document?.documentElement?.classList?.remove(className);
}
