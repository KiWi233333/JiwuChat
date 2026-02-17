/**
 * 全局图片预览 API
 * 通过 createVNode + render 挂载单例 ImageViewer，共享主应用上下文（router、pinia 等）。
 * 需在应用启动时由插件调用 initImageViewer(context)，见 plugins/image-viewer.client.ts
 */
import type { AppContext, VNode } from "vue";
import type { ViewerOptions } from "~/components/common/ImageViewer.vue";
import { createVNode, getCurrentInstance, render } from "vue";
import ImageViewer from "~/components/common/ImageViewer.vue";

export type { ViewerOptions };

type ViewerInstance = InstanceType<typeof ImageViewer>;

let container: HTMLElement | null = null;
let vnode: VNode | null = null;
let appContext: AppContext | null = null;

/**
 * 初始化图片预览（由 plugins/image-viewer.client.ts 在应用启动时调用）
 * 注入主应用上下文，保证任意位置调用 useImageViewer 时都能正确使用依赖注入
 */
export function initImageViewer(context: AppContext) {
  appContext = context;
}

function getAppContext(): AppContext | null {
  if (appContext)
    return appContext;
  const instance = getCurrentInstance();
  if (instance?.appContext) {
    appContext = instance.appContext;
    return appContext;
  }
  if (import.meta.dev) {
    console.warn(
      "[useImageViewer] AppContext 未就绪，请确保已加载 plugins/image-viewer.client.ts",
    );
  }
  return null;
}

function createOrGetViewer(): ViewerInstance | null {
  if (vnode?.component?.exposed) {
    return vnode.component.exposed as ViewerInstance;
  }

  if (!container) {
    container = document.createElement("div");
    container.classList.add("custom-image-viewer-container");
    document.body.appendChild(container);
  }

  vnode = createVNode(ImageViewer);
  const context = getAppContext();
  if (context)
    vnode.appContext = context;

  render(vnode, container);
  return vnode.component?.exposed as ViewerInstance;
}

function destroyViewer() {
  if (container && vnode) {
    render(null, container);
    document.body.removeChild(container);
    container = null;
    vnode = null;
  }
}

/**
 * 全局图片预览 API（单例，任意位置可直接调用）
 * @example useImageViewer.open({ urlList: [url], initialIndex: 0 })
 */
export const useImageViewer = {
  open(options: ViewerOptions) {
    createOrGetViewer()?.open(options);
  },

  close() {
    (vnode?.component?.exposed as ViewerInstance | undefined)?.close();
  },

  destroy() {
    destroyViewer();
  },

  get state() {
    return (vnode?.component?.exposed as ViewerInstance | undefined)?.state;
  },
};
